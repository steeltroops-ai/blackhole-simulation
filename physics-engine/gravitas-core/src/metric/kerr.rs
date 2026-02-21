//! Kerr spacetime metric for a rotating black hole.
//!
//! Implements the full Kerr solution in both Boyer-Lindquist and Kerr-Schild
//! coordinate systems. This is the primary metric used for astrophysical black holes.
//!
//! # References
//!
//! - Kerr, R. P. (1963). "Gravitational field of a spinning mass"
//! - Bardeen, Press & Teukolsky (1972). "Rotating Black Holes: ISCO and Photon Orbits"
//! - Visser, M. (2007). "The Kerr spacetime: A Brief Introduction"

use crate::metric::{HamiltonianDerivatives, Metric, Orbit};
use crate::tensor::MetricTensor4;

/// Coordinate system for the Kerr metric.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum CoordinateSystem {
    /// Boyer-Lindquist coordinates. Standard, but singular at the event horizon.
    BoyerLindquist,
    /// Kerr-Schild (ingoing) coordinates. Non-singular at the event horizon.
    KerrSchild,
}

/// A Kerr (rotating) black hole spacetime.
///
/// # Example
///
/// ```
/// use gravitas::metric::{Kerr, Orbit, Metric};
///
/// let bh = Kerr::new(1.0, 0.9);
/// assert!((bh.event_horizon() - 1.4358898944).abs() < 1e-6);
/// assert!((bh.isco(Orbit::Prograde) - 2.3209).abs() < 0.01);
/// ```
#[derive(Debug, Clone, Copy)]
pub struct Kerr {
    mass_val: f64,
    spin_val: f64,
    coords: CoordinateSystem,
}

impl Kerr {
    /// Create a new Kerr black hole metric.
    ///
    /// # Arguments
    /// - `mass` -- Black hole mass in geometric units (M)
    /// - `spin` -- Dimensionless spin parameter a* = J/M^2, clamped to [-1, 1]
    pub fn new(mass: f64, spin: f64) -> Self {
        Self {
            mass_val: mass,
            spin_val: spin.clamp(-1.0, 1.0),
            coords: CoordinateSystem::BoyerLindquist,
        }
    }

    /// Create a Kerr metric in Kerr-Schild coordinates (non-singular at horizon).
    pub fn kerr_schild(mass: f64, spin: f64) -> Self {
        Self {
            mass_val: mass,
            spin_val: spin.clamp(-1.0, 1.0),
            coords: CoordinateSystem::KerrSchild,
        }
    }

    /// Get the coordinate system in use.
    pub fn coordinate_system(&self) -> CoordinateSystem {
        self.coords
    }

    /// Geometric spin parameter a = a* * M.
    #[inline]
    pub fn a(&self) -> f64 {
        self.spin_val * self.mass_val
    }

    /// Inner (Cauchy) horizon: r_- = M - sqrt(M^2 - a^2).
    pub fn cauchy_horizon(&self) -> f64 {
        let m = self.mass_val;
        let a = self.a();
        let disc = m * m - a * a;
        if disc < 0.0 { 0.0 } else { m - disc.sqrt() }
    }

    /// Photon sphere radius (prograde circular photon orbit).
    ///
    /// r_ph = 2M * [1 + cos(2/3 * arccos(-a*))]
    pub fn photon_sphere(&self) -> f64 {
        let term = (2.0 / 3.0) * (-self.spin_val).acos();
        2.0 * self.mass_val * (1.0 + term.cos())
    }

