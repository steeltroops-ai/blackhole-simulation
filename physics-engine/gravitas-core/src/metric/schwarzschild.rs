//! Schwarzschild spacetime metric (non-rotating black hole).
//!
//! This is the a = 0 special case of the Kerr metric. Provided as a
//! separate implementation for clarity, simpler formulas, and baseline testing.

use crate::metric::{HamiltonianDerivatives, Metric};
use crate::tensor::MetricTensor4;

/// A Schwarzschild (non-rotating) black hole spacetime.
///
/// # Example
///
/// ```
/// use gravitas::metric::Schwarzschild;
/// use gravitas::metric::Metric;
///
/// let bh = Schwarzschild::new(1.0);
/// assert!((bh.event_horizon() - 2.0).abs() < 1e-12);
/// ```
#[derive(Debug, Clone, Copy)]
pub struct Schwarzschild {
    mass_val: f64,
}

impl Schwarzschild {
    pub fn new(mass: f64) -> Self {
        Self { mass_val: mass }
    }

    /// Schwarzschild radius rs = 2M.
    pub fn schwarzschild_radius(&self) -> f64 {
        2.0 * self.mass_val
    }

    /// ISCO = 6M (spin-independent for Schwarzschild).
    pub fn isco(&self) -> f64 {
        6.0 * self.mass_val
    }

    /// Photon sphere = 3M.
    pub fn photon_sphere(&self) -> f64 {
        3.0 * self.mass_val
    }
}

impl Metric for Schwarzschild {
    fn covariant(&self, r: f64, theta: f64) -> MetricTensor4 {
        let m = self.mass_val;
        let rs = 2.0 * m;
        let sin2 = theta.sin().powi(2);

        let g_tt = -(1.0 - rs / r);
        let g_rr = 1.0 / (1.0 - rs / r);
        let g_thth = r * r;
        let g_phph = r * r * sin2;

        MetricTensor4::from_array([
            g_tt, 0.0, 0.0, 0.0,
            0.0, g_rr, 0.0, 0.0,
            0.0, 0.0, g_thth, 0.0,
            0.0, 0.0, 0.0, g_phph,
        ])
    }

    fn contravariant(&self, r: f64, theta: f64) -> MetricTensor4 {
        let m = self.mass_val;
        let rs = 2.0 * m;
        let sin2 = theta.sin().powi(2).max(1e-12);

        let g_tt = -1.0 / (1.0 - rs / r);
        let g_rr = 1.0 - rs / r;
        let g_thth = 1.0 / (r * r);
        let g_phph = 1.0 / (r * r * sin2);

        MetricTensor4::from_array([
            g_tt, 0.0, 0.0, 0.0,
            0.0, g_rr, 0.0, 0.0,
            0.0, 0.0, g_thth, 0.0,
            0.0, 0.0, 0.0, g_phph,
        ])
    }

    fn hamiltonian_derivatives(
        &self,
        r: f64,
        theta: f64,
        p: [f64; 4],
    ) -> HamiltonianDerivatives {
        let m = self.mass_val;
        let r2 = r * r;
        let r3 = r2 * r;
        let sin_theta = theta.sin();
        let cos_theta = theta.cos();
        let sin2 = sin_theta * sin_theta;

        // d(g^tt)/dr = -2M/r^2 * 1/(1 - 2M/r)^2 = -2M / (r - 2M)^2
        let f = 1.0 - 2.0 * m / r;
        let dg_tt_dr = -2.0 * m / (r2 * f * f);
        let dg_rr_dr = 2.0 * m / r2;
        let dg_thth_dr = -2.0 / r3;
        let dg_phph_dr = if sin2 < 1e-12 { 0.0 } else { -2.0 / (r3 * sin2) };

        let dg_phph_dtheta = if sin2 < 1e-12 {
            0.0
        } else {
            -2.0 * cos_theta / (r2 * sin_theta * sin2)
        };

        let dh_dr = 0.5
            * (dg_tt_dr * p[0] * p[0]
                + dg_rr_dr * p[1] * p[1]
                + dg_thth_dr * p[2] * p[2]
                + dg_phph_dr * p[3] * p[3]);

        let dh_dtheta = 0.5 * dg_phph_dtheta * p[3] * p[3];

        HamiltonianDerivatives { dh_dr, dh_dtheta }
    }

    fn mass(&self) -> f64 {
        self.mass_val
    }

    fn spin(&self) -> f64 {
        0.0
    }
}
