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
      // FAST EARLY-EXIT: Check geometric bounds FIRST -- before ANY expensive computation.
      // These are simple comparisons. Turbulence FBM (8+ texture lookups) only runs
      // if the ray is actually passing through the disk volume.
      if (u_show_redshift > 0.5) return;

      float effectiveScaleHeight = min(u_disk_scale_height, ${PHYSICS_CONSTANTS.accretion.diskHeightMultiplier.toFixed(3)});
      float diskHeight = r * effectiveScaleHeight;

      // Exit 1: Ray is above or below the disk plane
      if (abs(p.y) >= diskHeight) return;

      // Exit 2: Ray is inside the ISCO (disk is physically truncated here)
      float diskInner = isco;
      if (r <= diskInner) return;

      // Exit 3: Ray is beyond the outer disk edge
      float diskOuter = max(M * u_disk_size, diskInner * 1.1);
      if (r >= diskOuter) return;

      // --- All geometry checks passed. Now compute turbulence. ---
      vec3 noiseP = p * ${PHYSICS_CONSTANTS.accretion.turbulenceScale.toFixed(2)} + vec3(u_time * ${PHYSICS_CONSTANTS.accretion.timeScale.toFixed(2)}, 0.0, 0.0);
      float turbulence = noise(noiseP) * 0.5 + noise(noiseP * ${PHYSICS_CONSTANTS.accretion.turbulenceDetail.toFixed(1)}) * 0.25;
      
      float heightFalloff = exp(-abs(p.y) / (diskHeight * ${PHYSICS_CONSTANTS.accretion.densityFalloff.toFixed(2)}));
      float radialFalloff = smoothstep(diskOuter, diskInner, r);
      
      float baseDensity = turbulence * heightFalloff * radialFalloff;
      
      if (baseDensity > 0.001) {
          float orbitalVel = 1.0 / (sqrt(r) * (1.0 + abs(a) / (r*sqrt(r))));
          orbitalVel = clamp(orbitalVel, 0.0, 0.99);
          
          float rotDir = (u_spin >= 0.0) ? 1.0 : -1.0;
          vec3 diskVelVec = normalize(vec3(-p.z, 0.0, p.x)) * rotDir * orbitalVel;

          float cosTheta = dot(diskVelVec, normalize(ro - p));
          float beta = length(diskVelVec);
          float gamma = 1.0 / sqrt(1.0 - beta*beta);
          float delta = 1.0 / (gamma * (1.0 - beta * cosTheta));
          
#ifdef ENABLE_DOPPLER
          float beaming = pow(delta, 3.0);
#else
          float beaming = 1.0;
#endif

          // Shakura-Sunyaev (1973) thin disk T profile: T ~ r^{-3/4} * (1 - sqrt(r_ISCO/r))^{1/4}
          // The second factor forces T -> 0 at the ISCO (physically correct inner edge)
          // at zero extra cost since we are already inside the disk sampling branch.
          float radialTempGradient = pow(isco / r, 0.75) * pow(max(0.0, 1.0 - sqrt(isco / r)), 0.25);
          
          float gravRedshift = sqrt(max(0.0, 1.0 - rs / r));
          float temperature = u_disk_temp * radialTempGradient * delta * gravRedshift;
          
          vec3 diskColor = blackbody(temperature) * beaming;
          float density = baseDensity * u_disk_density * 0.12 * dt;
          
          accumulatedColor += diskColor * density * (1.0 - accumulatedAlpha);
          accumulatedAlpha += density;
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
