//! Light cone tilt visualization.
//!
//! The light cone at each point in spacetime tilts toward the black hole,
//! eventually tipping past 45 degrees at the event horizon (meaning
//! the entire future of any particle is inside the horizon).

use crate::metric::Metric;

/// Light cone tilt angle at position (r, theta).
///
/// For a radial null ray (ds^2 = 0, dphi = dtheta = 0):
///   g_tt dt^2 + g_rr dr^2 + 2 g_tr dt dr = 0
///
/// The tilt angle alpha is defined as the angle between the local
/// "vertical" (time direction) and the edge of the light cone.
///
/// Returns the tilt angle in radians. At the horizon, this is PI/2.
pub fn light_cone_tilt<M: Metric>(metric: &M, r: f64, theta: f64) -> f64 {
    let g = metric.covariant(r, theta);
    let g_tt = g.get(0, 0);
    let g_rr = g.get(1, 1);
    let g_tr = g.get(0, 1); // Non-zero for Kerr-Schild

    // For diagonal metrics (Boyer-Lindquist): tan(alpha) = sqrt(-g_tt / g_rr)
    // For non-diagonal metrics, solve the null condition more carefully
    if g_tr.abs() < 1e-12 {
        // Diagonal case
        if g_tt >= 0.0 {
            return std::f64::consts::FRAC_PI_2; // Inside ergosphere/horizon
        }
        let ratio = (-g_tt / g_rr).max(0.0);
        ratio.sqrt().atan()
    } else {
        // Non-diagonal case (Kerr-Schild)
        // The light cone edges in (t, r) plane satisfy:
        // dr/dt = (-g_tr +/- sqrt(g_tr^2 - g_tt * g_rr)) / g_rr
        let disc = g_tr * g_tr - g_tt * g_rr;
        if disc < 0.0 {
            return std::f64::consts::FRAC_PI_2;
        }
        let sqrt_disc = disc.sqrt();
        let slope_out = (-g_tr + sqrt_disc) / g_rr;
        let slope_in = (-g_tr - sqrt_disc) / g_rr;

        // The tilt is the half-angle of the cone
        let half_opening = (slope_out - slope_in).abs() / 2.0;
        half_opening.atan()
    }
}

/// Generate a grid of light cone tilt angles for visualization.
///
/// Returns Vec<(r, theta, tilt_angle)> tuples.
pub fn tilt_field<M: Metric>(
    metric: &M,
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
            let tilt = light_cone_tilt(metric, r, theta);
            field.push((r, theta, tilt));
        }
    }

    field
}
