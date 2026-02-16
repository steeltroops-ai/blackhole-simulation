export const METRIC_CHUNK = `
    // Kerr Metric Calculations
    // r_h = M + sqrt(M^2 - a^2)
    float kerr_horizon(float M, float a) {
        return M + sqrt(max(0.0, M*M - a*a));
    }
    
    // ISCO Calculation (Approximate)
    // Bardeen-Press-Teukolsky formula polynomial fit
    float kerr_isco(float M, float a) {
        float absA = abs(clamp(a/M, -1.0, 1.0));
        return M * (6.0 - 4.627 * absA + 2.399 * absA * absA - 0.772 * absA * absA * absA);
    }

    // Ergosphere radius at given theta
    float kerr_ergosphere(float M, float a, float r, float cosTheta) {
        return M + sqrt(max(0.0, M * M - a * a * cosTheta * cosTheta));
    }
`;
