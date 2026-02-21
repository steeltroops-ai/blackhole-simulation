//! Gravitational and Doppler redshift computations in Kerr spacetime.
//!
//! Implements the rigorous general-relativistic g-factor using the
//! emitter's 4-velocity for circular equatorial orbits in the Kerr metric.
//!
//! # References
//!
//! - Cunningham (1975). "The effects of redshifts and focusing on the spectrum
//!   of an accretion disk around a Kerr black hole"
//! - Luminet (1979). "Image of a spherical black hole with thin accretion disk"

/// Gravitational redshift factor for a STATIC observer at (r, theta) in Kerr.
///
/// g_static = sqrt(-g_{tt}) = sqrt(1 - 2Mr/Sigma)
///
/// For Schwarzschild (a=0, theta=pi/2): g = sqrt(1 - r_s/r)
pub fn gravitational_factor(r: f64, mass: f64) -> f64 {
    let rs = 2.0 * mass;
    if r <= rs {
        return 0.0;
    }
    (1.0 - rs / r).sqrt()
}

/// Relativistic Doppler factor (special relativistic).
///
/// delta = 1 / (gamma * (1 - beta * cos_theta))
///
/// # Arguments
/// - `beta` -- v/c of the emitter
/// - `cos_theta` -- cosine of angle between emitter velocity and line of sight
pub fn doppler_factor(beta: f64, cos_theta: f64) -> f64 {
    let gamma = 1.0 / (1.0 - beta * beta).max(1e-12).sqrt();
    1.0 / (gamma * (1.0 - beta * cos_theta))
}

/// Full general-relativistic g-factor for disk emission in Kerr spacetime.
///
/// The g-factor is the ratio of observed to emitted photon frequency:
///
///   g = nu_obs / nu_emit = (p_mu u^mu)_obs / (p_mu u^mu)_emit
///
/// For a distant observer at infinity: (p_mu u^mu)_obs = -p_t = E (photon energy)
///
/// For an emitter on a circular equatorial orbit:
///   u^t = 1 / sqrt(-g_tt - 2*Omega*g_tphi - Omega^2*g_phiphi)
///   u^phi = Omega * u^t
///   (p_mu u^mu)_emit = u^t * (p_t + Omega * p_phi) = u^t * (-E + Omega * Lz)
///
/// Therefore:
///   g = 1 / (u^t * (1 - lambda * Omega))
///
/// where lambda = Lz / E is the impact parameter of the photon relative to
/// the spin axis.
///
/// # Arguments
/// - `r` -- Emission radius
/// - `mass` -- Black hole mass M
/// - `spin` -- Dimensionless spin a*
/// - `lambda` -- Photon impact parameter Lz/E
///
/// # Returns
/// The g-factor. g > 1 for blueshifted (approaching) emission,
/// g < 1 for redshifted (receding) emission.
pub fn kerr_g_factor(r: f64, mass: f64, spin: f64, lambda: f64) -> f64 {
    let a = spin * mass;
    let r2 = r * r;
    let a2 = a * a;
    let m = mass;

    // Keplerian angular velocity
    let omega = m.sqrt() / (r.powf(1.5) + a * m.sqrt());

    // Metric components at equator (theta = pi/2, sin^2 = 1, cos^2 = 0)
    // Sigma = r^2 at equator
    let sigma = r2;
    let g_tt = -(1.0 - 2.0 * m * r / sigma);
    let g_tphi = -(2.0 * m * r * a) / sigma;
    let g_phiphi = r2 + a2 + 2.0 * m * r * a2 / sigma;

    // u^t for circular orbit
    let ut_denom = -g_tt - 2.0 * omega * g_tphi - omega * omega * g_phiphi;
    if ut_denom <= 0.0 {
        return 0.0; // Inside ISCO or at horizon
    }
    let ut = 1.0 / ut_denom.sqrt();

    // g = 1 / [u^t * (1 - lambda * Omega)]
    let factor = 1.0 - lambda * omega;
    if factor.abs() < 1e-30 {
        return 0.0;
    }

    1.0 / (ut * factor)
}

/// Combined g-factor using the approximate SR formula.
///
/// For cases where the full GR approach is not needed (e.g., large r):
///   g ~ g_grav * delta_doppler
///
/// This is the legacy interface kept for backward compatibility.
pub fn combined_g_factor(
    r: f64,
    mass: f64,
    spin: f64,
    cos_theta_obs: f64,
) -> f64 {
    let a = spin * mass;
    let omega = mass.sqrt() / (r.powf(1.5) + a * mass.sqrt());
    let v_orbital = omega * r;
    let beta = v_orbital.min(0.999);

    let grav = gravitational_factor(r, mass);
    let dop = doppler_factor(beta, cos_theta_obs);

    grav * dop
}

/// Observed intensity scaling from the g-factor.
///
/// For optically thick emission (blackbody):
///   I_obs = g^4 * I_emit  (Liouville's theorem for specific intensity)
///
/// For optically thin:
///   I_obs = g^3 * j_emit  (emissivity scaling)
///
/// # Arguments
/// - `g` -- The g-factor
/// - `optically_thick` -- If true, uses g^4 (blackbody). If false, uses g^3.
pub fn intensity_scaling(g: f64, optically_thick: bool) -> f64 {
    if optically_thick {
        g.powi(4)
    } else {
        g.powi(3)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_g_factor_at_infinity() {
        // At very large r, g -> 1 (flat spacetime, negligible orbital velocity)
        let g = kerr_g_factor(1000.0, 1.0, 0.0, 0.0);
        assert!(
            (g - 1.0).abs() < 0.01,
            "g-factor at r=1000M should be ~1.0, got {}",
            g
        );
    }

    #[test]
    fn test_g_factor_redshift_near_isco() {
        // Near ISCO, g < 1 for lambda=0 (gravitational redshift dominates)
        let g = kerr_g_factor(6.5, 1.0, 0.0, 0.0);
        assert!(
            g < 1.0 && g > 0.0,
            "g-factor near Schwarzschild ISCO should show redshift, got {}",
            g
        );
    }

    #[test]
    fn test_g_factor_blueshift_approaching() {
        // For approaching side (positive lambda), g > mid-value
        let g_approach = kerr_g_factor(10.0, 1.0, 0.0, 5.0);
        let g_recede = kerr_g_factor(10.0, 1.0, 0.0, -5.0);
        assert!(
            g_approach > g_recede,
            "Approaching side should be bluer: g+={}, g-={}",
            g_approach, g_recede
        );
    }
}
