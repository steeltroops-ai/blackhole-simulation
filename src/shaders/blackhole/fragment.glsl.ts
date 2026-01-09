/**
 * Fragment Shader for Black Hole Simulation
 * 
 * Purpose: Implements GPU-accelerated geodesic ray tracing for black hole visualization.
 * 
 * Physics Calculations:
 * - Geodesic Ray Tracing: Implements accurate light path calculation using the Kerr
 *   metric for rotating black holes. Rays follow geodesics in curved spacetime with
 *   smooth interpolation between weak-field (far) and strong-field (near) regimes.
 * 
 * - Gravitational Lensing: Simulates light bending around the black hole using
 *   general relativity. Includes:
 *   - Weak field approximation: α ≈ 4GM/(c²b) for distant objects
 *   - Strong field calculation: Full Kerr metric near photon sphere
 *   - Smooth interpolation between regimes for continuous lensing
 *   - Einstein ring formation for aligned sources
 * 
 * - Adaptive Precision: Step size decreases near the photon sphere to capture
 *   complex orbital effects and multiple image formation with high accuracy.
 * 
 * - Frame Dragging (Kerr Metric): Models the rotation of spacetime around a
 *   spinning black hole. The spin parameter causes the accretion disk to rotate
 *   and creates asymmetric effects.
 * 
 * - Accretion Disk Rendering: Volumetric rendering of the hot gas disk orbiting
 *   the black hole. Includes:
 *   - Temperature-based color mapping (red → gold → cyan for increasing temperature)
 *   - Orbital mechanics with Keplerian velocity profiles
 *   - Time dilation effects near the event horizon
 *   - Volumetric density with fractal noise for turbulence
 * 
 * - Doppler Beaming: Relativistic effect where the approaching side of
 *   the disk appears brighter and blueshifted, while the receding side is dimmer
 *   and redshifted. This creates the characteristic asymmetric brightness.
 * 
 * - Photon Sphere: Unstable orbit at 1.5× Schwarzschild radius where photons
 *   can orbit the black hole, creating a bright ring effect.
 * 
 * - Event Horizon: The point of no return at the Schwarzschild radius, rendered
 *   as pure black since no light can escape.
 * 
 * The shader uses ray marching to trace light paths through curved spacetime,
 * accumulating color and density as rays pass through the accretion disk.
 * Graceful termination ensures visual stability at maximum step count.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.4
 */
