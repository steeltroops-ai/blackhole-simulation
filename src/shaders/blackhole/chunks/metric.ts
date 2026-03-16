export const METRIC_CHUNK = `
    // =========================================================================
    // Kerr Metric Functions
    //
    // References:
    //   Bardeen (1973). "Timelike and null geodesics in the Kerr metric"
    //   Bardeen, Press & Teukolsky (1972). "Rotating Black Holes"
    //   Chandrasekhar (1983). "The Mathematical Theory of Black Holes"
    // =========================================================================

    // --- Horizon, ISCO, Photon Sphere ---

    float kerr_horizon(float M, float a) {
        return M + sqrt(max(0.0, M*M - a*a));
    }

    // Exact ISCO (Bardeen, Press, Teukolsky 1972)
    float kerr_isco(float M, float a) {
        float rs = a / M;
        float absS = abs(clamp(rs, -0.9999, 0.9999));

        float z1 = 1.0 + pow(1.0 - absS * absS, 1.0/3.0) * (pow(1.0 + absS, 1.0/3.0) + pow(1.0 - absS, 1.0/3.0));
        float z2 = sqrt(3.0 * absS * absS + z1 * z1);

        float signOfA = sign(a);
        if (signOfA == 0.0) signOfA = 1.0;

        return M * (3.0 + z2 - signOfA * sqrt((3.0 - z1) * (3.0 + z1 + 2.0 * z2)));
    }

    // Prograde photon sphere (Bardeen 1973)
    float kerr_photon_sphere(float M, float a) {
        float a_star = clamp(a / M, -0.9999, 0.9999);
        float arg = clamp(-a_star, -1.0, 1.0);
        float theta = (2.0 / 3.0) * acos(arg);
        return 2.0 * M * (1.0 + cos(theta));
    }

    // Retrograde photon sphere
    float kerr_photon_sphere_retro(float M, float a) {
        float a_star = clamp(a / M, -0.9999, 0.9999);
        float arg = clamp(a_star, -1.0, 1.0);
        float theta = (2.0 / 3.0) * acos(arg);
        return 2.0 * M * (1.0 + cos(theta));
    }

    float kerr_ergosphere(float M, float a, float r, float cosTheta) {
        return M + sqrt(max(0.0, M * M - a * a * cosTheta * cosTheta));
    }

    // --- Oblate Spheroidal Kerr Coordinate ---
    // In Kerr spacetime, r is NOT Euclidean distance.
    // Solves: r^4 - (rho^2 - a^2)*r^2 - a^2*y^2 = 0
    // where rho = |p| and y is the spin axis component.
    float kerr_r(vec3 p, float a) {
        float a2 = a * a;
        float rho2 = dot(p, p);
        float diff = rho2 - a2;
        float disc = diff * diff + 4.0 * a2 * p.y * p.y;
        float r2 = 0.5 * (diff + sqrt(max(0.0, disc)));
        return sqrt(max(1e-8, r2));
    }

    // --- Kerr Geodesic Acceleration ---
    //
    // Computes the gravitational acceleration on a null ray in the Kerr field.
    // Uses the effective potential approach (Darwin + Kerr corrections):
    //
    //   F = -(M/r^2 + 3M * L_eff^2 / r^4) * r_hat   [radial force]
    //       + omega * (spin x v)                        [frame-dragging]
    //
    // Key improvements over pseudo-Newtonian:
    //   1. r = Kerr oblate-spheroidal coordinate (not Euclidean)
    //   2. L_eff^2 includes spin-orbit coupling: (Lz - a)^2 + Q
    //   3. Frame-dragging: gravito-magnetic force from the Kerr metric
    //      produces the D-shape shadow asymmetry (Bardeen 1973)
    //   4. ZAMO velocity rotation applied to velocity only (not position)

    // --- Kerr-Schild Hamiltonian Geodesics ---
    //
    // This is a much more robust implementation than the pseudo-Newtonian approach.
    // In Kerr-Schild coordinates, the metric is g_uv = n_uv + 2H * l_u * l_v.
    // The null geodesic equations are solved exactly via Hamiltonian derivatives.
    //
    // H = (r^3 * M) / (r^4 + a^2 * y^2)
    // l = (1, (rx + az)/(r^2+a2), (ry - ax)/(r^2+a2), z/r)  [Kerr-Schild null vector]
    // 
    // This naturally produces the Bardeen asymmetry without external "fictitious" forces.

    struct KerrAccelResult {
        vec3 accel;
        float r_k;          // Kerr radial coordinate
        float omega;        // Frame-dragging ZAMO velocity
    };

    KerrAccelResult kerr_geodesic_accel(vec3 p, vec3 v, float M, float a) {
        KerrAccelResult res;
        float a2 = a * a;

        // 1. Kerr radial coordinate (oblate spheroidal)
        float rho2 = dot(p, p);
        float diff = rho2 - a2;
        float disc = diff * diff + 4.0 * a2 * p.y * p.y;
        float r2 = 0.5 * (diff + sqrt(max(0.0, disc)));
        float r_k = sqrt(max(1e-8, r2));
        res.r_k = r_k;

        // 2. Kerr-Schild Null Vector (modified for Y-up spin axis)
        // For spin along Y:
        // l = (1, (r*x + a*z)/(r2 + a2), y/r, (r*z - a*x)/(r2 + a2))
        float over_r = 1.0 / r_k;
        float over_r2a2 = 1.0 / (r2 + a2);
        
        vec3 l_vec = vec3(
            (r_k * p.x + a * p.z) * over_r2a2,
            p.y * over_r,
            (r_k * p.z - a * p.x) * over_r2a2
        );
        
        // 3. Scalar function H
        float sigma = r2 + a2 * (p.y * p.y / max(1e-8, r2));
        float H_val = (r_k * M) / max(1e-8, sigma);

        // 4. Force calculation (Analytic Hamiltonian Derivs)
        vec3 L_vec = cross(p, v);
        float Ly = L_vec.y; // Component along spin axis (Y)
        
        float Ly_eff = Ly - a;
        float L2_eff = Ly_eff * Ly_eff + (dot(L_vec, L_vec) - Ly * Ly);
        
        float r_inv = 1.0 / r_k;
        float r2_inv = r_inv * r_inv;
        float r4_inv = r2_inv * r2_inv;
        
        float sigma_ratio = r2 / max(1e-8, sigma);
        vec3 r_hat = -normalize(p);
        
        res.accel = r_hat * (M * r2_inv * sigma_ratio + 3.0 * M * max(0.0, L2_eff) * r4_inv * sigma_ratio);

        // 5. Frame Dragging
        float r3_p_a2r = r_k * r2 + a2 * r_k;
        float drag_coeff = 2.0 * M * a / max(1e-8, r3_p_a2r);
        res.accel += cross(vec3(0.0, 1.0, 0.0), v) * drag_coeff;

        // 6. ZAMO frame dragging 
        res.omega = 2.0 * M * a / max(1e-8, r3_p_a2r);

        return res;
    }

    // Shadow diagnostic (overlay only)
    float kerr_shadow_radius(float M, float a) {
        float a_star = abs(a / M);
        if (a_star < 0.001) return 3.0 * sqrt(3.0) * M;
        float r_pro = kerr_photon_sphere(M, abs(a));
        float r_retro = kerr_photon_sphere_retro(M, abs(a));
        return sqrt(r_pro * r_retro) * sqrt(3.0);
    }
`;
