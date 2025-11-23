/**
 * Fragment Shader for Black Hole Simulation
 * 
 * Purpose: Implements GPU-accelerated ray tracing for black hole visualization.
 * 
 * Physics Calculations:
 * - Gravitational Lensing: Simulates light bending around the black hole using
 *   simplified general relativity calculations. Light paths are deflected by
 *   gravitational force, creating the characteristic lensing effect.
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
 * - Doppler Beaming: Relativistic Doppler effect where the approaching side of
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
 */
export const fragmentShaderSource = `
  precision highp float;
  
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_mass;
  uniform float u_disk_density;
  uniform float u_disk_temp;
  uniform vec2 u_mouse;
  uniform float u_spin;
  uniform float u_lensing_strength;
  uniform float u_zoom;

  #define MAX_STEPS 300
  #define MAX_DIST 500.0
  #define PI 3.14159265359

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
    for (int i = 0; i < 4; i++) { // Reduced from 5 to 4 for smoothness
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

  vec3 getStarfield(vec3 rd) {
    vec2 uv = vec2(atan(rd.z, rd.x), asin(rd.y));
    // Extremely sparse and stable stars
    float stars = pow(hash(uv * 30.0), 2500.0) * 100.0; 
    return vec3(stars);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    vec3 ro = vec3(0.0, 2.0, -u_zoom); 
    vec3 lookAt = vec3(0.0, 0.0, 0.0);
    
    vec3 f = normalize(lookAt - ro);
    vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), f));
    vec3 u = cross(f, r);
    vec3 rd = normalize(f + uv.x * r + uv.y * u);
    
    mat2 camRotX = rot((u_mouse.y - 0.5) * 2.0);
    mat2 camRotY = rot((u_mouse.x - 0.5) * 4.0);
    ro.yz *= camRotX;
    rd.yz *= camRotX;
    ro.xz *= camRotY;
    rd.xz *= camRotY;

    vec3 col = vec3(0.0);
    
    float rs = u_mass * 0.5; 
    float photonSphere = rs * 1.5; 
    float isco = rs * 3.0; 
    float accretionMax = rs * 14.0; 
    
    vec3 p = ro;
    vec3 v = rd;
    
    float accumulatedDensity = 0.0;
    vec3 diskColor = vec3(0.0);
    float glow = 0.0;
    
    bool hitHorizon = false;
    
    for(int i = 0; i < 300; i++) {
      float dist = length(p);
      
      // Smoother adaptive stepping
      float dt = 0.05 + dist * 0.025;

      // 1. Frame Dragging
      if (dist < accretionMax) {
         float drag = (u_spin * 0.08) / (dist * dist + 0.1);
         p.xz *= rot(drag);
      }

      // 2. Gravity Lensing
      vec3 force = normalize(-p) * (u_mass * 0.9 * u_lensing_strength) / (dist * dist);
      v += force * dt; 
      v = normalize(v);
      p += v * dt;
      
      if(dist < rs) {
        hitHorizon = true;
        break;
      }

      glow += 0.02 * (0.1 / (abs(dist - photonSphere) + 0.01));
      
      float diskHeight = 0.08 + (dist * 0.06); // Slightly thicker for smoothness
      
      // 3. Volumetric Accretion Disk
      if(abs(p.y) < diskHeight && dist < accretionMax) {
        
        float iscoFade = smoothstep(isco, isco + 2.5, dist); // Softer ISCO edge
        
        if(iscoFade > 0.01) {
            float timeDilation = sqrt(clamp(1.0 - rs/dist, 0.0, 1.0));
            float localTime = u_time * timeDilation;

            float orbitalSpeed = (9.0 * u_spin) / sqrt(dist);
            float spiral = -localTime * 0.5 + dist * 0.3; 
            float rotOffset = localTime * orbitalSpeed;
            
            // Reduced coordinate scaling for smoother noise features
            vec3 noisePos = vec3(p.x, p.y * 4.0, p.z) * 0.8; 
            float gas = fbm(noisePos + vec3(rotOffset, spiral, rotOffset));
            
            float fadeOuter = smoothstep(accretionMax, accretionMax - 6.0, dist);
            float density = gas * fadeOuter * iscoFade * u_disk_density * exp(-2.5 * abs(p.y) / diskHeight);
            
            vec3 diskVel = normalize(vec3(-p.z, 0.0, p.x));
            float viewDot = dot(diskVel, normalize(p - ro));
            float doppler = 1.0 + viewDot * 0.9;
            doppler = pow(doppler, 3.0); 

            float energy = smoothstep(rs, rs * 8.0, dist); 
            
            // SMOOTHED COLOR PALETTE
            vec3 colInner = vec3(0.25, 0.8, 1.0); // Cyan
            vec3 colMid = vec3(1.0, 0.6, 0.05);   // Gold
            vec3 colOuter = vec3(0.8, 0.02, 0.02); // Red
            
            vec3 tempColor = mix(colOuter, colMid, smoothstep(0.0, 0.5, energy * u_disk_temp));
            tempColor = mix(tempColor, colInner, smoothstep(0.5, 1.0, energy * u_disk_temp));
            
            // Less aggressive brightness multiplier
            tempColor *= 1.4; 

            vec3 segmentColor = tempColor * density * doppler * 0.3;
            segmentColor *= energy; 

            diskColor += segmentColor * (1.0 - accumulatedDensity);
            
            // Lower accumulation rate = softer, more transparent gas
            accumulatedDensity += density * 0.25; 
        }
      }
      
      if(accumulatedDensity > 0.98) break;
      if(dist > MAX_DIST) break;
    }
    
    if (hitHorizon) {
      col = vec3(0.0);
    } else {
      col = getStarfield(v);
    }
    
    col += vec3(0.5, 0.7, 1.0) * glow * 0.06 * u_lensing_strength;
    col += diskColor;
    
    // Tone Mapping
    col *= 0.95;
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    col = clamp((col*(a*col+b))/(col*(c*col+d)+e), 0.0, 1.0);
    
    col = pow(col, vec3(1.0/2.2)); 
    
    gl_FragColor = vec4(col, 1.0);
  }
`;
