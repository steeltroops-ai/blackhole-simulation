use crate::metric::Metric;
use crate::derivatives::HamiltonianDerivatives;
use crate::geodesic::RayStateRelativistic;

pub struct NumericalMetricAudit<'a, M: Metric> {
    pub inner: &'a M,
    pub eps: f64,
}

impl<'a, M: Metric> NumericalMetricAudit<'a, M> {
    pub fn new(inner: &'a M) -> Self {
        Self { inner, eps: 1e-7 }
    }

    pub fn calculate_numerical_derivatives(&self, r: f64, theta: f64, p: [f64; 4]) -> HamiltonianDerivatives {
        let h = |r_val: f64, theta_val: f64| {
            let g_inv = self.inner.g_contravariant(r_val, theta_val);
            let mut ham = 0.0;
            for mu in 0..4 {
                for nu in 0..4 {
                    ham += 0.5 * g_inv[mu * 4 + nu] * p[mu] * p[nu];
                }
            }
            ham
        };

        let dh_dr = (h(r + self.eps, theta) - h(r - self.eps, theta)) / (2.0 * self.eps);
        let dh_dtheta = (h(r, theta + self.eps) - h(r, theta - self.eps)) / (2.0 * self.eps);

        HamiltonianDerivatives { dh_dr, dh_dtheta }
    }
}
