//! Novikov-Thorne thin accretion disk model (Page & Thorne 1974).
//!
//! Implements the FULL relativistic flux formula for a geometrically thin,
//! optically thick accretion disk in Kerr spacetime. This replaces the
//! simplified T ~ r^{-3/4} approximation with the exact GR result.
//!
//! # References
//!
//! - Novikov, I. D. & Thorne, K. S. (1973). "Astrophysics of Black Holes"
//! - Page, D. N. & Thorne, K. S. (1974). "Disk-Accretion onto a Black Hole"
//! - Bardeen, Press & Teukolsky (1972). "ISCO and Circular Orbits"

use crate::metric::{Kerr, Metric, Orbit};

// ============================================================================
// Circular orbit quantities in Kerr spacetime (equatorial, Boyer-Lindquist)
// ============================================================================

/// Specific energy E of a circular equatorial orbit at radius r.
///
/// E = (1 - 2M/r +/- a*sqrt(M)/r^{3/2}) / sqrt(1 - 3M/r +/- 2a*sqrt(M)/r^{3/2})
///
/// Sign: upper for prograde, lower for retrograde.
fn specific_energy(r: f64, m: f64, a: f64) -> f64 {
    let rm = r / m;
    let sqrt_mr = (m / r).sqrt();
    let am = a / m;

    let num = 1.0 - 2.0 / rm + am * sqrt_mr;
    let den_sq = 1.0 - 3.0 / rm + 2.0 * am * sqrt_mr;

    if den_sq <= 0.0 {
        return 1.0; // Inside ISCO, return rest mass energy
    }
    num / den_sq.sqrt()
}

/// Specific angular momentum L_z of a circular equatorial orbit at radius r.
///
/// L_z = +/- sqrt(M) * r^{1/2} * (1 - 2a*sqrt(M)/r^{3/2} + a^2/r^2)
///       / sqrt(1 - 3M/r +/- 2a*sqrt(M)/r^{3/2})
///
/// Sign: + for prograde, - for retrograde.
fn specific_angular_momentum(r: f64, m: f64, a: f64) -> f64 {
    let rm = r / m;
    let sqrt_mr = (m / r).sqrt();
    let am = a / m;
    let a2r2 = (a / r).powi(2);

    let num = m.sqrt() * r.sqrt() * (1.0 - 2.0 * am * sqrt_mr + a2r2);
    let den_sq = 1.0 - 3.0 / rm + 2.0 * am * sqrt_mr;

    if den_sq <= 0.0 {
        return 0.0;
    }
    num / den_sq.sqrt()
}

/// Angular velocity Omega of a circular equatorial orbit.
///
/// Omega = sqrt(M) / (r^{3/2} + a*sqrt(M))
fn angular_velocity(r: f64, m: f64, a: f64) -> f64 {
    m.sqrt() / (r.powf(1.5) + a * m.sqrt())
}

// ============================================================================
// Full Page-Thorne (Novikov-Thorne) relativistic flux
// ============================================================================

