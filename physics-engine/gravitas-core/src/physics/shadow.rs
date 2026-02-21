//! Shadow boundary and lensing computations for Kerr black holes.
//!
//! Implements:
//! - Bardeen's critical curve: the exact parametric shadow boundary for
//!   spinning black holes as seen by a distant observer
//! - Lensing magnification factor from the Jacobian of the ray map
//!
//! # References
//!
//! - Bardeen, J. M. (1973). "Timelike and null geodesics in the Kerr metric"
//! - Chandrasekhar, S. (1983). "The Mathematical Theory of Black Holes"
//! - Gralla, Lupsasca & Marolf (2020). "Observational appearance of black holes"

use crate::metric::{Kerr, Metric};

// ============================================================================
// Bardeen critical curve (shadow boundary)
// ============================================================================

/// Parameters of the spherical photon orbit at radius r in Kerr spacetime.
///
/// For each radius r_ph in [r_ph^-, r_ph^+] (the prograde and retrograde
/// photon orbit radii), there exists a circular photon orbit with specific
/// conserved quantities (xi, eta).
///
/// xi = L_z / E  (impact parameter along spin axis)
/// eta = Q / E^2  (Carter constant normalized by energy)
struct CriticalOrbitParams {
    xi: f64,
    eta: f64,
}

/// Compute the critical impact parameters (xi, eta) for a spherical photon
/// orbit at radius r in Kerr spacetime.
///
/// From Bardeen (1973):
///   xi = -(r^3 - 3Mr^2 + a^2*r + a^2*M) / (a*(r - M))
///   eta = r^3*(4Ma^2 - r*(r-3M)^2) / (a^2*(r - M)^2)
fn critical_params(r: f64, m: f64, a: f64) -> CriticalOrbitParams {
    let r2 = r * r;
    let r3 = r2 * r;
    let a2 = a * a;

    let denom = a * (r - m);
    if denom.abs() < 1e-30 {
        return CriticalOrbitParams { xi: 0.0, eta: 0.0 };
    }

    let xi = -(r3 - 3.0 * m * r2 + a2 * r + a2 * m) / denom;

    let denom2 = a2 * (r - m) * (r - m);
    if denom2.abs() < 1e-30 {
        return CriticalOrbitParams { xi, eta: 0.0 };
    }

    let eta = r3 * (4.0 * m * a2 - r * (r - 3.0 * m).powi(2)) / denom2;

    CriticalOrbitParams { xi, eta }
}