    /// Innermost Stable Circular Orbit (ISCO) using the Bardeen-Press-Teukolsky formula.
    ///
    /// # Arguments
    /// - `orbit` -- Prograde (co-rotating) or Retrograde (counter-rotating)
    pub fn isco(&self, orbit: Orbit) -> f64 {
        let a_star = self.spin_val;
        let m = self.mass_val;

        if a_star.abs() < 1e-6 {
            return m * 6.0;
        }

        let a2 = a_star * a_star;
        let z1 = 1.0
            + (1.0 - a2).powf(1.0 / 3.0)
                * ((1.0 + a_star).powf(1.0 / 3.0) + (1.0 - a_star).powf(1.0 / 3.0));
        let z2 = (3.0 * a2 + z1 * z1).sqrt();

        let sign = match orbit {
            Orbit::Prograde => -1.0,
            Orbit::Retrograde => 1.0,
        };

        let disc = (3.0 - z1) * (3.0 + z1 + 2.0 * z2);
        let root = if disc < 0.0 { 0.0 } else { disc.sqrt() };

        m * (3.0 + z2 + sign * root)
    }

    /// Angular velocity of frame dragging at the equator.
    ///
    /// omega = 2Ma / (r^3 + a^2*r + 2Ma^2)
    pub fn frame_dragging_equator(&self, r: f64) -> f64 {
        let a = self.a();
        let m = self.mass_val;
        let num = 2.0 * m * a;
        let den = r.powi(3) + a.powi(2) * r + 2.0 * m * a.powi(2);
        if den.abs() < 1e-30 { 0.0 } else { num / den }
    }

    /// Angular velocity of frame dragging at arbitrary (r, theta).
    ///
    /// omega = -g_{t phi} / g_{phi phi}
    pub fn frame_dragging(&self, r: f64, theta: f64) -> f64 {
        let g = self.covariant(r, theta);
        let g_tph = g.get(0, 3);
        let g_phph = g.get(3, 3);
        if g_phph.abs() < 1e-30 { 0.0 } else { -g_tph / g_phph }
    }

    /// Ergosphere radius at angle theta.
    ///
    /// r_ergo = M + sqrt(M^2 - a^2 cos^2(theta))
    pub fn ergosphere(&self, theta: f64) -> f64 {
        let m = self.mass_val;
        let a = self.a();
        let cos_theta = theta.cos();
        let disc = m * m - a * a * cos_theta * cos_theta;
        if disc < 0.0 { m } else { m + disc.sqrt() }
    }

    /// Keplerian orbital angular frequency at radius r (equatorial circular orbit).
    ///
    /// Omega_K = sqrt(M) / (r^{3/2} + a * sqrt(M))
    pub fn keplerian_frequency(&self, r: f64) -> f64 {
        let m = self.mass_val;
        let a = self.a();
        m.sqrt() / (r.powf(1.5) + a * m.sqrt())
    }

    /// Gravitational time dilation factor for a static observer at (r, theta).
    ///
    /// Returns dt_proper / dt_coordinate = sqrt(-g_{tt})
    pub fn time_dilation(&self, r: f64, theta: f64) -> f64 {
        let g = self.covariant(r, theta);
        let g_tt = g.get(0, 0);
        if g_tt >= 0.0 { 0.0 } else { (-g_tt).sqrt() }
    }

    /// Sigma = r^2 + a^2 cos^2(theta). Appears in every Kerr metric component.
    #[inline]
    pub fn sigma(&self, r: f64, theta: f64) -> f64 {
        let a = self.a();
        r * r + a * a * theta.cos().powi(2)
    }

    /// Delta = r^2 - 2Mr + a^2. Zero at the event horizons.
    #[inline]
    pub fn delta(&self, r: f64) -> f64 {
        let a = self.a();
        r * r - 2.0 * self.mass_val * r + a * a
    }
}

impl Metric for Kerr {
    fn covariant(&self, r: f64, theta: f64) -> MetricTensor4 {
        match self.coords {
            CoordinateSystem::BoyerLindquist => self.covariant_bl(r, theta),
            CoordinateSystem::KerrSchild => self.covariant_ks(r, theta),
        }
    }

    fn contravariant(&self, r: f64, theta: f64) -> MetricTensor4 {
        match self.coords {
            CoordinateSystem::BoyerLindquist => self.contravariant_bl(r, theta),
            CoordinateSystem::KerrSchild => self.contravariant_ks(r, theta),
        }
    }

