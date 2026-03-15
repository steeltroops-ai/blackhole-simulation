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

    struct KerrAccelResult {
        vec3 accel;
        float r_k;          // Kerr radial coordinate
        float omega;         // Frame-dragging angular velocity
    };

    KerrAccelResult kerr_geodesic_accel(vec3 p, vec3 v, float M, float a) {
        KerrAccelResult res;
        float a2 = a * a;

        // 1. Kerr radial coordinate
        float rho2 = dot(p, p);
        float diff = rho2 - a2;
        float disc = diff * diff + 4.0 * a2 * p.y * p.y;
        float r2 = 0.5 * (diff + sqrt(max(0.0, disc)));
        float r_k = sqrt(max(1e-8, r2));
        res.r_k = r_k;

        float r_inv = 1.0 / r_k;
        float r2_inv = r_inv * r_inv;
        float r4_inv = r2_inv * r2_inv;

        // 2. Sigma = r^2 + a^2 cos^2(theta)
        float cos_th = p.y * r_inv;
        float sigma = r2 + a2 * cos_th * cos_th;
        float sigma_inv = 1.0 / max(1e-8, sigma);

        // 3. Angular momentum with spin-orbit coupling
        vec3 L_vec = cross(p, v);
        float L2 = dot(L_vec, L_vec);
        float Lz = L_vec.y;  // Projection onto spin axis

        // Kerr effective angular momentum:
        //   In Kerr, the angular momentum barrier is modified by spin.
        //   L_eff^2 = (Lz - a)^2 + (L^2 - Lz^2)  [= (Lz-a)^2 + Q for equatorial]
        //   This makes prograde orbits (Lz > 0, same dir as spin) "weaker"
        //   and retrograde orbits (Lz < 0) "stronger" -- producing the D-shape.
        float Lz_eff = Lz - a;
        float L2_eff = Lz_eff * Lz_eff + (L2 - Lz * Lz);

        // 4. Radial acceleration: -(M/r^2 + 3M*L_eff^2/r^4) * r_hat
        //    Direction: toward the BH center. Use -normalize(p) for radial inward.
        //    The 3M*L^2/r^4 term is the EXACT GR correction for null geodesics
        //    (from the Darwin effective potential, not an approximation).
        //    Using Sigma-based denominator for Kerr oblate geometry.
        float r_k2 = r_k * r_k;
        float sigma_ratio = r_k2 * sigma_inv;  // r^2/sigma <= 1, accounts for oblate geometry
        vec3 r_hat = -normalize(p);

        res.accel = r_hat * (M * r2_inv * sigma_ratio + 3.0 * M * max(0.0, L2_eff) * r4_inv * sigma_ratio);

        // 5. Gravito-magnetic force (frame-dragging)
        //    F_drag = 2Ma * (spin_axis x v) / (r^3 + a^2*r)
        //    This is the force that creates the D-shape shadow asymmetry.
        //    - Prograde rays (v aligned with spin) get dragged inward
        //    - Retrograde rays get pushed outward
        float signA = sign(a);
        if (signA == 0.0) signA = 1.0;
        vec3 spin_axis = vec3(0.0, signA, 0.0);
        float r3_p_a2r = r_k * r_k2 + a2 * r_k;
        float drag_coeff = 2.0 * M * abs(a) / max(1e-8, r3_p_a2r);
        res.accel += cross(spin_axis, v) * drag_coeff;

        // 6. ZAMO angular velocity for velocity frame rotation
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
