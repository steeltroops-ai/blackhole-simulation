#![allow(dead_code)]
/// Kerr Metric Calculations
///
/// Implements exact solutions for event horizons, photon spheres, and ISCO
/// based on Bardeen, Press & Teukolsky (1972).
// use crate::constants::*;

/// Calculate Event Horizon Radius (r+)
/// Returns: M + sqrt(M^2 - a^2)
pub fn event_horizon(mass: f64, spin: f64) -> f64 {
    let a_star = spin.clamp(-1.0, 1.0);
    // Geometric spin a = J/M = a* * M
    let a = a_star * mass;
    let disc = mass * mass - a * a;
    if disc < 0.0 {
        mass // Should not happen with clamped spin, but fallback
    } else {
        mass + disc.sqrt()
    }
}

/// Calculate Photon Sphere Radius
/// Prograde circular orbit for photons
pub fn photon_sphere(mass: f64, spin: f64) -> f64 {
    let a_star = spin.clamp(-1.0, 1.0);
    // r_ph = 2M * [1 + cos(2/3 * arccos(-a*))]
    let term = (2.0 / 3.0) * (-a_star).acos();
    2.0 * mass * (1.0 + term.cos())
}

/// Calculate ISCO (Innermost Stable Circular Orbit)
/// Using the Bardeen-Press-Teukolsky formula
pub fn isco(mass: f64, spin: f64, prograde: bool) -> f64 {
    let a_star = spin.clamp(-1.0, 1.0);

    // Schwarzschild limit check (a -> 0)
    if a_star.abs() < 1e-6 {
        return mass * 6.0;
    }

    let a2 = a_star * a_star;
    let z1 = 1.0
        + (1.0 - a2).powf(1.0 / 3.0)
            * ((1.0 + a_star).powf(1.0 / 3.0) + (1.0 - a_star).powf(1.0 / 3.0));
    let z2 = (3.0 * a2 + z1 * z1).sqrt();

    let sign = if prograde { -1.0 } else { 1.0 };

    let disc = (3.0 - z1) * (3.0 + z1 + 2.0 * z2);
    let root = if disc < 0.0 { 0.0 } else { disc.sqrt() };

    mass * (3.0 + z2 + sign * root)
}

/// Calculation Angular Velocity of Frame Dragging (omega)
/// omega = 2Ma / (r^3 + a^2 r + 2Ma^2) note: this is approx, full kerr is:
/// omega = -g_tphi / g_phiphi = 2 * M * r * a / A
/// Where A = (r^2 + a^2)^2 - Delta * a^2 * sin^2(theta)
/// At equator (theta=pi/2):
/// omega = 2Ma / (r^3 + a^2r + 2Ma^2)
pub fn frame_dragging_equator(r: f64, mass: f64, spin: f64) -> f64 {
    let a = spin * mass;
    let num = 2.0 * mass * a;
    let den = r.powi(3) + a.powi(2) * r + 2.0 * mass * a.powi(2);
    if den == 0.0 {
        0.0
    } else {
        num / den
    }
}

/// Calculate the full 4x4 Kerr Metric Tensor in Boyer-Lindquist coordinates (t, r, theta, phi)
/// Returns a flattened [f64; 16] array (row-major) representing g_mu_nu
pub fn metric_tensor_bl(r: f64, theta: f64, mass: f64, spin: f64) -> [f64; 16] {
    let a = spin * mass;
    let r2 = r * r;
    let a2 = a * a;
    let cos_theta = theta.cos();
    let sin_theta = theta.sin();
    let sin2 = sin_theta * sin_theta;
    let cos2 = cos_theta * cos_theta;

    let sigma = r2 + a2 * cos2;
    let delta = r2 - 2.0 * mass * r + a2;

    // Components
    let g_tt = -(1.0 - (2.0 * mass * r) / sigma);
    let g_rr = sigma / delta;
    let g_thth = sigma;
    let g_phph = (r2 + a2 + (2.0 * mass * r * a2 * sin2) / sigma) * sin2;
    let g_tph = -(2.0 * mass * r * a * sin2) / sigma;

    // Flattened 4x4 Matrix (Row-Major: t, r, theta, phi)
    [
        g_tt,  0.0,   0.0,   g_tph,
        0.0,   g_rr,  0.0,   0.0,
        0.0,   0.0,   g_thth, 0.0,
        g_tph, 0.0,   0.0,   g_phph,
    ]
}

/// Calculate the Inverse Kerr Metric Tensor (Contravariant g^mu_nu)
/// Returns a flattened [f64; 16] array (row-major)
pub fn metric_inverse_bl(r: f64, theta: f64, mass: f64, spin: f64) -> [f64; 16] {
    let a = spin * mass;
    let r2 = r * r;
    let a2 = a * a;
    let cos_theta = theta.cos();
    let sin_theta = theta.sin();
    let sin2 = sin_theta * sin_theta;
    let cos2 = cos_theta * cos_theta;

    let sigma = r2 + a2 * cos2;
    let delta = r2 - 2.0 * mass * r + a2;

    // Components
    // g^tt = -(Sigma(r^2+a^2) + 2Mra^2sin^2theta) / (Delta * Sigma)
    let g_tt = -((sigma * (r2 + a2) + 2.0 * mass * r * a2 * sin2) / (delta * sigma));
    
    // g^rr = Delta / Sigma
    let g_rr = delta / sigma;
    
    // g^thth = 1 / Sigma
    let g_thth = 1.0 / sigma;
    
    // g^phph = (Delta - a^2sin^2theta) / (Delta * Sigma * sin^2theta)
    // Avoid division by zero at poles (sin_theta = 0)
    let g_phph = if sin2 < 1e-9 {
        0.0 // Pole singularity handling
    } else {
        (delta - a2 * sin2) / (delta * sigma * sin2)
    };

    // g^tph = -2Mra / (Delta * Sigma)
    let g_tph = -(2.0 * mass * r * a) / (delta * sigma);

    // Flattened 4x4 Matrix (Row-Major: t, r, theta, phi)
    [
        g_tt,  0.0,   0.0,   g_tph,
        0.0,   g_rr,  0.0,   0.0,
        0.0,   0.0,   g_thth, 0.0,
        g_tph, 0.0,   0.0,   g_phph,
    ]
}
