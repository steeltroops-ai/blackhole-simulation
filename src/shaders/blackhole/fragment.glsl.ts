import { PHYSICS_CONSTANTS } from "@/configs/physics.config";

/**
 * Realistic Black Hole Fragment Shader
 * Features: Starfield, Realistic Accretion Disk, Photon Sphere, Gravitational Lensing
 */
export const fragmentShaderSource = `
  precision highp float;
  
  // === UNIFORMS ===
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_mass;
  uniform float u_spin;
  uniform float u_disk_density;
  uniform float u_disk_temp;
  uniform vec2 u_mouse;
  uniform float u_zoom;
  uniform float u_lensing_strength;
  uniform float u_disk_size;
  uniform int u_maxRaySteps;

  // === CONSTANTS ===
#define PI 3.14159265359
#define MAX_DIST ${PHYSICS_CONSTANTS.rayMarching.maxDistance.toFixed(1)}
#define MIN_STEP ${PHYSICS_CONSTANTS.rayMarching.minStep.toFixed(2)}
#define MAX_STEP ${PHYSICS_CONSTANTS.rayMarching.maxStep.toFixed(1)}

  // === HELPER FUNCTIONS ===
  mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
  }

  // High-quality hash
  float hash(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  // 3D noise
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  // Fractal Brownian Motion for turbulence
  float fbm(vec3 p) {
    float f = 0.0;
    float amp = 0.5;
    for(int i = 0; i < 4; i++) {
      f += amp * noise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return f;
  }

  // Realistic blackbody radiation color
  vec3 blackbody(float temp) {
    temp = clamp(temp, 1000.0, 50000.0);
    vec3 col;
    
    float t = temp / 100.0;
    
    // Red channel
    if(t <= ${PHYSICS_CONSTANTS.blackbody.redChannel.threshold.toFixed(1)}) {
      col.r = 1.0;
    } else {
      col.r = clamp(${PHYSICS_CONSTANTS.blackbody.redChannel.scale.toFixed(9)} * pow(t - ${PHYSICS_CONSTANTS.blackbody.redChannel.offset.toFixed(1)}, ${PHYSICS_CONSTANTS.blackbody.redChannel.exponent.toFixed(10)}), 0.0, 1.0);
    }
    
    // Green channel
    if(t <= ${PHYSICS_CONSTANTS.blackbody.redChannel.threshold.toFixed(1)}) {
      col.g = clamp(${PHYSICS_CONSTANTS.blackbody.greenChannel.logScale.toFixed(8)} * log(t) - ${Math.abs(PHYSICS_CONSTANTS.blackbody.greenChannel.logOffset).toFixed(9)}, 0.0, 1.0);
    } else {
      col.g = clamp(${PHYSICS_CONSTANTS.blackbody.greenChannel.powScale.toFixed(9)} * pow(t - ${PHYSICS_CONSTANTS.blackbody.redChannel.offset.toFixed(1)}, ${PHYSICS_CONSTANTS.blackbody.greenChannel.powExponent.toFixed(10)}), 0.0, 1.0);
    }
    
    // Blue channel
    if(t >= ${PHYSICS_CONSTANTS.blackbody.redChannel.threshold.toFixed(1)}) {
      col.b = 1.0;
    } else if(t <= ${PHYSICS_CONSTANTS.blackbody.blueChannel.threshold.toFixed(1)}) {
      col.b = 0.0;
    } else {
      col.b = clamp(${PHYSICS_CONSTANTS.blackbody.blueChannel.logScale.toFixed(9)} * log(t - ${PHYSICS_CONSTANTS.blackbody.blueChannel.offset.toFixed(1)}) - ${Math.abs(PHYSICS_CONSTANTS.blackbody.blueChannel.logOffset).toFixed(9)}, 0.0, 1.0);
    }
    
    return col;
  }

  // Starfield background
  vec3 starfield(vec3 dir) {
    vec3 stars = vec3(0.0);
    
    // Large stars
    float starNoise = hash(floor(dir * 200.0));
    if(starNoise > 0.998) {
      float brightness = pow(starNoise, 10.0) * 2.0;
      stars = vec3(brightness);
    }
    
    // Small stars
    starNoise = hash(floor(dir * 500.0));
    if(starNoise > 0.996) {
      float brightness = pow(starNoise, 20.0) * 1.5;
      stars += vec3(brightness);
    }
    
    // Nebula-like background glow
    float nebula = fbm(dir * 2.0 + u_time * 0.01) * 0.03;
    stars += vec3(nebula * 0.3, nebula * 0.5, nebula * 0.8);
    
    return stars;
  }

  void main() {
    // Setup View
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    vec3 ro = vec3(0.0, 0.0, -u_zoom);
    vec3 rd = normalize(vec3(uv, 1.8));
    
    // Mouse Rotation
    mat2 rx = rot((u_mouse.y - 0.5) * 1.2);
    mat2 ry = rot((u_mouse.x - 0.5) * 2.5);
    ro.yz *= rx; rd.yz *= rx;
    ro.xz *= ry; rd.xz *= ry;

    // Black hole parameters (Cinematic Scaling)
    float M = u_mass;
    float rs = M * 2.0; 
    float a = u_spin * M;
    float a2 = a * a;
    
    // ISCO and Horizon logic for Cinematic Proportion
    float rh = M + sqrt(max(0.0, M*M - a2));
    float rph = rs * 1.5; // Photon sphere at 3M
    float isco = rs * 3.0; // Aesthetic ISCO cutoff

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
    gl_FragColor = vec4(pow(col, vec3(0.4545)), 1.0);
    return;
#endif

    // === PRO-PHYSICS ADAPTIVE RAYMARCHING ===
    vec3 p = ro;
    vec3 v = rd;
    
    // Kamikaze Protection: Ensure ro is always outside the shadow boundary
    float camDist = length(ro);
    if(camDist < rh * 1.5) {
       ro = normalize(ro) * rh * 1.5;
       p = ro;
    }

    vec3 accumulatedColor = vec3(0.0);
    float accumulatedAlpha = 0.0;
    bool hitHorizon = false;
    
    // Professional 500-step budget
    int maxSteps = int(min(float(u_maxRaySteps), 500.0));

    for(int i = 0; i < 500; i++) {
        if(i >= maxSteps) break;
        
        float r = length(p);
        
        // Dynamic Event Horizon Threshold
        if(r < rh * ${PHYSICS_CONSTANTS.rayMarching.horizonThreshold.toFixed(2)}) {
            hitHorizon = true;
            break;
        }
        if(r > MAX_DIST) break;

        // Ray-Leap Stepper: Large in vacuum, infinitesimal near horizon
        float dt = clamp((r - rh) * 0.1, MIN_STEP, MAX_STEP);
        
        // Boost precision near the critical photon ring
        float sphereProx = abs(r - rph);
        dt = min(dt, MIN_STEP + sphereProx * 0.15);
        
        // Cinematic LDE Acceleration
        vec3 L_vec = cross(p, v);
        float L2 = dot(L_vec, L_vec);
        float r2 = r * r;
        float r4 = r2 * r2;
        
        // F = M/r^2 + 2ML^2/r^4 (Newtonian + Centrifugal Shield)
        vec3 accel = -normalize(p) * (M / r2 + 2.0 * M * L2 / r4) * u_lensing_strength;
        
        // Relativistic Banking (Frame Dragging Twist)
        float omega = 2.0 * M * a / (r2 * r + a*a*r);
        mat2 dragging = rot(omega * dt);
        v.xz *= dragging;
        p.xz *= dragging;

        v += accel * dt;
        v = normalize(v);
        p += v * dt;

        // Accretion Disk Sample
#ifdef ENABLE_DISK
        float diskHeight = r * ${PHYSICS_CONSTANTS.accretion.diskHeightMultiplier.toFixed(2)};
        float diskInner = isco;
        // User-controlled dynamic radius (proportional to M)
        float diskOuter = M * u_disk_size;
        
        if(abs(p.y) < diskHeight && r > diskInner && r < diskOuter) {
            vec3 noiseP = p * ${PHYSICS_CONSTANTS.accretion.turbulenceScale.toFixed(2)} + vec3(u_time * ${PHYSICS_CONSTANTS.accretion.timeScale.toFixed(2)}, 0.0, 0.0);
            float turbulence = noise(noiseP) * 0.5 + noise(noiseP * ${PHYSICS_CONSTANTS.accretion.turbulenceDetail.toFixed(1)}) * 0.25;
            
            float heightFalloff = exp(-abs(p.y) / (diskHeight * ${PHYSICS_CONSTANTS.accretion.densityFalloff.toFixed(2)}));
            float radialFalloff = smoothstep(diskOuter, diskInner, r);
            float baseDensity = turbulence * heightFalloff * radialFalloff;
            
            if (baseDensity > 0.001) {
                float orbitalVel = 1.0 / (sqrt(r) * (1.0 + a / (r*sqrt(r))));
                orbitalVel = clamp(orbitalVel, 0.0, 0.99);
                
                vec3 diskVelVec = normalize(vec3(-p.z, 0.0, p.x)) * orbitalVel;
                float cosTheta = dot(diskVelVec, normalize(ro - p));
                
                // Relativistic Doppler Factor
                float beta = orbitalVel;
                float gamma = 1.0 / sqrt(1.0 - beta*beta);
                float delta = 1.0 / (gamma * (1.0 - beta * cosTheta));
                
                // Azure Spectral Shift logic
                float beaming = pow(delta, 4.5);
                float radialTempGradient = pow(isco / r, 0.75);
                float temperature = u_disk_temp * radialTempGradient * delta;
                
                vec3 diskColor = blackbody(temperature) * beaming;
                float density = baseDensity * u_disk_density * 0.12 * dt;
                
                accumulatedColor += diskColor * density * (1.0 - accumulatedAlpha);
                accumulatedAlpha += density;
                
                if(accumulatedAlpha > 0.99) break;
            }
        }
#endif
    }

    // Background Optics
    vec3 background = starfield(v);
    
    // Neutral White Photon Ring (Multi-spectral starfield concentration)
    float distToPhotonRing = abs(length(p) - rph);
    float photonRing = exp(-distToPhotonRing * 40.0) * 1.8 * u_lensing_strength;
    vec3 photonColor = vec3(1.0, 1.0, 1.0) * photonRing; 
    
    vec3 finalColor = background * (1.0 - accumulatedAlpha) + accumulatedColor + photonColor;
    
    // Event horizon is pure black
    if(hitHorizon) {
      finalColor = vec3(0.0);
    }
    
    // Tone mapping (ACES)
    finalColor = finalColor / (finalColor + vec3(1.0));
    
    // Gamma correction
    finalColor = pow(finalColor, vec3(0.4545));
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;
