import { PHYSICS_CONSTANTS } from "@/configs/physics.config";
import { COMMON_CHUNK } from "./chunks/common";
import { METRIC_CHUNK } from "./chunks/metric";
import { NOISE_CHUNK } from "./chunks/noise";
import { BLACKBODY_CHUNK } from "./chunks/blackbody";
import { BACKGROUND_CHUNK } from "./chunks/background";
import { DISK_CHUNK } from "./chunks/disk";

/**
 * Realistic Black Hole Fragment Shader
 * Features: Starfield, Realistic Accretion Disk, Photon Sphere, Gravitational Lensing
 *
 * Modular Architecture:
 * - Common: Uniforms, Constants, ACES Tone Mapping
 * - Metric: Kerr Geometry (Horizon, ISCO, Ergosphere)
 * - Noise: Hashing, Perlin/Simplex, FBM
 * - Blackbody: Temperature-to-Color, Star Colors
 * - Background: Starfield Generation
 * - Disk: Accretion Disk & Jet Sampling
 */
export const fragmentShaderSource = `#version 300 es
${COMMON_CHUNK}

${METRIC_CHUNK}

${NOISE_CHUNK}

${BLACKBODY_CHUNK}

${BACKGROUND_CHUNK}

${DISK_CHUNK}

// === MAIN SHADER ===
void main() {
    // Setup View - Responsive Scaling
    float minRes = min(u_resolution.x, u_resolution.y);
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / minRes;

    // === DEBUG MODE ===
    if (u_debug > 0.5) {
        fragColor = vec4(uv.x + 0.5, uv.y + 0.5, 0.0, 1.0);
        return;
    }
    vec3 ro = vec3(0.0, 0.0, -u_zoom);
    vec3 rd = normalize(vec3(uv, 1.5)); // 1.5 = FOV

    // Mouse Rotation
    mat2 rx = rot((u_mouse.y - 0.5) * PI);
    mat2 ry = rot((u_mouse.x - 0.5) * PI * 2.0);
    ro.yz *= rx; rd.yz *= rx;
    ro.xz *= ry; rd.xz *= ry;

    // Black hole parameters
    float M = u_mass;
    float rs = M * 2.0; 
    float a = u_spin * M;
    float a2 = a * a;
    
    // Derived Metric Properties
    float rh = kerr_horizon(M, a);
    float rph = rs * 1.5; // Photon sphere
    float isco = kerr_isco(M, a);
    float absA = abs(u_spin);

    // === LOW QUALITY MODE ===
#if defined(RAY_QUALITY_LOW) || defined(RAY_QUALITY_OFF)
    vec3 bg = starfield(rd);
    float d = length(cross(ro, rd));
    float shadow = smoothstep(rh * 1.2, rh * 0.9, d);
    float photonGlowIndicator = exp(-abs(d - rph) * 12.0) * 0.8;
    vec3 glowCol = vec3(0.3, 0.6, 1.0) * photonGlowIndicator;
    float diskMask = smoothstep(isco * 2.0, isco * 1.0, d) * (1.0 - smoothstep(isco * 1.0, isco * 0.8, d));
    vec3 diskColIndicator = vec3(1.0, 0.7, 0.3) * diskMask * 0.6;
    vec3 col = bg * (1.0 - shadow) + glowCol + diskColIndicator;
    fragColor = vec4(pow(col, vec3(0.4545)), 1.0);
    return;
#endif

    // === PRO-PHYSICS ADAPTIVE RAYMARCHING ===
    vec3 p = ro;
    vec3 v = rd;
    
    // Kamikaze Protection
    if(length(ro) < rh * 1.5) {
       ro = normalize(ro) * rh * 1.5;
       p = ro;
    }

    vec3 accumulatedColor = vec3(0.0);
    float accumulatedAlpha = 0.0;
    bool hitHorizon = false;
    float maxRedshift = 0.0;
    
    int photonCrossings = 0;
    float prevY = p.y;
    
    int maxSteps = int(min(float(u_maxRaySteps), 500.0));
    
    // Blue Noise Dithering
    float dither = texture(u_blueNoiseTex, gl_FragCoord.xy / 256.0).r;
    float rayOffset = dither * MIN_STEP;
    p += v * rayOffset;
    
    float impactParam = length(cross(ro, rd));

    for(int i = 0; i < 500; i++) {
        if(i >= maxSteps) break;
        
        float r = length(p);
        
        // Dynamic Event Horizon Threshold
        if(r < rh * ${PHYSICS_CONSTANTS.rayMarching.horizonThreshold.toFixed(2)}) {
            hitHorizon = true;
            break;
        }
        if(r > MAX_DIST) break;

        // Adaptive Step Size
        float distFactor = 1.0 + (r / 20.0);
        float dt = clamp((r - rh) * 0.1 * distFactor, MIN_STEP, MAX_STEP * distFactor);
        
        // Precision near photon ring
        float sphereProx = abs(r - rph);
        dt = min(dt, MIN_STEP + sphereProx * 0.15);
        
        // Cinematic LDE Acceleration
        vec3 L_vec = cross(p, v);
        float L2 = dot(L_vec, L_vec);
        float r2 = r * r;
        float r4 = r2 * r2;
        
        vec3 accel = -normalize(p) * (M / r2 + 2.0 * M * L2 / r4) * u_lensing_strength;
        
        // Relativistic Banking (Frame Dragging)
        float omega = 2.0 * M * a / (r2 * r + a*a*r);
        mat2 dragging = rot(omega * dt);
        v.xz *= dragging;
        p.xz *= dragging;

        // Velocity Verlet Integration
        p += v * dt + 0.5 * accel * dt * dt;
        
        float r_new = length(p);
        vec3 L_new = cross(p, v);
        float L2_new = dot(L_new, L_new);
        float r2_new = r_new * r_new;
        float r4_new = r2_new * r2_new;
        vec3 accel_new = -normalize(p) * (M / r2_new + 2.0 * M * L2_new / r4_new) * u_lensing_strength;
        
        v += 0.5 * (accel + accel_new) * dt;
        v = normalize(v);

        // Photon Crossing Detection
        if(prevY * p.y < 0.0 && r_new < rph * 2.0 && r_new > rh) {
          photonCrossings++;
        }

        // Redshift Tracking
        if (u_show_redshift > 0.5) {
             float potential = sqrt(max(0.0, 1.0 - rs / r_new));
             if (i == 0) maxRedshift = potential;
             else maxRedshift = min(maxRedshift, potential);
        }
        
        prevY = p.y;

        // Accretion Disk Sampling
#ifdef ENABLE_DISK
        sample_accretion_disk(p, ro, r, isco, M, a, dt, rs, accumulatedColor, accumulatedAlpha);
        if(accumulatedAlpha > 0.99) break;
#endif

        // Relativistic Jets Sampling
#ifdef ENABLE_JETS
        sample_relativistic_jets(p, v, r, rh, dt, accumulatedColor, accumulatedAlpha);
#endif
    }

    // Gravitational Redshift Overlay
    if (u_show_redshift > 0.5) {
        float val = maxRedshift;
        if (hitHorizon) val = 0.0;
        
        vec3 heatmap = mix(vec3(0.0), vec3(1.0, 0.0, 0.0), smoothstep(0.0, 0.3, val));
        heatmap = mix(heatmap, vec3(1.0, 1.0, 0.0), smoothstep(0.3, 0.7, val));
        heatmap = mix(heatmap, vec3(0.0, 0.0, 1.0), smoothstep(0.7, 1.0, val));
        
        fragColor = vec4(heatmap, 1.0);
        return;
    }

    // Background & Post-Process
    vec3 background = starfield(v);
    
    // Photon Ring Logic
    float distToPhotonRing = abs(length(p) - rph);
    float directRing = exp(-distToPhotonRing * 40.0) * 1.8 * u_lensing_strength;
    float higherOrderRing = 0.0;
    if(photonCrossings > 0) {
      float ringSharpness = 60.0 + float(photonCrossings) * 30.0;
      float ringBrightness = exp(-float(photonCrossings) * 1.0) * 1.2;
      higherOrderRing = exp(-distToPhotonRing * ringSharpness) * ringBrightness * u_lensing_strength;
    }
    vec3 photonColor = vec3(1.0) * (directRing + higherOrderRing);
    
    // Ergosphere Visualization
    vec3 ergoColor = vec3(0.0);
    if(absA > 0.1) {
      float rFinal = length(p);
      float cosTheta = p.y / max(rFinal, 0.001);
      float r_ergo = kerr_ergosphere(M, a, rFinal, cosTheta);
      float ergoGlow = exp(-abs(rFinal - r_ergo) * 20.0) * 0.35 * absA;
      ergoColor = vec3(0.3, 0.35, 0.9) * ergoGlow;
    }

    vec3 finalColor = background * (1.0 - accumulatedAlpha) + accumulatedColor + photonColor + ergoColor;
    
    if(hitHorizon) finalColor = vec3(0.0);

    // Kerr Shadow Guide
    if (u_show_kerr_shadow > 0.5) {
       float b = impactParam;
       if (abs(b - 5.196 * M) < M * 0.05) {
           finalColor = mix(finalColor, vec3(0.0, 1.0, 0.0), 0.5);
       }
    }
    
    // Tone Mapping & Gamma
    finalColor = aces_tone_mapping(finalColor);
    finalColor = pow(finalColor, vec3(0.4545));
    
    fragColor = vec4(finalColor, 1.0);
}
`;
