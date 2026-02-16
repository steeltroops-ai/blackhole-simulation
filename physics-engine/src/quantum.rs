/// Quantum Physics Subsystem
/// Implements semi-classical effects in strong-field gravity.

use crate::constants::{G, C, HBAR, KB, H};

/// Calculate Hawking Temperature for a Kerr Black Hole
/// T = (hbar * c^3) / (8 * pi * G * M * k_B) * [ ... rotation factor ... ]
pub fn hawking_temperature(mass: f64, spin: f64) -> f64 {
    let mass_kg = mass * 1.989e30; // Solar masses to kg
    let a_star = spin.abs();
    
    // Schwarzschild Temperature (Base line)
    let t_schwarz = (HBAR * C.powi(3)) / (8.0 * std::f64::consts::PI * G * mass_kg * KB);
    
    // Kerr Correction Factor: f(a) = sqrt(1-a^2) / (1 + sqrt(1-a^2))
    let surface_gravity_correction = (1.0 - a_star.powi(2)).sqrt() / (1.0 + (1.0 - a_star.powi(2)).sqrt());
    
    t_schwarz * surface_gravity_correction
}

/// Blackbody Spectral Radiance (Planck's Law)
/// Used for Hawking radiation and accretion disk thermal emission.
pub fn planck_radiance(wavelength: f64, temperature: f64) -> f64 {
    if temperature <= 0.0 { return 0.0; }
    
    let a = 2.0 * H * C.powi(2);
    let b = (H * C) / (wavelength * KB * temperature);
    
    a / (wavelength.powi(5) * (b.exp() - 1.0))
}

/// Stochastic Metric Fluctuations (Planck Scale Foam)
/// Returns a perturbation factor for g_mu_nu components near the singularity.
pub fn planck_scale_fluctuation(r: f64, mass: f64, seed: u64) -> f64 {
    let r_planck = 1.616e-35;
    let r_event_horizon = 2.0 * mass;
    
    // Fluctuations grow exponentially as we approach the singularity (r -> 0)
    // or the "firewall" (r -> r_s)
    let proximity = (r_event_horizon / r).max(1.0);
    let scale = (proximity - 1.0).powi(2) * (r_planck / (mass + 1e-20));
    
    // Simple deterministic hash for "quantum glimmer"
    let mut x = seed;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    
    scale * ((x as f64) / (u64::MAX as f64) - 0.5)
}