    fn hamiltonian_derivatives(
        &self,
        r: f64,
        theta: f64,
        p: [f64; 4],
    ) -> HamiltonianDerivatives {
        match self.coords {
            CoordinateSystem::BoyerLindquist => self.hamiltonian_derivs_bl(r, theta, p),
            CoordinateSystem::KerrSchild => self.hamiltonian_derivs_ks(r, theta, p),
        }
    }

    fn mass(&self) -> f64 {
        self.mass_val
    }

    fn spin(&self) -> f64 {
        self.spin_val
    }
}

// ========================================================================
// Boyer-Lindquist implementation
// ========================================================================
impl Kerr {
    fn covariant_bl(&self, r: f64, theta: f64) -> MetricTensor4 {
        let m = self.mass_val;
        let a = self.a();
        let r2 = r * r;
        let a2 = a * a;
        let sin_theta = theta.sin();
        let cos_theta = theta.cos();
        let sin2 = sin_theta * sin_theta;
        let cos2 = cos_theta * cos_theta;

        let sigma = r2 + a2 * cos2;
        let delta = r2 - 2.0 * m * r + a2;

        let g_tt = -(1.0 - (2.0 * m * r) / sigma);
        let g_rr = sigma / delta;
        let g_thth = sigma;
        let g_phph = (r2 + a2 + (2.0 * m * r * a2 * sin2) / sigma) * sin2;
        let g_tph = -(2.0 * m * r * a * sin2) / sigma;

        MetricTensor4::from_array([
            g_tt, 0.0, 0.0, g_tph,
            0.0, g_rr, 0.0, 0.0,
            0.0, 0.0, g_thth, 0.0,
            g_tph, 0.0, 0.0, g_phph,
        ])
    }

    fn contravariant_bl(&self, r: f64, theta: f64) -> MetricTensor4 {
        let m = self.mass_val;
        let a = self.a();
        let r2 = r * r;
        let a2 = a * a;
        let sin_theta = theta.sin();
        let cos_theta = theta.cos();
        let sin2 = sin_theta * sin_theta;
        let cos2 = cos_theta * cos_theta;

        let sigma = r2 + a2 * cos2;
        let delta = r2 - 2.0 * m * r + a2;

        let g_tt = -((sigma * (r2 + a2) + 2.0 * m * r * a2 * sin2) / (delta * sigma));
        let g_rr = delta / sigma;
        let g_thth = 1.0 / sigma;
        let g_phph = if sin2 < 1e-9 {
            0.0
        } else {
            (delta - a2 * sin2) / (delta * sigma * sin2)
        };
        let g_tph = -(2.0 * m * r * a) / (delta * sigma);

        MetricTensor4::from_array([
            g_tt, 0.0, 0.0, g_tph,
            0.0, g_rr, 0.0, 0.0,
            0.0, 0.0, g_thth, 0.0,
            g_tph, 0.0, 0.0, g_phph,
        ])
    }

