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
  uniform int u_maxRaySteps;

  // === CONSTANTS ===
#define PI 3.14159265359
#define MAX_DIST 200.0
#define MIN_STEP 0.01
#define MAX_STEP 1.2

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
    temp = clamp(temp, 1000.0, 40000.0);
    vec3 col;
    
    float t = temp / 100.0;
    
    // Red channel
    if(t <= 66.0) {
      col.r = 1.0;
    } else {
      col.r = clamp(1.292936186 * pow(t - 60.0, -0.1332047592), 0.0, 1.0);
    }
    
    // Green channel
    if(t <= 66.0) {
      col.g = clamp(0.39008157 * log(t) - 0.631841444, 0.0, 1.0);
    } else {
      col.g = clamp(1.129890861 * pow(t - 60.0, -0.0755148492), 0.0, 1.0);
    }
    
    // Blue channel
    if(t >= 66.0) {
      col.b = 1.0;
    } else if(t <= 19.0) {
      col.b = 0.0;
    } else {
      col.b = clamp(0.543206789 * log(t - 10.0) - 1.196254089, 0.0, 1.0);
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

    // Black hole parameters
    float rs = u_mass * 2.0; // Schwarzschild radius
    float rh = rs * 0.5 + sqrt(max(0.0, rs * rs * 0.25 * (1.0 - u_spin * u_spin)));
    float rph = rs * (1.0 + cos(0.666 * acos(-u_spin)));
    float isco = rs * 3.0; // Innermost stable circular orbit

    // === LOW QUALITY MODE ===
#if defined(RAY_QUALITY_LOW) || defined(RAY_QUALITY_OFF)
    vec3 bg = starfield(rd);
    float d = length(cross(ro, rd));
    
    // Event horizon shadow
    float shadow = smoothstep(rh * 1.5, rh * 0.8, d);
    
    // Photon sphere glow
    float photonGlow = exp(-abs(d - rph) * 8.0) * 0.8;
    vec3 glowCol = vec3(0.3, 0.6, 1.0) * photonGlow;
    
    // Simple disk
    float diskMask = smoothstep(isco * 3.0, isco * 1.2, d) * (1.0 - smoothstep(isco * 1.2, isco * 0.9, d));
    vec3 diskCol = vec3(1.0, 0.7, 0.3) * diskMask * 0.6;
    
    vec3 col = bg * (1.0 - shadow) + glowCol + diskCol;
    gl_FragColor = vec4(pow(col, vec3(0.4545)), 1.0);
    return;
#endif

    // === HIGH QUALITY RAYMARCHING ===
    vec3 p = ro;
    vec3 v = rd;
    vec3 accumulatedColor = vec3(0.0);
    float accumulatedAlpha = 0.0;
    bool hitHorizon = false;
    
    // Optimization: limit max steps based on quality uniform, hard cap at 200 for stability
    int maxSteps = int(min(float(u_maxRaySteps), 200.0));
    
    // Optimization: Pre-calculate constants
    float rs2 = rs * rs; 
    float invRs = 1.0 / rs;

    for(int i = 0; i < 200; i++) {
      if(i >= maxSteps) break;
      
      float r = length(p);
      
      // Hit event horizon
      if(r < rh * 1.05) {
        hitHorizon = true;
        break;
      }
      
      // Escaped to infinity
      if(r > MAX_DIST) break;

      // Adaptive step size - more aggressive optimization
      // Increase step size significantly when far from the black hole
      float distanceToHole = abs(r - rph);
      float dt = MIN_STEP + (MAX_STEP - MIN_STEP) * smoothstep(rph * 0.2, rph * 4.0, distanceToHole);
      
      // Geodesic equation (simplified Kerr metric)
      vec3 L_vec = cross(p, v);
      float L2 = dot(L_vec, L_vec);
      float r2 = r * r;
      float r3 = r2 * r; // reduced multiplications
      
      // Gravitational acceleration
      // Optimization: removed redundant lensing strength mult inside loop if constant
      vec3 accel = -normalize(p) * (u_mass * rs / r2 + 3.0 * u_mass * rs * L2 / (r2 * r3)) * u_lensing_strength;
      
      v += accel * dt;
      v = normalize(v);
      p += v * dt;

      // Accretion disk rendering
#ifdef ENABLE_DISK
      // Optimization: tighter bounds for disk check
      float diskHeight = r * 0.08;
      float diskInner = isco;
      float diskOuter = rs * 18.0; // Reduced from 25.0 to render less empty space
      
      if(abs(p.y) < diskHeight && r > diskInner && r < diskOuter) {
        // Optimization: fewer FBM octaves (inlined for performance)
        // Manual unroll of 3 FBM octaves
        vec3 noiseP = p * 0.3 + vec3(u_time * 0.3, 0.0, 0.0);
        float turbulence = noise(noiseP) * 0.5;
        turbulence += noise(noiseP * 2.0) * 0.25;
        turbulence += noise(noiseP * 4.0) * 0.125;
        
        float heightFalloff = exp(-abs(p.y) / diskHeight * 4.0);
        float radialFalloff = smoothstep(diskOuter, diskInner, r); // Reused
        
        // Skip expensive lighting if density is negligible
        float baseDensity = turbulence * heightFalloff * radialFalloff;
        if (baseDensity < 0.01) continue;

        float density = baseDensity * u_disk_density * 0.15;
        
        // Temperature gradient
        float tempFactor = 1.0 - smoothstep(diskInner, diskOuter, r);
        float baseTemp = mix(3000.0, 25000.0, tempFactor);
        
        // Doppler shift
        float orbitalVel = sqrt(u_mass * rs / r);
        vec3 diskVelocity = normalize(vec3(-p.z, 0.0, p.x)) * orbitalVel;
        float dopplerShift = 1.0 + dot(diskVelocity, normalize(ro - p)) * 0.3;
        
        float temperature = baseTemp * u_disk_temp * dopplerShift;
        vec3 diskColor = blackbody(temperature);
        
        accumulatedColor += diskColor * density * (1.0 - accumulatedAlpha);
        accumulatedAlpha += density;
        
        if(accumulatedAlpha > 0.98) break; // Early exit threshold increased
      }
#endif
    }

    // Background starfield (lensed)
    vec3 background = starfield(v);
    
    // Photon sphere glow
    float distToPhotonSphere = abs(length(p) - rph);
    float photonGlow = 0.3 / (distToPhotonSphere * 2.0 + 0.1) * u_lensing_strength;
    vec3 photonColor = vec3(0.4, 0.7, 1.0) * photonGlow;
    
    // Combine all elements
    vec3 finalColor = background * (1.0 - accumulatedAlpha);
    finalColor += accumulatedColor;
    finalColor += photonColor;
    
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