/// Compute the Page-Thorne radiative flux F(r) for a Novikov-Thorne disk.
///
/// The flux per unit proper area of the disk is:
///
///   F(r) = -(M_dot / 4 pi) * (Omega,r / (E - Omega*Lz)^2)
///          * integral_{r_isco}^{r} (E - Omega*Lz) * Lz,r  dr'
///
/// where E, Lz, Omega are the specific energy, angular momentum, and angular
/// velocity of circular equatorial geodesics. The subscript ,r denotes d/dr.
///
/// This function evaluates the integral numerically using Simpson's rule.
///
/// # Arguments
/// - `r` -- Radius at which to evaluate the flux (must be > r_isco)
/// - `bh` -- Kerr black hole
/// - `m_dot` -- Mass accretion rate (sets overall scale)
///
/// # Returns
/// The dimensionless flux F(r) * 4pi / M_dot. Multiply by M_dot/(4 pi) to get
/// physical flux.
pub fn page_thorne_flux(r: f64, bh: &Kerr, m_dot: f64) -> f64 {
    let m = bh.mass();
    let a = bh.a();
    let r_isco = bh.isco(Orbit::Prograde);

    if r <= r_isco {
        return 0.0;
    }

    // Quantities at radius r
    let e_r = specific_energy(r, m, a);
    let lz_r = specific_angular_momentum(r, m, a);
    let omega_r = angular_velocity(r, m, a);

    let denom = e_r - omega_r * lz_r;
    if denom.abs() < 1e-30 {
        return 0.0;
    }

    // Numerical derivative: dOmega/dr at r
    let dr = r * 1e-5;
    let omega_dr = (angular_velocity(r + dr, m, a) - angular_velocity(r - dr, m, a)) / (2.0 * dr);

    // Numerical integration of the Page-Thorne integrand from r_isco to r
    // using composite Simpson's rule with 200 panels
    let n = 200usize;
    let h = (r - r_isco) / n as f64;

    if h <= 0.0 {
        return 0.0;
    }

    let integrand = |rp: f64| -> f64 {
        let ep = specific_energy(rp, m, a);
        let lzp = specific_angular_momentum(rp, m, a);
        let omp = angular_velocity(rp, m, a);

        // dLz/dr at r'
        let drp = rp * 1e-5;
        let dlz_dr = (specific_angular_momentum(rp + drp, m, a)
            - specific_angular_momentum(rp - drp, m, a))
            / (2.0 * drp);

        (ep - omp * lzp) * dlz_dr
    };

    // Simpson's 1/3 rule
    let mut sum = integrand(r_isco) + integrand(r);
    for i in 1..n {
        let rp = r_isco + i as f64 * h;
        let weight = if i % 2 == 0 { 2.0 } else { 4.0 };
        sum += weight * integrand(rp);
    }
    let integral = sum * h / 3.0;

    // F(r) = -(M_dot / 4pi) * (dOmega/dr) / (E - Omega*Lz)^2 * integral
    // We return F * 4pi / M_dot (dimensionless), then scale by m_dot
    let flux = -(omega_dr / (denom * denom)) * integral;

    // flux should be positive for physical emission
    flux.abs() * m_dot
}

/// Temperature profile from the full Page-Thorne flux.
///
/// T(r) = [F(r) / sigma_SB]^{1/4}
///
/// We use an effective sigma_SB = 1 in geometric units and scale the result
/// to produce temperatures in the range ~10^6 - 10^8 K typical of stellar-mass
/// black hole accretion disks.
pub fn temperature(r: f64, bh: &Kerr, m_dot: f64) -> f64 {
    let flux = page_thorne_flux(r, bh, m_dot);
    if flux <= 0.0 {
        return 0.0;
    }

    // Scale to physical temperature
    // T_max ~ 10^7 K for M_dot ~ 1 (Eddington), M ~ 10 M_sun
    let t_scale = 1e7 * m_dot.powf(0.25);
    t_scale * flux.powf(0.25)
}

/// Generate a lookup table of disk temperature from r_isco to r_outer.
///
/// Returns a Vec<f32> of normalized temperatures suitable for GPU texture upload.
pub fn generate_temperature_lut(bh: &Kerr, width: usize) -> Vec<f32> {
    let rin = bh.isco(Orbit::Prograde);
    let rout = 50.0 * bh.mass();
    let mut buffer = Vec::with_capacity(width);

    // Find max temperature for normalization
    let mut max_temp: f64 = 0.0;
    let temps: Vec<f64> = (0..width)
        .map(|i| {
            let t = i as f64 / (width - 1).max(1) as f64;
            let r = rin + t * (rout - rin);
            let temp = temperature(r, bh, 1.0);
            if temp > max_temp {
                max_temp = temp;
            }
            temp
        })
        .collect();

    // Normalize to [0, 1] range for GPU texture
    let norm = if max_temp > 0.0 { 1.0 / max_temp } else { 1.0 };
    for &t in &temps {
        buffer.push((t * norm) as f32);
    }

    buffer
}