    fn hamiltonian_derivs_bl(&self, r: f64, theta: f64, p: [f64; 4]) -> HamiltonianDerivatives {
        let m = self.mass_val;
        let a = self.a();
        let r2 = r * r;
        let a2 = a * a;
        let cos_theta = theta.cos();
        let sin_theta = theta.sin();
        let sin2 = sin_theta * sin_theta;
        let cos2 = cos_theta * cos_theta;

        let sigma = r2 + a2 * cos2;
        let delta = r2 - 2.0 * m * r + a2;
        let sigma_sq = sigma * sigma;

        let dsigma_dr = 2.0 * r;
        let dsigma_dtheta = -2.0 * a2 * cos_theta * sin_theta;
        let ddelta_dr = 2.0 * r - 2.0 * m;

        // d(g^rr)/dr, d(g^rr)/dtheta
        let dg_rr_dr = (ddelta_dr * sigma - delta * dsigma_dr) / sigma_sq;
        let dg_rr_dtheta = -(delta * dsigma_dtheta) / sigma_sq;

        // d(g^thth)/dr, d(g^thth)/dtheta
        let dg_thth_dr = -dsigma_dr / sigma_sq;
        let dg_thth_dtheta = -dsigma_dtheta / sigma_sq;

        // d(g^tphi)/dr, d(g^tphi)/dtheta
        let num_tphi = -2.0 * m * r * a;
        let den_tphi = delta * sigma;
        let dnum_tphi_dr = -2.0 * m * a;
        let dden_tphi_dr = ddelta_dr * sigma + delta * dsigma_dr;
        let dg_tphi_dr = (dnum_tphi_dr * den_tphi - num_tphi * dden_tphi_dr)
            / (den_tphi * den_tphi);
        let dden_tphi_dtheta = delta * dsigma_dtheta;
        let dg_tphi_dtheta = -(num_tphi * dden_tphi_dtheta) / (den_tphi * den_tphi);

        // d(g^tt)/dr, d(g^tt)/dtheta
        let du_dr = dsigma_dr * (r2 + a2) + sigma * 2.0 * r + 2.0 * m * a2 * sin2;
        let dv_dr = dden_tphi_dr;
        let u_val = sigma * (r2 + a2) + 2.0 * m * r * a2 * sin2;
        let dg_tt_dr = -(du_dr * den_tphi - u_val * dv_dr) / (den_tphi * den_tphi);

        let du_dtheta = dsigma_dtheta * (r2 + a2) + 2.0 * m * r * a2 * 2.0 * sin_theta * cos_theta;
        let dv_dtheta = dden_tphi_dtheta;
        let dg_tt_dtheta = -(du_dtheta * den_tphi - u_val * dv_dtheta) / (den_tphi * den_tphi);

        // d(g^phph)/dr, d(g^phph)/dtheta
        let da_dr = -dsigma_dr / (sigma_sq * sin2);
        let db_dr = -a2 * dden_tphi_dr / (den_tphi * den_tphi);
        let dg_phph_dr = da_dr - db_dr;

        let d_denom_a_dtheta = dsigma_dtheta * sin2 + sigma * 2.0 * sin_theta * cos_theta;
        let da_dtheta = -d_denom_a_dtheta / (sigma_sq * sin2 * sin2);
        let db_dtheta = -a2 * dden_tphi_dtheta / (den_tphi * den_tphi);
        let dg_phph_dtheta = da_dtheta - db_dtheta;

        // Assembly: dH/dalpha = 1/2 * p_mu * p_nu * (dg^mu_nu / dx^alpha)
        let p_t = p[0];
        let p_r = p[1];
        let p_th = p[2];
        let p_ph = p[3];

        let dh_dr = 0.5
            * (p_t * p_t * dg_tt_dr
                + p_r * p_r * dg_rr_dr
                + p_th * p_th * dg_thth_dr
                + p_ph * p_ph * dg_phph_dr
                + 2.0 * p_t * p_ph * dg_tphi_dr);

        let dh_dtheta = 0.5
            * (p_t * p_t * dg_tt_dtheta
                + p_r * p_r * dg_rr_dtheta
                + p_th * p_th * dg_thth_dtheta
                + p_ph * p_ph * dg_phph_dtheta
                + 2.0 * p_t * p_ph * dg_tphi_dtheta);

        HamiltonianDerivatives { dh_dr, dh_dtheta }
    }
}

