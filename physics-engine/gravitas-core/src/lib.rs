//! # Gravitas -- General Relativity Computation Engine
//!
//! A high-fidelity physics library for computing geodesics, spacetime geometry,
//! and relativistic observables in Kerr (rotating) black hole spacetimes.
//!
//! ## Quick Start
//!
//! ```rust
//! use gravitas::prelude::*;
//! use gravitas::metric::Metric;
//!
//! // Create a Kerr black hole (mass = 1.0, spin = 0.9)
//! let bh = Kerr::new(1.0, 0.9);
//!
//! // Key radii
//! let r_h = bh.event_horizon();
//! let r_isco = bh.isco(Orbit::Prograde);
//! let r_ph = bh.photon_sphere();
//!
//! // Get the metric tensor at a point
//! let g = bh.covariant(5.0, std::f64::consts::FRAC_PI_2);
//! ```
//!
//! ## Architecture
//!
//! The library is organized into the following modules:
//!
//! - [`metric`] -- Spacetime geometry: Metric trait, Kerr, Schwarzschild, Minkowski
//! - [`geodesic`] -- Ray state, Hamiltonian derivatives, integrators (RKF45, RK4, Symplectic)
//! - [`invariants`] -- Constants of motion (E, Lz, Q, H), momentum renormalization
//! - [`physics`] -- Physical observables: photon tracing, accretion disk, redshift, spectrum
//! - [`spacetime`] -- Visualization helpers: embedding diagrams, light cones, curvature
//! - [`tensor`] -- Tensor algebra: MetricTensor4, Christoffel symbols
//! - [`quantum`] -- Semi-classical effects: Hawking temperature, Planck-scale fluctuations
//! - [`constants`] -- Physical constants in SI and geometric units

pub mod constants;
pub mod geodesic;
pub mod invariants;
pub mod metric;
pub mod physics;
pub mod quantum;
pub mod spacetime;
pub mod tensor;

/// Convenience re-exports for common usage.
pub mod prelude {
    pub use crate::constants::*;
    pub use crate::geodesic::{
        GeodesicState, IntegrationMethod, IntegrationOptions, TerminationReason, Trajectory,
    };
    pub use crate::invariants::ConstantsOfMotion;
    pub use crate::metric::{Kerr, Metric, Orbit};
    pub use crate::tensor::MetricTensor4;
}
