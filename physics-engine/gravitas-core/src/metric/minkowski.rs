//! Minkowski (flat) spacetime metric.
//!
//! The trivial metric eta_{mu nu} = diag(-1, 1, r^2, r^2 sin^2 theta)
//! in spherical coordinates. Used for baseline testing and sanity checks.

use crate::metric::{HamiltonianDerivatives, Metric};
use crate::tensor::MetricTensor4;

/// Flat Minkowski spacetime in spherical coordinates.
#[derive(Debug, Clone, Copy)]
pub struct Minkowski;

impl Metric for Minkowski {
    fn covariant(&self, r: f64, theta: f64) -> MetricTensor4 {
        let sin2 = theta.sin().powi(2);
        MetricTensor4::from_array([
            -1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, r * r, 0.0,
            0.0, 0.0, 0.0, r * r * sin2,
        ])
    }

    fn contravariant(&self, r: f64, theta: f64) -> MetricTensor4 {
        let sin2 = theta.sin().powi(2).max(1e-12);
        MetricTensor4::from_array([
            -1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0 / (r * r), 0.0,
            0.0, 0.0, 0.0, 1.0 / (r * r * sin2),
        ])
    }

    fn hamiltonian_derivatives(
        &self,
        r: f64,
        theta: f64,
        p: [f64; 4],
    ) -> HamiltonianDerivatives {
        let r3 = r * r * r;
        let sin_theta = theta.sin();
        let cos_theta = theta.cos();
        let sin2 = sin_theta * sin_theta;

        // dg^thth/dr = -2/r^3, dg^phph/dr = -2/(r^3 sin^2)
        let dh_dr = 0.5 * (-2.0 / r3 * p[2] * p[2] + if sin2 > 1e-12 { -2.0 / (r3 * sin2) * p[3] * p[3] } else { 0.0 });
        let dh_dtheta = if sin2 > 1e-12 {
            0.5 * (-2.0 * cos_theta / (r * r * sin_theta * sin2)) * p[3] * p[3]
        } else {
            0.0
        };

        HamiltonianDerivatives { dh_dr, dh_dtheta }
    }

    fn mass(&self) -> f64 { 0.0 }
    fn spin(&self) -> f64 { 0.0 }
}
