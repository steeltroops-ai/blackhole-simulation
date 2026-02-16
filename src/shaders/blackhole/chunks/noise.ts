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

  // Fractal Brownian Motion for turbulence
  float fbm(vec3 p) {
    float f = 0.0;
    float amp = 0.5;
    for(int i = 0; i < 4; i++) {
        // Optimization: fewer octaves far away? No, standard 4 is optimized enough with texture lookups
      f += amp * noise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return f;
  }
`;