/// Compute the Bardeen critical curve (shadow boundary) for a Kerr black hole.
///
/// The shadow, as seen by a distant observer at inclination `theta_obs`,
/// is the locus of points (alpha, beta) on the observer's sky where:
///
///   alpha = -xi / sin(theta_obs)
///   beta  = +/- sqrt(eta + a^2*cos^2(theta_obs) - xi^2*cot^2(theta_obs))
///
/// The curve is parametrized by the radius r of the corresponding spherical
/// photon orbit, which ranges from r_ph^- (prograde) to r_ph^+ (retrograde).
///
/// # Arguments
/// - `bh` -- Kerr black hole
/// - `theta_obs` -- Observer inclination angle (0 = pole, pi/2 = equator)
/// - `n_points` -- Number of points on the shadow boundary
///
/// # Returns
/// Vec of (alpha, beta) pairs in the observer's sky coordinates.
/// alpha is the apparent displacement perpendicular to the projected spin axis.
/// beta is the apparent displacement along the projected spin axis.
pub fn bardeen_shadow(bh: &Kerr, theta_obs: f64, n_points: usize) -> Vec<(f64, f64)> {
    let m = bh.mass();
    let a = bh.a();
    let sin_obs = theta_obs.sin();
    let cos_obs = theta_obs.cos();

    // Schwarzschild special case (a=0): shadow is a perfect circle
    // at b_crit = 3*sqrt(3)*M. The Bardeen formula degenerates here
    // because xi and eta involve division by a.
    if a.abs() < 1e-10 {
        let radius = schwarzschild_shadow_radius(m);
        return (0..n_points)
            .map(|i| {
                let phi = 2.0 * std::f64::consts::PI * i as f64 / n_points as f64;
                (radius * phi.cos(), radius * phi.sin())
            })
            .collect();
    }

    if sin_obs.abs() < 1e-10 {
        // On-axis observer: shadow is a circle
        let r_ph = bh.photon_sphere();
        let params = critical_params(r_ph, m, a);
        let radius = (params.eta + a * a).max(0.0).sqrt();
        return (0..n_points)
            .map(|i| {
                let phi = 2.0 * std::f64::consts::PI * i as f64 / n_points as f64;
                (radius * phi.cos(), radius * phi.sin())
            })
            .collect();
    }

    // Photon orbit radius range
    // Prograde (inner): r_ph^- = 2M[1 + cos(2/3 arccos(-a/M))]
    // Retrograde (outer): r_ph^+ = 2M[1 + cos(2/3 arccos(a/M))]
    let a_star = a / m;
    let r_ph_pro = 2.0 * m * (1.0 + ((2.0 / 3.0) * (-a_star).acos()).cos());
    let r_ph_retro = 2.0 * m * (1.0 + ((2.0 / 3.0) * a_star.acos()).cos());

    let mut points = Vec::with_capacity(2 * n_points);

    // Sweep from prograde to retrograde
    for i in 0..n_points {
        let t = i as f64 / (n_points - 1).max(1) as f64;
        let r = r_ph_pro + t * (r_ph_retro - r_ph_pro);

        let params = critical_params(r, m, a);
        let alpha = -params.xi / sin_obs;

        let beta_sq = params.eta + a * a * cos_obs * cos_obs
            - params.xi * params.xi * cos_obs * cos_obs / (sin_obs * sin_obs);

        if beta_sq >= 0.0 {
            let beta = beta_sq.sqrt();
            points.push((alpha, beta));
            points.push((alpha, -beta)); // Mirror across equator
        }
    }

    // Sort by angle for a clean boundary
    points.sort_by(|a, b| {
        let angle_a = a.1.atan2(a.0);
        let angle_b = b.1.atan2(b.0);
        angle_a.partial_cmp(&angle_b).unwrap()
    });

    points
}

/// Schwarzschild shadow radius (a=0 special case).
///
/// For a Schwarzschild black hole, the shadow is a circle with radius
///   b_crit = 3*sqrt(3)*M  ~  5.196*M
///
/// This is the critical impact parameter.
pub fn schwarzschild_shadow_radius(mass: f64) -> f64 {
    3.0 * 3.0_f64.sqrt() * mass
}

// ============================================================================
// Lensing magnification
// ============================================================================

/// Compute the gravitational lensing magnification factor for a ray.
///
/// The magnification is the inverse of the Jacobian determinant of the
/// lens mapping from source to image plane:
///
///   mu = 1 / |det(J)|
///
/// where J = d(beta)/d(theta) maps observed angles to source angles.
///
/// For practical computation, we use the finite-difference approximation:
/// shoot 4 neighboring rays and compute the area ratio.
///
/// # Arguments
/// - `solid_angle_source` -- Solid angle subtended by the source
/// - `solid_angle_image` -- Solid angle subtended by the image
///
/// # Returns
/// The magnification factor mu >= 1. High magnification occurs near
/// the Einstein ring and caustic crossings.
pub fn magnification(solid_angle_source: f64, solid_angle_image: f64) -> f64 {
    if solid_angle_image.abs() < 1e-30 {
        return 1.0;
    }
    (solid_angle_source / solid_angle_image).abs().max(1.0)
}

