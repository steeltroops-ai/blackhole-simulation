//! Geodesic integration: ray states, integrators, and trajectory computation.
//!
//! This module provides the core machinery to trace null geodesics (photon paths)
//! through any spacetime that implements [`Metric`](crate::metric::Metric).

mod hamiltonian;
mod integrator;
mod termination;

pub use hamiltonian::get_state_derivative;
pub use integrator::{
    adaptive_rkf45_step, step_rk4, step_symplectic, AdaptiveStepper, IntegrationMethod,
    IntegrationOptions,
};
pub use termination::TerminationReason;

use crate::metric::Metric;

/// 8-dimensional phase space state for a geodesic.
///
/// Coordinates x^mu = (t, r, theta, phi) in Boyer-Lindquist or Kerr-Schild.
/// Covariant momentum p_mu = (p_t, p_r, p_theta, p_phi).
#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct GeodesicState {
    /// Spacetime coordinates (t, r, theta, phi).
    pub x: [f64; 4],
    /// Covariant 4-momentum (p_t, p_r, p_theta, p_phi).
    pub p: [f64; 4],
}

impl GeodesicState {
    /// Create a new geodesic state.
    pub fn new(
        t: f64, r: f64, theta: f64, phi: f64,
        pt: f64, pr: f64, ptheta: f64, pphi: f64,
    ) -> Self {
        Self {
            x: [t, r, theta, phi],
            p: [pt, pr, ptheta, pphi],
        }
    }

    /// Current radial coordinate.
    #[inline]
    pub fn r(&self) -> f64 { self.x[1] }

    /// Current polar angle.
    #[inline]
    pub fn theta(&self) -> f64 { self.x[2] }

    /// Create a null ray at (r, theta, phi) with initial direction encoded in momentum.
    ///
    /// Sets p_t = -1 (unit energy for null rays) by convention.
    pub fn null_ray(r: f64, theta: f64, phi: f64, pr: f64, ptheta: f64, pphi: f64) -> Self {
        Self::new(0.0, r, theta, phi, -1.0, pr, ptheta, pphi)
    }
}

// ===== Butcher tableau helpers for RKF45 =====
impl GeodesicState {
    pub(crate) fn add_scaled(&self, k: Self, s: f64) -> Self {
        let mut n = *self;
        for i in 0..4 {
            n.x[i] += k.x[i] * s;
            n.p[i] += k.p[i] * s;
        }
        n
    }

    pub(crate) fn add_scaled_2(&self, k1: Self, s1: f64, k2: Self, s2: f64) -> Self {
        let mut n = *self;
        for i in 0..4 {
            n.x[i] += k1.x[i] * s1 + k2.x[i] * s2;
            n.p[i] += k1.p[i] * s1 + k2.p[i] * s2;
        }
        n
    }

    pub(crate) fn add_scaled_3(&self, k1: Self, s1: f64, k2: Self, s2: f64, k3: Self, s3: f64) -> Self {
        let mut n = *self;
        for i in 0..4 {
            n.x[i] += k1.x[i] * s1 + k2.x[i] * s2 + k3.x[i] * s3;
            n.p[i] += k1.p[i] * s1 + k2.p[i] * s2 + k3.p[i] * s3;
        }
        n
    }

    pub(crate) fn add_scaled_4(
        &self, k1: Self, s1: f64, k2: Self, s2: f64,
        k3: Self, s3: f64, k4: Self, s4: f64,
    ) -> Self {
        let mut n = *self;
        for i in 0..4 {
            n.x[i] += k1.x[i] * s1 + k2.x[i] * s2 + k3.x[i] * s3 + k4.x[i] * s4;
            n.p[i] += k1.p[i] * s1 + k2.p[i] * s2 + k3.p[i] * s3 + k4.p[i] * s4;
        }
        n
    }

