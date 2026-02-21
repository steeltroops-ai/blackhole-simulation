/// Novikov-Thorne Thin Accretion Disk Model
///
/// Implements temperature profiles and lookup table generation.
use crate::kerr;

/// Calculate disk temperature at radius r
/// Currently uses a simplified Newtonian + Relativistic correction model
/// Full GR flux model to be implemented in Phase 2.
pub fn temperature(r: f64, mass: f64, spin: f64, _m_dot: f64) -> f64 {
    let rs = 2.0 * mass;
    if r <= rs {
        return 0.0;
    } // Inside Horizon (approx)

    // Simplification: T ~ r^(-3/4) * (1 - sqrt(rin/r))^(1/4)
    let rin = kerr::isco(mass, spin, true); // Assume prograde

    if r < rin {
        return 0.0;
    } // Inside ISCO: Plunge region has no stable emission

    let base_temp = 1e7; // Kelvin scale factor
    let r_norm = r / mass;

    let factor = (rin / r).sqrt();
    let term = 1.0 - factor;

    if term <= 0.0 {
        return 0.0;
    }

    base_temp * (r_norm.powf(-0.75)) * term.powf(0.25)
}

/// Generate a lookup table for disk temperature
/// Maps radius [rin, rout] to normalized temperature [0.0, 1.0]
pub fn generate_lut(mass: f64, spin: f64, width: usize) -> Vec<f32> {
    let mut buffer = Vec::with_capacity(width);
    let rin = kerr::isco(mass, spin, true);
    let rout = 50.0 * mass; // Max disk extent

    for i in 0..width {
        let t = i as f64 / (width - 1) as f64;
        let r = rin + t * (rout - rin);

        let temp = temperature(r, mass, spin, 1.0); // m_dot = 1.0
        buffer.push(temp as f32);
    }

    buffer
}
