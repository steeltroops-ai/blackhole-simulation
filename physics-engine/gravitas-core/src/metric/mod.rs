//! Spacetime metric implementations.
//!
//! The [`Metric`] trait defines the interface that all spacetime geometries must satisfy.
//! Concrete implementations include:
//!
//! - [`Kerr`] -- Rotating black hole (the general case)
//! - [`Schwarzschild`] -- Non-rotating black hole (Kerr with a=0)
//! - [`Minkowski`] -- Flat spacetime (for baselines and testing)

pub mod kerr;
mod schwarzschild;
mod minkowski;

pub use kerr::Kerr;
pub use schwarzschild::Schwarzschild;
pub use minkowski::Minkowski;

use crate::tensor::MetricTensor4;

/// Orbit type for ISCO and photon sphere calculations.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Orbit {
    /// Co-rotating with the black hole spin.
    Prograde,
    /// Counter-rotating against the black hole spin.
    Retrograde,
}

/// Hamiltonian derivatives dH/dr and dH/dtheta.
///
/// Used by geodesic integrators to compute dp_mu/dlambda = -dH/dx^mu.
/// Since the Kerr metric is stationary and axisymmetric, dH/dt = 0 and dH/dphi = 0.
#[derive(Debug, Clone, Copy)]
pub struct HamiltonianDerivatives {
    pub dh_dr: f64,
    pub dh_dtheta: f64,
}

/// The spacetime metric trait.
///
/// Any geometry that implements this trait can be used with the geodesic integrator,
/// the invariants calculator, and all physics observables.
///
/// # Required Methods
///
/// - [`covariant`](Metric::covariant) -- The metric tensor g_{mu nu}
/// - [`contravariant`](Metric::contravariant) -- The inverse metric g^{mu nu}
/// - [`hamiltonian_derivatives`](Metric::hamiltonian_derivatives) -- dH/dr and dH/dtheta
/// - [`mass`](Metric::mass) and [`spin`](Metric::spin) -- Black hole parameters
///
/// # Provided Methods
///
/// - [`event_horizon`](Metric::event_horizon) -- r_+ = M + sqrt(M^2 - a^2)
pub trait Metric {
    /// Covariant metric tensor g_{mu nu} at coordinates (r, theta).
    fn covariant(&self, r: f64, theta: f64) -> MetricTensor4;

    /// Contravariant (inverse) metric tensor g^{mu nu} at coordinates (r, theta).
    fn contravariant(&self, r: f64, theta: f64) -> MetricTensor4;

    /// Analytic Hamiltonian derivatives at (r, theta) for momentum p.
    ///
    /// H = (1/2) g^{mu nu} p_mu p_nu
    ///
    /// Returns dH/dr and dH/dtheta.
    fn hamiltonian_derivatives(&self, r: f64, theta: f64, p: [f64; 4])
        -> HamiltonianDerivatives;

    /// Black hole mass parameter M (in geometric units).
    fn mass(&self) -> f64;

    /// Dimensionless spin parameter a* = J/(M^2), in range [-1, 1].
    fn spin(&self) -> f64;

    /// Event horizon radius: r_+ = M + sqrt(M^2 - a^2).
    fn event_horizon(&self) -> f64 {
        let m = self.mass();
        let a = self.spin() * m;
        let disc = m * m - a * a;
        if disc < 0.0 {
            m
        } else {
            m + disc.sqrt()
        }
    }
}