    pub(crate) fn add_scaled_5(
        &self, k1: Self, s1: f64, k2: Self, s2: f64,
        k3: Self, s3: f64, k4: Self, s4: f64, k5: Self, s5: f64,
    ) -> Self {
        let mut n = *self;
        for i in 0..4 {
            n.x[i] += k1.x[i] * s1 + k2.x[i] * s2 + k3.x[i] * s3 + k4.x[i] * s4 + k5.x[i] * s5;
            n.p[i] += k1.p[i] * s1 + k2.p[i] * s2 + k3.p[i] * s3 + k4.p[i] * s4 + k5.p[i] * s5;
        }
        n
    }
}

/// The result of integrating a geodesic to completion.
#[derive(Debug, Clone)]
pub struct Trajectory {
    /// The final state after integration.
    pub final_state: GeodesicState,
    /// Reason integration stopped.
    pub termination: TerminationReason,
    /// Number of integration steps taken.
    pub steps_taken: usize,
    /// Maximum absolute Hamiltonian value during integration (should be ~0 for null rays).
    pub max_hamiltonian_drift: f64,
    /// Optionally, all intermediate states (if `record_path` was true).
    pub path: Option<Vec<GeodesicState>>,
}

/// Integrate a geodesic through a given spacetime.
///
/// This is the primary high-level API for tracing photon paths.
///
/// # Example
///
/// ```
/// use gravitas::prelude::*;
/// use gravitas::metric::Metric;
/// use gravitas::geodesic::{integrate, GeodesicState};
///
/// let bh = Kerr::new(1.0, 0.9);
/// let ray = GeodesicState::null_ray(20.0, std::f64::consts::FRAC_PI_2, 0.0, -1.0, 0.0, 3.5);
///
/// let traj = integrate(&ray, &bh, &IntegrationOptions::default());
/// println!("Ray terminated at r = {:.4}", traj.final_state.r());
/// ```
pub fn integrate<M: Metric>(
    initial: &GeodesicState,
    metric: &M,
    options: &IntegrationOptions,
) -> Trajectory {
    let mut state = *initial;
    let mut stepper = AdaptiveStepper::new(options.tolerance);
    let mut h = options.initial_step;

    let horizon = metric.event_horizon();
    let mut max_drift = 0.0;
    let mut steps = 0;

    let mut path = if options.record_path {
        Some(vec![state])
    } else {
        None
    };

    // Renormalize momentum to H=0 at start
    crate::invariants::renormalize_null(&mut state, metric);

    for _ in 0..options.max_steps {
        // Check termination
        let term = state.check_termination(horizon, options.escape_radius);
        if term != TerminationReason::None {
            return Trajectory {
                final_state: state,
                termination: term,
                steps_taken: steps,
                max_hamiltonian_drift: max_drift,
                path,
            };
        }

        // Step
        match options.method {
            IntegrationMethod::AdaptiveRKF45 => {
                h = stepper.step(&mut state, metric, h);
            }
            IntegrationMethod::RK4 { step_size } => {
                step_rk4(&mut state, metric, step_size);
            }
            IntegrationMethod::Symplectic { step_size } => {
                step_symplectic(&mut state, metric, step_size);
            }
        }

        // Renormalize periodically
        if steps % options.renormalize_interval == 0 {
            crate::invariants::renormalize_null(&mut state, metric);
        }

        // Track drift
        let h_val = crate::invariants::hamiltonian(&state, metric).abs();
        if h_val > max_drift {
            max_drift = h_val;
        }

        steps += 1;

        if let Some(ref mut p) = path {
            p.push(state);
        }
    }

    Trajectory {
        final_state: state,
        termination: TerminationReason::MaxSteps,
        steps_taken: steps,
        max_hamiltonian_drift: max_drift,
        path,
    }
}

impl GeodesicState {
    fn check_termination(&self, horizon: f64, escape_r: f64) -> TerminationReason {
        let r = self.x[1];
        if r < horizon * 1.001 {
            TerminationReason::Horizon
        } else if r > escape_r {
            TerminationReason::Escape
        } else {
            TerminationReason::None
        }
    }
}