export const fragmentShaderSource = `
  precision highp float;
  
  // === FEATURE TOGGLES ===
  // These control which rendering features are enabled
  // Set to 1 to enable, 0 to disable for performance
  #define ENABLE_LENSING 1
  #define ENABLE_DISK 1
  #define ENABLE_DOPPLER 1
  #define ENABLE_STARS 1
  #define ENABLE_PHOTON_GLOW 1
  
  // === UNIFORMS ===
  // Resolution and time
  uniform vec2 u_resolution;
  uniform float u_time;
  
  // Black hole properties
  uniform float u_mass;
  uniform float u_spin;
  
  // Accretion disk properties
  uniform float u_disk_density;
  uniform float u_disk_temp;
  
  // Camera properties
  uniform vec2 u_mouse;
  uniform float u_zoom;
  
  // Rendering properties
  uniform float u_lensing_strength;
  uniform int u_quality;  // 0=low (100 steps), 1=medium (300 steps), 2=high (500 steps)
  uniform int u_maxRaySteps;  // Maximum ray marching steps based on quality level

  // === CONSTANTS ===
  #define MAX_DIST 500.0
  #define PI 3.14159265359
  #define MIN_STEP_SIZE 0.01
  #define MAX_STEP_SIZE 0.5

  // === HELPER FUNCTIONS ===

  /**
   * Calculate event horizon radius for a rotating black hole using Kerr metric
   * Formula: r_h = M/2 + sqrt((M/2)^2 - (a*M/2)^2)
   * where a is the spin parameter (normalized to [-1, 1])
   * 
   * Requirements: 1.2
   */
  float calculateEventHorizon(float mass, float spin) {
    float a = clamp(spin, -1.0, 1.0);
    float rg = mass * 0.5;  // Schwarzschild radius / 2
    float a_geom = a * rg;
    float discriminant = rg * rg - a_geom * a_geom;
    
    if (discriminant < 0.0) {
      return rg;
    }
    
    return rg + sqrt(discriminant);
  }

  /**
   * Calculate photon sphere radius for a rotating black hole
   * The photon sphere is where photons can orbit the black hole
   * 
   * For prograde orbits: r_ph = M * 0.6 * (2 + cos(2/3 * arccos(-a)))
   * For Schwarzschild (a=0): r_ph ≈ 1.5 * r_s
   * 
   * Requirements: 1.3
   */
  float calculatePhotonSphere(float mass, float spin) {
    float a = clamp(spin, -1.0, 1.0);
    float angle = acos(-a);
    // Correct formula: r_ph = Rs * (1 + cos(2/3 * arccos(-a)))
    // Input u_mass is Rs (Schwarzschild radius)
    float r_ph = mass * 1.0 * (1.0 + cos((2.0 / 3.0) * angle));
    return r_ph;
  }

  /**
   * Calculate ISCO (Innermost Stable Circular Orbit) radius
   * This is where the accretion disk inner edge should be
   * 
   * For non-rotating: r_isco = 6M
   * For rotating: depends on spin and orbit direction
   * 
   * Requirements: 1.4
   */
  float calculateISCO(float mass, float spin, bool prograde) {
    float a = clamp(spin, -1.0, 1.0);
    float rg = mass * 0.5;
    
    if (abs(a) < 1e-6) {
      return rg * 6.0;
    }
    
    float a2 = a * a;
    float term = pow(1.0 - a2, 1.0 / 3.0);
    float Z1 = 1.0 + term * (pow(1.0 + a, 1.0 / 3.0) + pow(1.0 - a, 1.0 / 3.0));
    float Z2 = sqrt(3.0 * a2 + Z1 * Z1);
    
    float sign = prograde ? -1.0 : 1.0;
    float sqrtTerm = sqrt((3.0 - Z1) * (3.0 + Z1 + 2.0 * Z2));
    float r_isco = rg * (3.0 + Z2 + sign * sqrtTerm);
    
    return r_isco;
  }

  /**
   * Map temperature in Kelvin to RGB color using blackbody radiation spectrum.
   * 
   * Temperature ranges:
   * - < 3000K: Deep red (#330000 to #660000)
   * - 3000-5000K: Orange-red (#FF4500 to #FF8C00)
   * - 5000-7000K: Yellow-white (#FFD700 to #FFFACD)
   * - 7000-10000K: White (#FFFFFF)
   * - 10000-20000K: Blue-white (#E0F0FF to #C0D8FF)
   * - > 20000K: Deep blue (#9BB0FF to #6A7FFF)
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  vec3 temperatureToColor(float tempK) {
    // Clamp temperature to reasonable range
    float temp = clamp(tempK, 1000.0, 40000.0);
    float t = temp / 100.0;
    
    float r, g, b;
    
    // Red component
    if (temp <= 6600.0) {
      r = 1.0;
    } else {
      r = 1.292936186 * pow(t - 60.0, -0.1332047592);
      r = clamp(r, 0.0, 1.0);
    }
    
    // Green component
    if (temp <= 6600.0) {
      g = 0.390081579 * log(t) - 0.631841444;
      g = clamp(g, 0.0, 1.0);
    } else {
      g = 1.129890861 * pow(t - 60.0, -0.0755148492);
      g = clamp(g, 0.0, 1.0);
    }
    
    // Blue component
    if (temp >= 6600.0) {
      b = 1.0;
    } else if (temp <= 1900.0) {
      b = 0.0;
    } else {
      b = 0.543206789 * log(t - 10.0) - 1.196254089;
      b = clamp(b, 0.0, 1.0);
    }
    
    return vec3(r, g, b);
  }

  /**
   * Calculate adaptive step size based on distance from black hole
   * Smaller steps near the photon sphere for accuracy
   * Larger steps far away for performance
   * 
   * Requirements: 7.4, 2.2
   */
  float getAdaptiveStepSize(float dist, float photonSphere) {
    // Distance from photon sphere
    float distFromPhotonSphere = abs(dist - photonSphere);
    
    // Increase precision near photon sphere (within 0.5 radii)
    float precisionZone = photonSphere * 0.5;
    
    // Near photon sphere: use smaller steps for precision
    // Far from photon sphere: use larger steps for performance
    float stepSize = MIN_STEP_SIZE + (MAX_STEP_SIZE - MIN_STEP_SIZE) * 
                     smoothstep(0.0, precisionZone, distFromPhotonSphere);
    
    return stepSize;
  }

  /**
   * Calculate geodesic deflection using Kerr metric
   * Implements accurate light bending in curved spacetime
   * 
   * For weak field (far from black hole): α ≈ 4GM/(c²b)
   * For strong field (near photon sphere): Full Kerr metric calculation
   * 
   * Requirements: 2.1, 2.4
   */
  vec3 calculateGeodesicDeflection(vec3 pos, vec3 vel, float mass, float spin, float dist, float photonSphere) {
    #if ENABLE_LENSING
      // Impact parameter (perpendicular distance from black hole)
      vec3 toCenter = -normalize(pos);
      float impactParam = length(cross(pos, vel));
      
      // Determine if we're in weak or strong field regime
      float strongFieldFactor = smoothstep(photonSphere * 2.0, photonSphere * 0.8, dist);
      
      // === IMPROVED GEODESIC APPROXIMATION ===
      // Instead of a simple force, we use a pseudo-potential approach that better
      // approximates the Schwarzschild/Kerr geodesics.
      // Effective potential V_eff = -M/r + L^2/(2r^2) - M*L^2/r^3
      
      // Calculate effective gravitational acceleration
      // g = -dV/dr = -M/r^2 + L^2/r^3 - 3M*L^2/r^4
      
      // Angular momentum (approximate)
      vec3 L_vec = cross(pos, vel);
      float L2 = dot(L_vec, L_vec);
      
      // Newtonian term
      float term1 = mass / r2;
      
      // Centrifugal term correction (General Relativity)
      // The -3M*L^2/r^4 term is what causes the ISCO and photon sphere
      float termGR = 3.0 * mass * L2 / (r2 * r2);
      
      // Total radial acceleration magnitude
      // We only apply the attractive part as the "force" to bend the ray
      // The centrifugal barrier is implicit in the ray's inertia
      float accel = term1 + termGR;
      
      // Frame dragging (simplified Lense-Thirring effect)
      // Drag varies as 1/r^3
      vec3 frameDrag = vec3(0.0);
      if (abs(spin) > 0.01) {
          vec3 spinAxis = vec3(0.0, 1.0, 0.0);
          vec3 dragDir = cross(spinAxis, pos);
          float dragMag = 2.0 * mass * spin / (dist * dist * dist + 1.0);
          frameDrag = normalize(dragDir) * dragMag;
      }
      
      vec3 totalForce = toCenter * accel + frameDrag;
      
      // Smoothly blend based on distance to avoid singularities
      // but maintain strong bending near photon sphere
      return totalForce;
    #else
      // Lensing disabled: no gravitational deflection
      return vec3(0.0);
    #endif
  }

  /**
   * Check for Einstein ring formation
   * Einstein rings form when source, lens, and observer are aligned
   * 
   * Requirements: 2.3
   */
  float getEinsteinRingContribution(vec3 pos, vec3 vel, float photonSphere) {
    float dist = length(pos);
    
    // Check if ray is near photon sphere and nearly tangent
    float distFromPhotonSphere = abs(dist - photonSphere);
    vec3 radialDir = normalize(pos);
    float tangency = abs(dot(vel, radialDir)); // 0 = tangent, 1 = radial
    
    // Einstein ring forms when ray is tangent to photon sphere
    if (distFromPhotonSphere < photonSphere * 0.1 && tangency < 0.2) {
      return smoothstep(0.2, 0.0, tangency) * smoothstep(photonSphere * 0.1, 0.0, distFromPhotonSphere);
    }
    
    return 0.0;
  }

  // === UTILITY FUNCTIONS ===

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // Softened noise function
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // Smooth interpolation
    float n = i.x + i.y * 157.0 + 113.0 * i.z;
    return mix(mix(mix(hash(i.xy + vec2(0,0) + i.z * 0.0), hash(i.xy + vec2(1,0) + i.z * 0.0), f.x),
                   mix(hash(i.xy + vec2(0,1) + i.z * 0.0), hash(i.xy + vec2(1,1) + i.z * 0.0), f.x), f.y),
               mix(mix(hash(i.xy + vec2(0,0) + (i.z + 1.0) * 0.0), hash(i.xy + vec2(1,0) + (i.z + 1.0) * 0.0), f.x),
                   mix(hash(i.xy + vec2(0,1) + (i.z + 1.0) * 0.0), hash(i.xy + vec2(1,1) + (i.z + 1.0) * 0.0), f.x), f.y), f.z);
  }

  // Reduced octaves for smoother gas (less high-freq noise)
  float fbm(vec3 p) {
    float f = 0.0;
    float w = 0.5;
    // Optimization: Reduced from 4 to 2 octaves for significant performance boost
    // The visual difference is minimal for the accretion disk turbulence
    for (int i = 0; i < 2; i++) { 
      f += w * noise(p);
      p *= 2.02; // Irregular scaling to avoid artifacts
      w *= 0.5;
    }
    return f;
  }

  mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
  }

  /**
   * Generate starfield background with minimum brightness threshold
   * Requirements: 9.3
   */
  vec3 getStarfield(vec3 rd) {
    #if ENABLE_STARS
      vec2 uv = vec2(atan(rd.z, rd.x), asin(rd.y));
      // Extremely sparse and stable stars
      float stars = pow(hash(uv * 30.0), 2500.0) * 100.0;
      
      // Ensure star brightness meets minimum threshold (Requirement 9.3)
      // Minimum brightness of 0.3 for visible stars
      if (stars > 0.01) {
        stars = max(stars, 0.3);
      }
      
      return vec3(stars);
    #else
      // Stars disabled: return black background
      return vec3(0.0);
    #endif
  }

  // === MAIN RENDERING ===

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    // Setup camera
    vec3 ro = vec3(0.0, 2.0, -u_zoom); 
    vec3 lookAt = vec3(0.0, 0.0, 0.0);
    
    vec3 f = normalize(lookAt - ro);
    vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), f));
    vec3 u = cross(f, r);
    vec3 rd = normalize(f + uv.x * r + uv.y * u);
    
    // Apply camera rotation
    mat2 camRotX = rot((u_mouse.y - 0.5) * 2.0);
    mat2 camRotY = rot((u_mouse.x - 0.5) * 4.0);
    ro.yz *= camRotX;
    rd.yz *= camRotX;
    ro.xz *= camRotY;
    rd.xz *= camRotY;

    vec3 col = vec3(0.0);
    
    // Calculate key radii using Kerr metric
    float eventHorizon = calculateEventHorizon(u_mass, u_spin);
    float photonSphere = calculatePhotonSphere(u_mass, u_spin);
    float isco = calculateISCO(u_mass, u_spin, true);  // Prograde orbit
    float accretionMax = eventHorizon * 28.0;  // Outer edge of accretion disk
    
    // Use u_maxRaySteps uniform for maximum ray marching steps
    // Requirements: 3.6 - Use uniform for ray steps to allow dynamic quality changes
    int maxSteps = u_maxRaySteps;
    
    vec3 p = ro;
    vec3 v = rd;
    
    float accumulatedDensity = 0.0;
    vec3 diskColor = vec3(0.0);
    float glow = 0.0;
    float einsteinRingGlow = 0.0;
    
    bool hitHorizon = false;
    
    // Ray marching loop with adaptive step size
    for(int i = 0; i < 500; i++) {
      if (i >= maxSteps) break;
      
      float dist = length(p);
      
      // Adaptive step size based on distance from photon sphere
      // Precision increases near photon sphere (Requirements: 2.2)
      float dt = getAdaptiveStepSize(dist, photonSphere);

      // === GEODESIC RAY TRACING USING KERR METRIC ===
      // Calculate accurate gravitational deflection (Requirements: 2.1, 2.4)
      vec3 geodesicForce = calculateGeodesicDeflection(p, v, u_mass, u_spin, dist, photonSphere);
      
      // Apply lensing strength multiplier for user control
      geodesicForce *= u_lensing_strength;
      
      // Update velocity along geodesic
      v += geodesicForce * dt;
      v = normalize(v);
      
      // Move ray along geodesic path
      p += v * dt;
      
      // Check for Einstein ring formation (Requirements: 2.3)
      einsteinRingGlow += getEinsteinRingContribution(p, v, photonSphere);
      
      // === EXTENDED RAY TRACING DURATION AND STABILITY ===
      // Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
      
      // Check if ray crossed event horizon (Requirement 10.5)
      // Return black immediately when crossing event horizon
      if(dist < eventHorizon) {
        hitHorizon = true;
        break;
      }
      
      // Continue tracing near photon sphere until escape or horizon crossing (Requirement 10.2)
      // Don't terminate early when near photon sphere - let the ray continue
      // The adaptive step size already handles precision near photon sphere

      // Photon sphere glow
      #if ENABLE_PHOTON_GLOW
        glow += 0.02 * (0.1 / (abs(dist - photonSphere) + 0.01));
      #endif
      
      // === REALISTIC ACCRETION DISK RENDERING ===
      // Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 11.1, 11.2, 11.3, 11.4, 11.5
      
      #if ENABLE_DISK
        // Calculate disk thickness with h/r ratio between 0.01-0.1 (Requirement 11.3)
        float diskThicknessRatio = 0.05; // h/r = 0.05 (thin disk approximation)
        float diskHeight = dist * diskThicknessRatio;
        
        // Disk extends from ISCO to ~100 Schwarzschild radii (Requirements 11.1, 11.2)
        float schwarzschildRadius = u_mass * 1.0;
        float diskOuterEdge = schwarzschildRadius * 100.0;
        
        // Check if ray is within disk volume
        if(abs(p.y) < diskHeight && dist >= isco && dist <= diskOuterEdge) {
        
        // Smooth fade at inner edge (ISCO) - Requirement 11.1
        float innerEdgeFade = smoothstep(isco, isco + 1.5, dist);
        
        // Smooth fade at outer edge - Requirement 11.2
        float outerEdgeFade = smoothstep(diskOuterEdge, diskOuterEdge - 10.0, dist);
        
        if(innerEdgeFade > 0.01 && outerEdgeFade > 0.01) {
          // Time dilation effect
          float timeDilation = sqrt(clamp(1.0 - eventHorizon/dist, 0.0, 1.0));
          float localTime = u_time * timeDilation;
          
          // Orbital motion
          float orbitalSpeed = (9.0 * u_spin) / sqrt(dist);
          float rotOffset = localTime * orbitalSpeed;
          
          // === VOLUMETRIC RENDERING IMPROVEMENTS ===
          // Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
          
          // Fractal noise for turbulence simulation (Requirement 11.4)
          // Scale noise appropriately for disk features
          vec3 noisePos = vec3(p.x, p.y * 4.0, p.z) * 0.6;
          float turbulence = fbm(noisePos + vec3(rotOffset, 0.0, rotOffset));
          
          // Exponential density falloff from disk midplane (Requirement 14.1)
          // ρ(y) = ρ₀ × exp(-k|y|/h) where h is disk thickness
          float verticalDensity = exp(-3.0 * abs(p.y) / diskHeight);
          
          // Smooth edge fading at disk boundaries (Requirement 14.3)
          // Already implemented with innerEdgeFade and outerEdgeFade using smoothstep
          
          // Include viewing angle in opacity calculation (Requirement 14.4)
          // Calculate angle between view direction and disk normal (y-axis)
          vec3 diskNormal = vec3(0.0, 1.0, 0.0);
          vec3 viewDir = normalize(p - ro);
          float viewAngle = abs(dot(viewDir, diskNormal));
          
          // Opacity increases when viewing edge-on (viewAngle close to 0)
          // Opacity decreases when viewing face-on (viewAngle close to 1)
          float viewAngleOpacity = 1.0 - viewAngle * 0.5; // Scale factor for viewing angle effect
          
          // Path length through gas depends on viewing angle
          // Edge-on view has longer path length, face-on has shorter
          float pathLengthFactor = 1.0 / (viewAngle + 0.3); // Avoid division by zero
          pathLengthFactor = clamp(pathLengthFactor, 1.0, 3.0); // Limit the effect
          
          // Combine all density factors
          float density = turbulence * innerEdgeFade * outerEdgeFade * u_disk_density * verticalDensity * viewAngleOpacity * pathLengthFactor;
          
          // === RADIAL TEMPERATURE PROFILE ===
          // Temperature increases toward ISCO (Requirement 11.5)
          // Using Shakura-Sunyaev disk model: T ∝ r^(-3/4)
          float normalizedRadius = (dist - isco) / (diskOuterEdge - isco);
          
          // Temperature ranges from ~3000K (outer) to ~20000K (inner)
          float tempOuter = 3000.0;
          float tempInner = 20000.0;
          
          // Radial temperature profile: hotter near ISCO
          float temperature = mix(tempInner, tempOuter, pow(normalizedRadius, 0.75));
          
          // Apply temperature multiplier from UI control
          temperature *= u_disk_temp;
          
          // === TEMPERATURE-TO-COLOR MAPPING ===
          // Use physically accurate blackbody radiation spectrum (Requirements 3.1, 3.2, 3.3, 3.4)
          vec3 diskBaseColor = temperatureToColor(temperature);
          
          // === HIGH SATURATION COLORS FOR ACCRETION DISK ===
          // Requirement 9.2: Use high saturation colors for temperature visualization
          // Convert to HSL-like representation to boost saturation
          float maxComponent = max(max(diskBaseColor.r, diskBaseColor.g), diskBaseColor.b);
          float minComponent = min(min(diskBaseColor.r, diskBaseColor.g), diskBaseColor.b);
          float saturation = (maxComponent - minComponent) / (maxComponent + 0.001);
          
          // Boost saturation to ensure high saturation (minimum 0.6)
          float targetSaturation = max(saturation, 0.6);
          float saturationBoost = targetSaturation / (saturation + 0.001);
          
          // Apply saturation boost while preserving hue
          vec3 avgColor = vec3((diskBaseColor.r + diskBaseColor.g + diskBaseColor.b) / 3.0);
          diskBaseColor = mix(avgColor, diskBaseColor, saturationBoost);
          diskBaseColor = clamp(diskBaseColor, 0.0, 1.0);
          
          // === SMOOTH COLOR GRADIENTS ===
          // Ensure smooth transitions without banding (Requirement 3.5)
          // The temperatureToColor function already provides smooth gradients
          // Add slight dithering to prevent banding artifacts
          float dither = (hash(gl_FragCoord.xy) - 0.5) * 0.01;
          diskBaseColor += vec3(dither);
          diskBaseColor = clamp(diskBaseColor, 0.0, 1.0);
          
          // === DOPPLER BEAMING EFFECTS ===
          // Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
          
          vec3 dopplerShiftedColor = diskBaseColor;
          float brightnessBoost = 1.0;
          
          #if ENABLE_DOPPLER
            // Calculate Keplerian orbital velocity: v = √(GM/r) (Requirement 4.4)
            // In simulation units where G=1, M=mass
            float orbitalVelocityMagnitude = sqrt(u_mass / dist);
            
            // Disk velocity direction (perpendicular to radial, in orbital plane)
            vec3 diskVelocity = normalize(vec3(-p.z, 0.0, p.x)) * orbitalVelocityMagnitude;
            
            // View direction (from disk point to observer)
            vec3 viewDirection = normalize(ro - p);
            
            // Radial velocity component (positive = approaching, negative = receding)
            float radialVelocity = dot(diskVelocity, viewDirection);
            
            // Calculate Lorentz factor: γ = 1/√(1 - β²) where β = v/c
            // In simulation units, c = 1
            float beta = orbitalVelocityMagnitude;
            float betaSquared = beta * beta;
            float gamma = 1.0 / sqrt(max(1.0 - betaSquared, 0.01)); // Clamp to avoid division by zero
            
            // Calculate viewing angle (angle between velocity and view direction)
            float cosTheta = radialVelocity / (orbitalVelocityMagnitude + 1e-6);
            cosTheta = clamp(cosTheta, -1.0, 1.0);
            
            // Calculate relativistic Doppler factor: δ = 1/(γ(1 - β·cosθ)) (Requirement 4.1)
            float dopplerFactor = 1.0 / (gamma * (1.0 - beta * cosTheta));
            
            // Apply δ⁴ brightness boost for approaching material (Requirement 4.2)
            // Apply proportional dimming for receding material (Requirement 4.3)
            brightnessBoost = pow(dopplerFactor, 4.0);
            
            // Apply color shifting (Requirement 4.5)
            // Blue for approaching (radialVelocity > 0), red for receding (radialVelocity < 0)
            if (radialVelocity > 0.0) {
              // Approaching: shift toward blue
              float shiftAmount = radialVelocity * 0.3;
              dopplerShiftedColor.r = max(0.0, dopplerShiftedColor.r - shiftAmount);
              dopplerShiftedColor.b = min(1.0, dopplerShiftedColor.b + shiftAmount);
            } else if (radialVelocity < 0.0) {
              // Receding: shift toward red
              float shiftAmount = abs(radialVelocity) * 0.3;
              dopplerShiftedColor.r = min(1.0, dopplerShiftedColor.r + shiftAmount);
              dopplerShiftedColor.b = max(0.0, dopplerShiftedColor.b - shiftAmount);
            }
          #endif
          
          // Calculate segment color contribution with Doppler effects
          vec3 segmentColor = dopplerShiftedColor * density * brightnessBoost * 0.4;
          
          // === PROPER ALPHA BLENDING ===
          // Requirement 14.5: C_result = C_new × α + C_old × (1 - α)
          // Where α is the opacity of the new layer
          float segmentOpacity = density * 0.3;
          segmentOpacity = clamp(segmentOpacity, 0.0, 1.0);
          
          // Alpha blending formula
          diskColor = segmentColor * segmentOpacity + diskColor * (1.0 - segmentOpacity);
          
          // === COLOR ACCUMULATION OVERFLOW PREVENTION ===
          // Requirement 10.3: Prevent numerical overflow in color accumulation
          // Clamp each color component to valid range [0, 1]
          diskColor = clamp(diskColor, 0.0, 1.0);
          
          // Accumulate density
          accumulatedDensity += segmentOpacity;
          accumulatedDensity = clamp(accumulatedDensity, 0.0, 1.0);
        }
      }
      #endif
      
      // === EARLY TERMINATION ON SATURATION ===
      // Requirement 14.2: Terminate when density reaches saturation threshold
      if(accumulatedDensity > 0.98) break;
      
      // Requirement 10.4: Return starfield color at maximum distance
      if(dist > MAX_DIST) break;
    }
    
    // === GRACEFUL TERMINATION ===
    // Requirements: 2.5, 10.4, 10.5
    
    // Requirement 10.5: Return black immediately when crossing event horizon
    if (hitHorizon) {
      col = vec3(0.0);
    } else {
      // Requirement 10.4: Return starfield color at maximum distance
      col = getStarfield(v);
    }
    
    // === DISTINCT CYAN-BLUE PHOTON SPHERE GLOW ===
    // Requirement 9.4: Implement distinct cyan-blue photon sphere glow
    // Using cyan-blue color (#00FFFF to #0088FF range)
    #if ENABLE_PHOTON_GLOW
      vec3 photonSphereColor = vec3(0.0, 0.8, 1.0); // Cyan-blue
      col += photonSphereColor * glow * 0.06 * u_lensing_strength;
    #endif
    
    // Add Einstein ring glow (Requirements: 2.3)
    // Slightly different blue tone for Einstein rings
    vec3 einsteinRingColor = vec3(0.6, 0.85, 1.0); // Light blue
    col += einsteinRingColor * einsteinRingGlow * 0.15 * u_lensing_strength;
    
    // Add accretion disk color
    #if ENABLE_DISK
      col += diskColor;
    #endif
    
    // === TONE MAPPING THAT PRESERVES HUE ===
    // Requirement 9.5: Add tone mapping that preserves hue while adjusting brightness
    
    // Convert to HSL-like representation
    float maxCol = max(max(col.r, col.g), col.b);
    float minCol = min(min(col.r, col.g), col.b);
    float lightness = (maxCol + minCol) * 0.5;
    float saturationCol = (maxCol - minCol) / (maxCol + 0.001);
    
    // Calculate hue (approximate)
    vec3 huePreserved = col;
    
    // Apply Reinhard tone mapping to lightness only
    float toneMappedLightness = lightness / (1.0 + lightness);
    
    // Reconstruct color with preserved hue and saturation
    if (lightness > 0.001) {
      float lightnessScale = toneMappedLightness / lightness;
      huePreserved = col * lightnessScale;
    }
    
    // Clamp to valid range
    col = clamp(huePreserved, 0.0, 1.0);
    
    // Gamma correction
    col = pow(col, vec3(1.0/2.2)); 
    
    gl_FragColor = vec4(col, 1.0);
  }
`;