/// Approximate lensing magnification for a point source at angular position
/// theta from the black hole, assuming Schwarzschild geometry.
///
/// mu = u / (u^2 - 1)^{1/2}
///
/// where u = theta / theta_E and theta_E is the Einstein angle.
///
/// # Arguments
/// - `theta` -- Angular position of the source (radians)
/// - `theta_einstein` -- Einstein ring angular radius (radians)
pub fn magnification_point_lens(theta: f64, theta_einstein: f64) -> f64 {
    if theta_einstein <= 0.0 {
        return 1.0;
    }
    let u = theta / theta_einstein;
    let u2 = u * u;
    let denom = (u2 - 1.0).abs().max(1e-6).sqrt();
    (u2 + 2.0) / (u * denom * (u2 + 4.0).sqrt().max(1e-6))
        .max(1.0)
}

/// Einstein ring angular radius for a Schwarzschild black hole.
///
/// theta_E = sqrt(4GM / (c^2 * D_L)) in physical units.
/// In geometric units: theta_E = sqrt(4M / D_L).
pub fn einstein_angle(mass: f64, distance: f64) -> f64 {
    if distance <= 0.0 {
        return 0.0;
    }
    (4.0 * mass / distance).sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schwarzschild_shadow_is_circle() {
        let bh = Kerr::new(1.0, 0.0);
        let shadow = bardeen_shadow(&bh, std::f64::consts::FRAC_PI_2, 100);

        // For Schwarzschild, all points should be at the same radius
        let expected_r = schwarzschild_shadow_radius(1.0);
        for &(alpha, beta) in &shadow {
            let r = (alpha * alpha + beta * beta).sqrt();
            assert!(
                (r - expected_r).abs() < 0.2,
                "Schwarzschild shadow should be circular at r={:.3}, got point at r={:.3}",
                expected_r, r
            );
        }
    }

    #[test]
    fn test_kerr_shadow_is_asymmetric() {
        let bh = Kerr::new(1.0, 0.9);
        let shadow = bardeen_shadow(&bh, std::f64::consts::FRAC_PI_2, 100);

        // For spinning BH at equatorial inclination, shadow is asymmetric
        // The prograde side (alpha < 0 for a > 0) extends further
        let alphas: Vec<f64> = shadow.iter().map(|p| p.0).collect();
        let min_alpha = alphas.iter().cloned().fold(f64::INFINITY, f64::min);
        let max_alpha = alphas.iter().cloned().fold(f64::NEG_INFINITY, f64::max);

        // Shadow should NOT be symmetric
        assert!(
            (min_alpha.abs() - max_alpha.abs()).abs() > 0.1,
            "Kerr shadow should be asymmetric: alpha in [{:.3}, {:.3}]",
            min_alpha, max_alpha
        );
    }

    #[test]
    fn test_shadow_shrinks_with_spin() {
        let bh0 = Kerr::new(1.0, 0.0);
        let bh9 = Kerr::new(1.0, 0.9);

        let shadow0 = bardeen_shadow(&bh0, std::f64::consts::FRAC_PI_2, 100);
        let shadow9 = bardeen_shadow(&bh9, std::f64::consts::FRAC_PI_2, 100);

        // Compute average "size" of each shadow
        let avg_r0: f64 = shadow0.iter()
            .map(|p| (p.0 * p.0 + p.1 * p.1).sqrt())
            .sum::<f64>() / shadow0.len() as f64;
        let avg_r9: f64 = shadow9.iter()
            .map(|p| (p.0 * p.0 + p.1 * p.1).sqrt())
            .sum::<f64>() / shadow9.len() as f64;

        assert!(
            avg_r9 < avg_r0,
            "Spinning BH shadow should be smaller: r9={:.3} < r0={:.3}",
            avg_r9, avg_r0
        );
    }

    #[test]
    fn test_einstein_angle_scaling() {
        let theta1 = einstein_angle(1.0, 100.0);
        let theta2 = einstein_angle(1.0, 400.0);
        // theta_E ~ 1/sqrt(D), so doubling D should halve theta
        assert!(
            (theta1 / theta2 - 2.0).abs() < 0.01,
            "Einstein angle should scale as 1/sqrt(D)"
        );
    }
}
