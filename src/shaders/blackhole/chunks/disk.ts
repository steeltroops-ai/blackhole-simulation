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
  
  void sample_accretion_disk(
      vec3 p, vec3 ro, float r, float isco, float M, float a, float dt, float rs,
      inout vec3 accumulatedColor, inout float accumulatedAlpha
  ) {
      if (u_show_redshift < 0.5) {
        float diskHeight = r * ${PHYSICS_CONSTANTS.accretion.diskHeightMultiplier.toFixed(2)};
        float diskInner = isco;
        float diskOuter = M * u_disk_size;
        
        if(abs(p.y) < diskHeight && r > diskInner && r < diskOuter) {
            vec3 noiseP = p * ${PHYSICS_CONSTANTS.accretion.turbulenceScale.toFixed(2)} + vec3(u_time * ${PHYSICS_CONSTANTS.accretion.timeScale.toFixed(2)}, 0.0, 0.0);
            float turbulence = noise(noiseP) * 0.5 + noise(noiseP * ${PHYSICS_CONSTANTS.accretion.turbulenceDetail.toFixed(1)}) * 0.25;
            
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
                
                vec3 diskColor = blackbody(temperature) * beaming;
                float density = baseDensity * u_disk_density * 0.12 * dt;
                
                accumulatedColor += diskColor * density * (1.0 - accumulatedAlpha);
                accumulatedAlpha += density;
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
                  vec3 jetEmission = baseJetColor * jetDensity * 0.05 * beamingJet * dt;
                  
                  accumulatedColor += jetEmission * (1.0 - accumulatedAlpha);
                  accumulatedAlpha += jetDensity * 0.05 * dt;
              }
          }
      }
  }
`;
