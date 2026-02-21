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
        
        // Prograde (Corotating) => Minus (-) sign (Smaller ISCO)
        // Retrograde (Counter-rotating) => Plus (+) sign (Larger ISCO)
        float signOfA = sign(a);
        if (signOfA == 0.0) signOfA = 1.0;
        
        return M * (3.0 + z2 - signOfA * sqrt((3.0 - z1) * (3.0 + z1 + 2.0 * z2)));
    }

    // Exact Prograde Photon Sphere (Bardeen 1973)
    // r_ph = 2M * [1 + cos(2/3 * arccos(-a*/M))]
    // For a=0 (Schwarzschild): r_ph = 3M
    // For a=M (extreme Kerr):  r_ph -> M
    float kerr_photon_sphere(float M, float a) {
        float a_star = clamp(a / M, -0.9999, 0.9999);
        float arg = clamp(-a_star, -1.0, 1.0);
        float theta = (2.0 / 3.0) * acos(arg);
        return 2.0 * M * (1.0 + cos(theta));
    }

    // Ergosphere radius at given theta
    float kerr_ergosphere(float M, float a, float r, float cosTheta) {
        return M + sqrt(max(0.0, M * M - a * a * cosTheta * cosTheta));
    }

    // Kerr shadow critical impact parameter (spin-dependent)
    // Schwarzschild: b_crit = 3*sqrt(3)*M ~ 5.196*M
    // Spinning BH: the shadow shrinks on the prograde side
    float kerr_shadow_radius(float M, float a) {
        float a_star = abs(a / M);
        // For a=0: 3*sqrt(3)*M = 5.196M (exact Schwarzschild)
        // Interpolation via photon sphere radii for non-zero spin
        if (a_star < 0.001) return 3.0 * sqrt(3.0) * M;
        float r_pro = kerr_photon_sphere(M, abs(a));
        float r_retro = kerr_photon_sphere(M, -abs(a));
        // Geometric mean of the critical impact parameters
        return sqrt(r_pro * r_retro) * sqrt(3.0);
    }
`;
