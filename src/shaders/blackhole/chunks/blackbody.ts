export const BLACKBODY_CHUNK = `
  /**
   * Analytic Blackbody Approximation (Reverted Phase 1.1)
   * Restored to original behavior as per user request.
   * 
   * @param temp Observed temperature (K)
   * @return Linear RGB color (normalized intensity)
   */
  vec3 blackbody(float temp) {
    // Standard Tanner-Helland / Mitchell Charity approximation
    // Adjusted for linear space
    // Clamp to prevent log(0) at Event Horizon (Infinite Redshift)
    float t = max(temp, 1.0) / 100.0;
    float r, g, b;

    if (t <= 66.0) {
        r = 255.0;
        g = 99.4708025861 * log(t) - 161.1195681661;
        
        if (t <= 19.0) {
            b = 0.0;
        } else {
            b = 138.5177312231 * log(t - 10.0) - 305.0447927307;
        }
    } else {
        r = 329.698727446 * pow(t - 60.0, -0.1332047592);
        g = 288.1221695283 * pow(t - 60.0, -0.0755148492);
        b = 255.0;
    }

    // Formula produces sRGB. Convert to Linear for HDR pipeline.
    vec3 srgbCol = vec3(r, g, b) / 255.0;
    return pow(max(srgbCol, 0.0), vec3(2.2));
  }

  // Approximate star color from B-V color index
  vec3 starColor(float bv) {
    float t = clamp(bv, -0.4, 2.0);
    vec3 col;
    if(t < 0.0) col = vec3(0.6, 0.7, 1.0); // O/B
    else if(t < 0.3) col = vec3(0.85, 0.88, 1.0); // A
    else if(t < 0.6) col = vec3(1.0, 0.96, 0.9); // F
    else if(t < 1.0) col = vec3(1.0, 0.85, 0.6); // G/K
    else col = vec3(1.0, 0.6, 0.4); // M
    return col;
  }
`;
