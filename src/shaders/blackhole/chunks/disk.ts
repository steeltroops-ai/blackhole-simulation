import { PHYSICS_CONSTANTS } from "@/configs/physics.config";

export const DISK_CHUNK = `
  // Accretion Disk Physics & Rendering
  // Inputs:
  //   p: current ray position (vec3)
  //   ro: ray origin (vec3)
  //   r: current radius from BH center
  //   isco: innermost stable circular orbit
  //   M: black hole mass
  //   a: black hole spin parameter
  //   dt: integration step size (for density integration)
  //   accumulatedColor: (inout)
  //   accumulatedAlpha: (inout)
  
  //   shear: optical shear magnitude for anisotropic blur (Phase 3.1)
  //   polarization: magnetic polarization angle (Phase 3.2)
  
  void sample_accretion_disk(
      vec3 p, vec3 ro, float r, float isco, float M, float a, float dt, float rs, float shear, float polarization,
      inout vec3 accumulatedColor, inout float accumulatedAlpha
  ) {
      if (u_show_redshift < 0.5) {
        float diskHeight = r * ${PHYSICS_CONSTANTS.accretion.diskHeightMultiplier.toFixed(2)};
        float diskInner = isco;
        float diskOuter = M * u_disk_size;
        
        if(abs(p.y) < diskHeight && r > diskInner && r < diskOuter) {
            // Anisotropic Blur (Phase 3.1) & Magnetic Polarization (Phase 3.2)
            float blurLOD = 1.0 + shear * 5.0; 
            
            // Magnetic Field Lines (Striations)
            // We rotate the noise coordinates by the polarization angle to simulate field twisting
            float cP = cos(polarization);
            float sP = sin(polarization);
            mat2 rotP = mat2(cP, -sP, sP, cP);
            
            vec3 noiseConcept = vec3(p.x, p.y, p.z);
            noiseConcept.xz *= rotP; // twist the noise domain
            
            vec3 noiseP = noiseConcept * (${PHYSICS_CONSTANTS.accretion.turbulenceScale.toFixed(2)} / blurLOD) + vec3(u_time * ${PHYSICS_CONSTANTS.accretion.timeScale.toFixed(2)}, 0.0, 0.0);
            float turbulence = noise(noiseP) * 0.5 + noise(noiseP * ${PHYSICS_CONSTANTS.accretion.turbulenceDetail.toFixed(1)}) * 0.25;
             
            // Add explicit magnetic striations
            float fieldLines = sin(noiseConcept.x * 20.0 + noiseConcept.z * 20.0) * 0.5 + 0.5;
            turbulence = mix(turbulence, turbulence * fieldLines, 0.3 * smoothstep(isco, isco*5.0, r)); // Stronger near horizon
            
            float heightFalloff = exp(-abs(p.y) / (diskHeight * ${PHYSICS_CONSTANTS.accretion.densityFalloff.toFixed(2)}));
            float radialFalloff = smoothstep(diskOuter, diskInner, r);
            float baseDensity = turbulence * heightFalloff * radialFalloff;
            
            if (baseDensity > 0.001) {
                // Keperian Orbital Velocity (Approximate for Kerr)
                float orbitalVel = 1.0 / (sqrt(r) * (1.0 + a / (r*sqrt(r))));
                orbitalVel = clamp(orbitalVel, 0.0, 0.99);
                
                vec3 diskVelVec = normalize(vec3(-p.z, 0.0, p.x)) * orbitalVel;
                float cosTheta = dot(diskVelVec, normalize(ro - p));
                
                // Relativistic Doppler Factor
                float beta = orbitalVel;
                float gamma = 1.0 / sqrt(1.0 - beta*beta);
                float delta = 1.0 / (gamma * (1.0 - beta * cosTheta));
                
                // Relativistic Doppler beaming
                float beaming = pow(delta, 3.0);
                float radialTempGradient = pow(isco / r, 0.75);
                
                // Gravitational redshift
                float gravRedshift = sqrt(max(0.0, 1.0 - rs / r));
                float temperature = u_disk_temp * radialTempGradient * delta * gravRedshift;
                
                // phase 5.3: Physical Volume Integration
                // Using exp(-density) prevents "mega-pixels" and numerical artifacts
                // that cause white outs when step size (dt) is large.
                float density = baseDensity * u_disk_density * 0.12 * dt;
                float alphaStep = 1.0 - exp(-density);
                vec3 diskColor = blackbody(clamp(temperature, 0.0, 1e6)) * beaming;
                
                accumulatedColor += diskColor * alphaStep * (1.0 - accumulatedAlpha);
                accumulatedAlpha += alphaStep * (1.0 - accumulatedAlpha);
            }
        }
      }
  }

  void sample_relativistic_jets(
      vec3 p, vec3 v, float r, float rh, float dt,
      inout vec3 accumulatedColor, inout float accumulatedAlpha
  ) {
      // Jets align with spin axis (Y-axis)
      float jetVerticalPos = abs(p.y);
      if (jetVerticalPos > rh * 1.8 && jetVerticalPos < MAX_DIST * 0.8) {
          float jetRadialDist = length(p.xz);
          float jetWidth = 1.0 + jetVerticalPos * 0.15;
          
          if (jetRadialDist < jetWidth * 2.0) {
              float radialFalloff = exp(-(jetRadialDist * jetRadialDist) / (jetWidth * 0.5));
              float lengthFalloff = exp(-jetVerticalPos * 0.05);
              
              float flowCombined = p.y * 2.0 - u_time * 8.0;
              vec3 uvJet = vec3(p.x, flowCombined, p.z);
              float noiseVal = noise(uvJet * 0.5) * 0.6 + noise(uvJet * 1.5) * 0.4;
              
              float jetDensity = radialFalloff * lengthFalloff * max(0.0, noiseVal - 0.2);
              
              if (jetDensity > 0.001) {
                  float jetVel = 0.92 * sign(p.y);
                  vec3 jetVelVec = vec3(0.0, jetVel, 0.0);
                  
                  // Doppler beaming for jet
                  float cosThetaJet = dot(normalize(jetVelVec), -v);
                  float betaJet = abs(jetVel);
                  float gammaJet = 1.0 / sqrt(1.0 - betaJet * betaJet);
                  float deltaJet = 1.0 / (gammaJet * (1.0 - betaJet * cosThetaJet));
                  float beamingJet = pow(deltaJet, 3.5);
                  
                  vec3 baseJetColor = vec3(0.4, 0.7, 1.0);
                  float stepDensity = jetDensity * 0.05 * dt;
                  float alphaStep = 1.0 - exp(-stepDensity);
                  vec3 jetEmission = baseJetColor * beamingJet;
                  
                  accumulatedColor += jetEmission * alphaStep * (1.0 - accumulatedAlpha);
                  accumulatedAlpha += alphaStep * (1.0 - accumulatedAlpha);
              }
          }
      }
  }
`;