/// Compute the flux-weighted effective temperature at multiple radii.
///
/// Returns `(radii, temperatures)` as parallel vectors, useful for plotting.
pub fn temperature_profile(bh: &Kerr, n_points: usize) -> (Vec<f64>, Vec<f64>) {
    let rin = bh.isco(Orbit::Prograde);
    let rout = 50.0 * bh.mass();
    let mut radii = Vec::with_capacity(n_points);
    let mut temps = Vec::with_capacity(n_points);

    for i in 0..n_points {
        let t = i as f64 / (n_points - 1).max(1) as f64;
        let r = rin + t * (rout - rin);
        radii.push(r);
        temps.push(temperature(r, bh, 1.0));
    }

    (radii, temps)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_flux_zero_at_isco() {
        let bh = Kerr::new(1.0, 0.0);
        let isco = bh.isco(Orbit::Prograde);
        let f = page_thorne_flux(isco, &bh, 1.0);
        assert!(f.abs() < 1e-10, "Flux at ISCO should be zero (no-torque BC), got {}", f);
    }

    #[test]
    fn test_flux_positive_outside_isco() {
        let bh = Kerr::new(1.0, 0.0);
        let isco = bh.isco(Orbit::Prograde);
        let f = page_thorne_flux(isco * 1.5, &bh, 1.0);
        assert!(f > 0.0, "Flux should be positive outside ISCO, got {}", f);
    }

    #[test]
    fn test_flux_decays_at_large_r() {
        let bh = Kerr::new(1.0, 0.0);
        let f_near = page_thorne_flux(10.0, &bh, 1.0);
        let f_far = page_thorne_flux(40.0, &bh, 1.0);
        assert!(
            f_near > f_far,
            "Flux should decay with radius: F(10M)={} > F(40M)={}",
            f_near, f_far
        );
    }

    #[test]
    fn test_spinning_bh_has_higher_peak_flux() {
        let bh_schwarz = Kerr::new(1.0, 0.0);
        let bh_kerr = Kerr::new(1.0, 0.9);

        // Find peak flux for each by scanning
        let mut max_schwarz = 0.0_f64;
        let mut max_kerr = 0.0_f64;

        for i in 1..100 {
            let r_s = bh_schwarz.isco(Orbit::Prograde) + i as f64 * 0.2;
            let r_k = bh_kerr.isco(Orbit::Prograde) + i as f64 * 0.2;
            max_schwarz = max_schwarz.max(page_thorne_flux(r_s, &bh_schwarz, 1.0));
            max_kerr = max_kerr.max(page_thorne_flux(r_k, &bh_kerr, 1.0));
        }

        assert!(
            max_kerr > max_schwarz,
            "Spinning BH should have higher peak flux: Kerr={:.6} vs Schwarz={:.6}",
            max_kerr, max_schwarz
        );
    }

    #[test]
    fn test_temperature_profile_peaks_near_isco() {
        let bh = Kerr::new(1.0, 0.0);
        let isco = bh.isco(Orbit::Prograde);
        let (radii, temps) = temperature_profile(&bh, 200);

        // Find peak
        let (peak_idx, peak_temp) = temps.iter().enumerate()
            .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
            .unwrap();

        let peak_r = radii[peak_idx];

        // Page-Thorne flux peaks at r ~ 49/6 M ~ 8.2M for Schwarzschild,
        // which is ~1.36 * r_isco. Allow generous tolerance since the
        // numerical integral slightly shifts the peak.
        assert!(
            peak_r < isco * 3.0,
            "Temperature peak at r={:.2} should be within 3x ISCO={:.2}",
            peak_r, isco
        );
        assert!(*peak_temp > 0.0, "Peak temperature should be positive");
    }
}
