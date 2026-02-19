export const NOISE_CHUNK = `
  // Texture-based hash (ALU optimization)
  float hash(vec3 p) {
    // Map 3D coordinate to 2D texture UV using prime stride
    // This avoids expensive fractal arithmetic in the inner loop
    vec2 uv = (p.xy + p.z * 37.0);
    return texture(u_noiseTex, (uv + 0.5) / 256.0).r;
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

  // Fractal Brownian Motion -- standard 4-octave version (used by background nebula)
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

  // Phase 2.3: Adaptive FBM -- exact octave count controlled by caller.
  // Use 1 octave far from ISCO, 2 in the transition zone, 3 near the inner edge.
  // Saves 4-6 texture fetches for the vast majority of disk samples.
  // Called by sample_accretion_disk() based on r/isco ratio.
  float adaptiveFbm(vec3 p, int octaves) {
    float f = 0.0;
    float amp = 0.5;
    // GLSL unrolled manually to 3 max for shader compiler compatibility.
    // (Dynamic loops over uniforms are slow on some drivers.)
    f += amp * noise(p); p *= 2.0; amp *= 0.5; // Octave 1 (always)
    if (octaves >= 2) { f += amp * noise(p); p *= 2.0; amp *= 0.5; } // Octave 2
    if (octaves >= 3) { f += amp * noise(p); } // Octave 3
    return f;
  }
`;
