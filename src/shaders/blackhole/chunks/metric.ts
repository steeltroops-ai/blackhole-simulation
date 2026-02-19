export const METRIC_CHUNK = `
    // Kerr Metric Calculations
    // r_h = M + sqrt(M^2 - a^2)
    float kerr_horizon(float M, float a) {
        return M + sqrt(max(0.0, M*M - a*a));
    }
    
    // Exact ISCO Calculation (Bardeen, Press, Teukolsky 1972)
    // Handles Prograde (a > 0) and Retrograde (a < 0) orbits correctly.
    float kerr_isco(float M, float a) {
        float rs = a / M;
        float absS = abs(clamp(rs, -0.9999, 0.9999));
        
        float z1 = 1.0 + pow(1.0 - absS * absS, 1.0/3.0) * (pow(1.0 + absS, 1.0/3.0) + pow(1.0 - absS, 1.0/3.0));
        float z2 = sqrt(3.0 * absS * absS + z1 * z1);
        
        // SCIENTIFIC FIX:
        // Prograde (Corotating) => Minus (-) sign (Smaller ISCO)
        // Retrograde (Counter-rotating) => Plus (+) sign (Larger ISCO)
        // We look at the sign of 'a' to determine orbit direction relative to BH.
        float signOfA = sign(a);
        if (signOfA == 0.0) signOfA = 1.0; // Default to prograde for non-spinning
        
        // Note: The formula uses -sign(a) because for a > 0 we want (-), for a < 0 we want (+)
        return M * (3.0 + z2 - signOfA * sqrt((3.0 - z1) * (3.0 + z1 + 2.0 * z2)));
    }

    // Ergosphere radius at given theta
    float kerr_ergosphere(float M, float a, float r, float cosTheta) {
        return M + sqrt(max(0.0, M * M - a * a * cosTheta * cosTheta));
    }
`;
