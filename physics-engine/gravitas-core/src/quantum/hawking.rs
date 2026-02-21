//! Hawking radiation temperature.

use crate::constants::{SI_HBAR, SI_C, SI_KB};

/// Hawking temperature for a Kerr black hole.
///
/// T_H = (hbar * c^3) / (8 pi G M k_B) * (r+ - r-) / (r+^2 + a^2)
///
/// For the Schwarzschild limit (a=0): T_H = hbar c^3 / (8 pi G M k_B)
///
/// # Arguments
/// - `mass_kg` -- Mass in kilograms (SI)
/// - `spin` -- Dimensionless spin a* in [-1, 1]
pub fn hawking_temperature(mass_kg: f64, spin: f64) -> f64 {
    let g_si = 6.674_30e-11;
    let a_star = spin.clamp(-1.0, 1.0);

    // In geometric units: M = 1, a = a*
    // r_+ = 1 + sqrt(1 - a*^2),  r_- = 1 - sqrt(1 - a*^2)
    let disc = (1.0 - a_star * a_star).max(0.0).sqrt();
    let r_plus = 1.0 + disc;
    let r_minus = 1.0 - disc;

    // Surface gravity kappa = (r+ - r-) / (2 * (r+^2 + a*^2))
    let kappa = (r_plus - r_minus) / (2.0 * (r_plus * r_plus + a_star * a_star));

    // T_H = hbar * kappa_SI / (2 pi k_B)
    // kappa_SI = kappa * c^3 / (G * M)
    let kappa_si = kappa * SI_C * SI_C * SI_C / (g_si * mass_kg);

    SI_HBAR * kappa_si / (2.0 * std::f64::consts::PI * SI_KB)
}
