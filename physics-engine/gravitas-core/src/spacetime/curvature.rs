//! Curvature invariants for spacetime visualization.
//!
//! Curvature invariants are coordinate-independent measures of how strongly
//! spacetime is curved at a given point.

/// Kretschner scalar for the Kerr metric.
///
/// K = R_{abcd} R^{abcd}
///
/// For Kerr: K = 48 M^2 (r^6 - 15 r^4 a^2 cos^2(theta) + 15 r^2 a^4 cos^4(theta) - a^6 cos^6(theta)) / Sigma^6
///
/// This is a coordinate-invariant measure of tidal forces.
pub fn kretschner_kerr(r: f64, theta: f64, mass: f64, spin: f64) -> f64 {
    let a = spin * mass;
    let r2 = r * r;
    let a2 = a * a;
    let cos_theta = theta.cos();
    let cos2 = cos_theta * cos_theta;
    let cos4 = cos2 * cos2;
    let cos6 = cos4 * cos2;
    let r4 = r2 * r2;
    let r6 = r4 * r2;
    let a4 = a2 * a2;
    let a6 = a4 * a2;

    let sigma = r2 + a2 * cos2;
    let sigma6 = sigma.powi(6);

    if sigma6 < 1e-30 {
        return f64::INFINITY; // Singularity
    }

    let numerator = r6 - 15.0 * r4 * a2 * cos2 + 15.0 * r2 * a4 * cos4 - a6 * cos6;

    48.0 * mass * mass * numerator / sigma6
}

/// Kretschner scalar for Schwarzschild (simplified from Kerr with a=0).
///
/// K = 48 M^2 / r^6
pub fn kretschner_schwarzschild(r: f64, mass: f64) -> f64 {
    48.0 * mass * mass / r.powi(6)
}

/// Generate a scalar field of curvature values for visualization.
///
/// Returns Vec<(r, theta, K)> tuples.
pub fn curvature_field(
    mass: f64,
    spin: f64,
    r_min: f64,
    r_max: f64,
    n_radial: usize,
    n_polar: usize,
) -> Vec<(f64, f64, f64)> {
    let mut field = Vec::with_capacity(n_radial * n_polar);

    for i in 0..n_radial {
        let r = r_min + (r_max - r_min) * i as f64 / (n_radial - 1) as f64;
        for j in 0..n_polar {
            let theta = 0.1 + (std::f64::consts::PI - 0.2) * j as f64 / (n_polar - 1) as f64;
            let k = kretschner_kerr(r, theta, mass, spin);
            field.push((r, theta, k));
        }
    }

    field
}
