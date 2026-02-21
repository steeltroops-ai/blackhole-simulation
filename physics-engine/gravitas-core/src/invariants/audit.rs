//! Numerical derivative audit for validating analytic Hamiltonian derivatives.

use crate::metric::{HamiltonianDerivatives, Metric};

/// Verifies analytic Hamiltonian derivatives against numerical finite differences.
pub struct NumericalAudit<'a, M: Metric> {
    pub metric: &'a M,
    pub eps: f64,
}

impl<'a, M: Metric> NumericalAudit<'a, M> {
    pub fn new(metric: &'a M) -> Self {
        Self { metric, eps: 1e-7 }
    }

    /// Compute dH/dr and dH/dtheta numerically via central differences.
    pub fn numerical_derivatives(
        &self,
        r: f64,
        theta: f64,
        p: [f64; 4],
    ) -> HamiltonianDerivatives {
        let h = |r_val: f64, theta_val: f64| {
            let g_inv = self.metric.contravariant(r_val, theta_val);
            0.5 * g_inv.contract(&p)
        };

        let dh_dr = (h(r + self.eps, theta) - h(r - self.eps, theta)) / (2.0 * self.eps);
        let dh_dtheta = (h(r, theta + self.eps) - h(r, theta - self.eps)) / (2.0 * self.eps);

        HamiltonianDerivatives { dh_dr, dh_dtheta }
    }

    /// Compare analytic vs numerical derivatives and return the max relative error.
    pub fn max_relative_error(
        &self,
        r: f64,
        theta: f64,
        p: [f64; 4],
    ) -> f64 {
        let analytic = self.metric.hamiltonian_derivatives(r, theta, p);
        let numerical = self.numerical_derivatives(r, theta, p);

        let err_r = if numerical.dh_dr.abs() > 1e-15 {
            ((analytic.dh_dr - numerical.dh_dr) / numerical.dh_dr).abs()
        } else {
            (analytic.dh_dr - numerical.dh_dr).abs()
        };

        let err_th = if numerical.dh_dtheta.abs() > 1e-15 {
            ((analytic.dh_dtheta - numerical.dh_dtheta) / numerical.dh_dtheta).abs()
        } else {
            (analytic.dh_dtheta - numerical.dh_dtheta).abs()
        };

        err_r.max(err_th)
    }
}
