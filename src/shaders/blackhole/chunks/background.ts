export const BACKGROUND_CHUNK = `
  // Starfield background with spectral-class color variation
  vec3 starfield(vec3 dir) {
    vec3 stars = vec3(0.0);
    
    // Large stars (bright, rare)
    vec3 cell = floor(dir * 200.0);
    float starNoise = hash(cell);
    if(starNoise > 0.998) {
      float brightness = pow(starNoise, 10.0) * 2.0;
      float bv = hash(cell + 127.1) * 2.4 - 0.4;
      float twinkle = 0.85 + 0.15 * sin(u_time * (3.0 + hash(cell + 73.7) * 4.0));
      stars = starColor(bv) * brightness * twinkle;
    }
    
    // Small stars (dimmer, more numerous)
    cell = floor(dir * 500.0);
    starNoise = hash(cell);
    if(starNoise > 0.996) {
      float brightness = pow(starNoise, 20.0) * 1.5;
      float bv = hash(cell + 217.3) * 2.4 - 0.4;
      stars += starColor(bv) * brightness;
    }
    
    // Nebula-like background glow
    float nebula = fbm(dir * 2.0 + u_time * 0.01) * 0.03;
    stars += vec3(nebula * 0.2, nebula * 0.3, nebula * 0.5) + vec3(0.05, 0.02, 0.05) * length(nebula);
    
    return stars;
  }
`;