// ========================================================================
// Kerr-Schild implementation (non-singular at horizon)
// ========================================================================
impl Kerr {
    fn covariant_ks(&self, r: f64, theta: f64) -> MetricTensor4 {
        let m = self.mass_val;
        let a = self.a();
        let r2 = r * r;
        let a2 = a * a;
        let cos2 = theta.cos().powi(2);
        let sin2 = 1.0 - cos2;
        let sigma = r2 + a2 * cos2;

        let h = (m * r) / sigma;
        let l_r = sigma / (r2 + a2);
        let l = [1.0, l_r, 0.0, -a * sin2];

        let eta_tt = -1.0;
        let eta_rr = sigma / (r2 + a2);
        let eta_thth = sigma;
        let eta_phph = (r2 + a2) * sin2;

        let mut g = [0.0; 16];
        g[0] = eta_tt + 2.0 * h * l[0] * l[0];
        g[1] = 2.0 * h * l[0] * l[1];
        g[3] = 2.0 * h * l[0] * l[3];
        g[4] = 2.0 * h * l[1] * l[0];
        g[5] = eta_rr + 2.0 * h * l[1] * l[1];
        g[7] = 2.0 * h * l[1] * l[3];
        g[10] = eta_thth;
        g[12] = 2.0 * h * l[3] * l[0];
        g[13] = 2.0 * h * l[3] * l[1];
        g[15] = eta_phph + 2.0 * h * l[3] * l[3];

        MetricTensor4::from_array(g)
    }

    fn contravariant_ks(&self, r: f64, theta: f64) -> MetricTensor4 {
        let m = self.mass_val;
        let a = self.a();
        let r2 = r * r;
        let a2 = a * a;
        let sin2 = theta.sin().powi(2).max(1e-12);
        let cos2 = 1.0 - sin2;
        let sigma = r2 + a2 * cos2;
        let delta = r2 - 2.0 * m * r + a2;

        let g_tt = -(1.0 + 2.0 * m * r / sigma);
        let g_tr = 2.0 * m * r / sigma;
        let g_rr = delta / sigma;
        let g_thth = 1.0 / sigma;
        let g_phph = 1.0 / (sigma * sin2);
        let g_rph = a / sigma;

        let mut g = [0.0; 16];
        g[0] = g_tt;
        g[1] = g_tr;
        g[4] = g_tr;
        g[5] = g_rr;
        g[7] = g_rph;
        g[10] = g_thth;
        g[13] = g_rph;
        g[15] = g_phph;

        MetricTensor4::from_array(g)
    }

    fn hamiltonian_derivs_ks(&self, r: f64, theta: f64, p: [f64; 4]) -> HamiltonianDerivatives {
        let m = self.mass_val;
        let a = self.a();
        let r2 = r * r;
        let a2 = a * a;
        let sin_theta = theta.sin();
        let cos_theta = theta.cos();
        let sin2 = (sin_theta * sin_theta).max(1e-12);
        let cos2 = 1.0 - sin2;
        let sigma = r2 + a2 * cos2;
        let sigma2 = sigma * sigma;
        let delta = r2 - 2.0 * m * r + a2;

        let dsigma_dr = 2.0 * r;
        let dsigma_dtheta = -2.0 * a2 * sin_theta * cos_theta;
        let ddelta_dr = 2.0 * r - 2.0 * m;

        let dg_tt_dr = -(2.0 * m * (sigma - r * dsigma_dr)) / sigma2;
        let dg_tt_dtheta = (2.0 * m * r * dsigma_dtheta) / sigma2;

        let dg_tr_dr = -dg_tt_dr;
        let dg_tr_dtheta = -dg_tt_dtheta;

        let dg_rr_dr = (ddelta_dr * sigma - delta * dsigma_dr) / sigma2;
        let dg_rr_dtheta = -(delta * dsigma_dtheta) / sigma2;

        let dg_thth_dr = -dsigma_dr / sigma2;
        let dg_thth_dtheta = -dsigma_dtheta / sigma2;

        let dg_phph_dr = -dsigma_dr / (sigma2 * sin2);
        let dg_phph_dtheta =
            -(dsigma_dtheta * sin2 + sigma * 2.0 * sin_theta * cos_theta) / (sigma2 * sin2 * sin2);

        let dg_rph_dr = -(a * dsigma_dr) / sigma2;
        let dg_rph_dtheta = -(a * dsigma_dtheta) / sigma2;

        let dh_dr = 0.5
            * (dg_tt_dr * p[0] * p[0]
                + dg_rr_dr * p[1] * p[1]
                + dg_thth_dr * p[2] * p[2]
                + dg_phph_dr * p[3] * p[3]
                + 2.0 * dg_tr_dr * p[0] * p[1]
                + 2.0 * dg_rph_dr * p[1] * p[3]);

        let mut dh_dtheta = 0.5
            * (dg_tt_dtheta * p[0] * p[0]
                + dg_rr_dtheta * p[1] * p[1]
                + dg_thth_dtheta * p[2] * p[2]
                + dg_phph_dtheta * p[3] * p[3]
                + 2.0 * dg_tr_dtheta * p[0] * p[1]
                + 2.0 * dg_rph_dtheta * p[1] * p[3]);

        if sin_theta.abs() < 1e-10 {
            dh_dtheta = 0.0;
        }

        HamiltonianDerivatives { dh_dr, dh_dtheta }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f64::consts::FRAC_PI_2;

    #[test]
    fn test_schwarzschild_isco() {
        let bh = Kerr::new(1.0, 0.0);
        let isco = bh.isco(Orbit::Prograde);
        assert!((isco - 6.0).abs() < 1e-6, "Schwarzschild ISCO should be 6M, got {}", isco);
    }

    #[test]
    fn test_extreme_kerr_isco() {
        let bh = Kerr::new(1.0, 0.998);
        let isco = bh.isco(Orbit::Prograde);
        // For a* = 0.998, prograde ISCO should be approximately 1.24M
        assert!(isco < 1.5, "Extreme Kerr prograde ISCO should be < 1.5M, got {}", isco);
    }

    #[test]
    fn test_event_horizon() {
        let bh = Kerr::new(1.0, 0.0);
        assert!((bh.event_horizon() - 2.0).abs() < 1e-12, "Schwarzschild horizon = 2M");

        let bh = Kerr::new(1.0, 1.0);
        assert!((bh.event_horizon() - 1.0).abs() < 1e-12, "Extreme Kerr horizon = M");
    }

    #[test]
    fn test_photon_sphere() {
        let bh = Kerr::new(1.0, 0.0);
        let rph = bh.photon_sphere();
        assert!((rph - 3.0).abs() < 1e-6, "Schwarzschild photon sphere = 3M, got {}", rph);
    }

    #[test]
    fn test_metric_signature() {
        let bh = Kerr::new(1.0, 0.5);
        let g = bh.covariant(10.0, FRAC_PI_2);
        // g_tt should be negative (timelike)
        assert!(g[(0, 0)] < 0.0, "g_tt should be negative at r=10M");
        // g_rr, g_thth, g_phph should be positive (spacelike)
        assert!(g[(1, 1)] > 0.0, "g_rr should be positive");
        assert!(g[(2, 2)] > 0.0, "g_thth should be positive");
        assert!(g[(3, 3)] > 0.0, "g_phph should be positive");
    }

    #[test]
    fn test_hamiltonian_consistency_bl_vs_ks() {
        let bl = Kerr::new(1.0, 0.5);
        let ks = Kerr::kerr_schild(1.0, 0.5);

        let r = 5.0;
        let theta = FRAC_PI_2;
        let p_bl = [-1.0, 0.0, 0.0, 2.0];

        // Transform p_r from BL to KS
        let a = 0.5;
        let delta = r * r - 2.0 * r + a * a;
        let e = 1.0; // -p_t
        let lz = p_bl[3];
        let p_r_ks = p_bl[1] + (2.0 * r * e - a * lz) / delta;
        let p_ks = [p_bl[0], p_r_ks, p_bl[2], p_bl[3]];

        let g_inv_bl = bl.contravariant(r, theta);
        let h_bl = 0.5 * g_inv_bl.contract(&p_bl);

        let g_inv_ks = ks.contravariant(r, theta);
        let h_ks = 0.5 * g_inv_ks.contract(&p_ks);

        assert!(
            (h_bl - h_ks).abs() < 1e-8,
            "Hamiltonian should be invariant under coordinate transform! BL={}, KS={}",
            h_bl, h_ks
        );
    }
}
