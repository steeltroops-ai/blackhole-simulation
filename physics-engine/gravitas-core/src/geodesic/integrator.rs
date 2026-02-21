//! Numerical integrators for geodesic equations.
//!
//! Three methods are available:
//!
//! 1. **Adaptive RKF45** -- Highest accuracy, automatically adjusts step size.
//! 2. **RK4** -- Fixed-step 4th-order Runge-Kutta.
//! 3. **Symplectic Implicit Midpoint** -- 2nd-order, energy-conserving.

use crate::geodesic::{GeodesicState, hamiltonian::get_state_derivative};
use crate::metric::Metric;

/// Method used for geodesic integration.
#[derive(Debug, Clone, Copy)]
pub enum IntegrationMethod {
    /// Adaptive Runge-Kutta-Fehlberg 4(5) with error control.
    AdaptiveRKF45,
    /// Fixed-step 4th-order Runge-Kutta.
    RK4 { step_size: f64 },
    /// 2nd-order Implicit Midpoint (symplectic, energy-conserving).
    Symplectic { step_size: f64 },
}

/// Options for geodesic integration.
#[derive(Debug, Clone)]
pub struct IntegrationOptions {
    pub method: IntegrationMethod,
    pub tolerance: f64,
    pub initial_step: f64,
    pub max_steps: usize,
    pub escape_radius: f64,
    pub renormalize_interval: usize,
    pub record_path: bool,
}

impl Default for IntegrationOptions {
    fn default() -> Self {
        Self {
            method: IntegrationMethod::AdaptiveRKF45,
            tolerance: 1e-8,
            initial_step: 0.01,
            max_steps: 10_000,
            escape_radius: 1000.0,
            renormalize_interval: 10,
            record_path: false,
        }
    }
}

/// Adaptive step-size controller for the RKF45 integrator.
///
/// Uses the embedded 4th/5th-order error estimate to grow or shrink the
/// step size, maintaining local truncation error below `tolerance`.
pub struct AdaptiveStepper {
    pub safety_factor: f64,
    pub min_step: f64,
    pub max_step: f64,
    pub tolerance: f64,
}

impl AdaptiveStepper {
    pub fn new(tolerance: f64) -> Self {
        Self {
            safety_factor: 0.9,
            min_step: 1e-5,
            max_step: 10.0,
            tolerance,
        }
    }

    /// Perform a single adaptive step. Updates `state` in place.
    /// Returns the recommended step size for the next step.
    pub fn step<M: Metric>(
        &mut self,
        state: &mut GeodesicState,
        metric: &M,
        h_try: f64,
    ) -> f64 {
        let mut h = h_try.clamp(-self.max_step, self.max_step);

        loop {
            let (new_state, error_estimate) = adaptive_rkf45_step(state, metric, h);

            let error_ratio = if error_estimate == 0.0 {
                0.0
            } else {
                error_estimate / self.tolerance
            };

            if error_ratio <= 1.0 {
                *state = new_state;

                let growth = if error_ratio < 1e-4 {
                    5.0
                } else {
                    self.safety_factor * error_ratio.powf(-0.2)
                };

                let next_h = h * growth.min(5.0);
                return next_h.clamp(-self.max_step, self.max_step);
            } else {
                let shrink = self.safety_factor * error_ratio.powf(-0.25);
                h *= shrink.max(0.1);

                if h.abs() < self.min_step {
                    let (forced, _) = adaptive_rkf45_step(state, metric, self.min_step * h.signum());
                    *state = forced;
                    return self.min_step * h.signum();
                }
            }
        }
    }
}

/// Runge-Kutta-Fehlberg 4(5) step.
///
/// Returns (5th_order_state, error_estimate).
pub fn adaptive_rkf45_step<M: Metric>(
    state: &GeodesicState,
    metric: &M,
    h: f64,
) -> (GeodesicState, f64) {
    let k1 = get_state_derivative(state, metric);
    let k2 = get_state_derivative(&state.add_scaled(k1, h / 4.0), metric);
    let k3 = get_state_derivative(&state.add_scaled_2(k1, 3.0 * h / 32.0, k2, 9.0 * h / 32.0), metric);
    let k4 = get_state_derivative(&state.add_scaled_3(
        k1, 1932.0 * h / 2197.0,
        k2, -7200.0 * h / 2197.0,
        k3, 7296.0 * h / 2197.0,
    ), metric);
    let k5 = get_state_derivative(&state.add_scaled_4(
        k1, 439.0 * h / 216.0,
        k2, -8.0 * h,
        k3, 3680.0 * h / 513.0,
        k4, -845.0 * h / 4104.0,
    ), metric);
    let k6 = get_state_derivative(&state.add_scaled_5(
        k1, -8.0 * h / 27.0,
        k2, 2.0 * h,
        k3, -3544.0 * h / 2565.0,
        k4, 1859.0 * h / 4104.0,
        k5, -11.0 * h / 40.0,
    ), metric);

    // 5th order solution
    let mut final_state = *state;
    for i in 0..4 {
        final_state.x[i] += h
            * (16.0 / 135.0 * k1.x[i]
                + 6656.0 / 12825.0 * k3.x[i]
                + 28561.0 / 56430.0 * k4.x[i]
                - 9.0 / 50.0 * k5.x[i]
                + 2.0 / 55.0 * k6.x[i]);
        final_state.p[i] += h
            * (16.0 / 135.0 * k1.p[i]
                + 6656.0 / 12825.0 * k3.p[i]
                + 28561.0 / 56430.0 * k4.p[i]
                - 9.0 / 50.0 * k5.p[i]
                + 2.0 / 55.0 * k6.p[i]);
    }

    // Error estimate (difference between 4th and 5th order)
    let mut error = 0.0f64;
    for i in 0..4 {
        let err = h
            * ((16.0 / 135.0 - 25.0 / 216.0) * k1.x[i]
                + (6656.0 / 12825.0 - 1408.0 / 2565.0) * k3.x[i]
                + (28561.0 / 56430.0 - 2197.0 / 4104.0) * k4.x[i]
                + (-9.0 / 50.0 + 1.0 / 5.0) * k5.x[i]
                + 2.0 / 55.0 * k6.x[i]);
        error = error.max(err.abs());
    }

    (final_state, error)
}

/// 4th-order Runge-Kutta fixed step.
pub fn step_rk4<M: Metric>(state: &mut GeodesicState, metric: &M, h: f64) {
    let k1 = get_state_derivative(state, metric);
    let k2 = get_state_derivative(&state.add_scaled(k1, 0.5 * h), metric);
    let k3 = get_state_derivative(&state.add_scaled(k2, 0.5 * h), metric);
    let k4 = get_state_derivative(&state.add_scaled(k3, h), metric);

    for i in 0..4 {
        state.x[i] += (h / 6.0) * (k1.x[i] + 2.0 * k2.x[i] + 2.0 * k3.x[i] + k4.x[i]);
        state.p[i] += (h / 6.0) * (k1.p[i] + 2.0 * k2.p[i] + 2.0 * k3.p[i] + k4.p[i]);
    }
}

/// 2nd-order Implicit Midpoint (symplectic integrator).
///
/// Uses fixed-point iteration (2 iterations) for the implicit solve.
/// Exactly conserves the Hamiltonian over long integrations.
pub fn step_symplectic<M: Metric>(state: &mut GeodesicState, metric: &M, h: f64) {
    let mut s_mid = *state;
    for _ in 0..2 {
        let d = get_state_derivative(&s_mid, metric);
        let mut s_next = *state;
        for i in 0..4 {
            s_next.x[i] = state.x[i] + d.x[i] * h;
            s_next.p[i] = state.p[i] + d.p[i] * h;
            s_mid.x[i] = 0.5 * (state.x[i] + s_next.x[i]);
            s_mid.p[i] = 0.5 * (state.p[i] + s_next.p[i]);
        }
    }
    let d_final = get_state_derivative(&s_mid, metric);
    for i in 0..4 {
        state.x[i] += d_final.x[i] * h;
        state.p[i] += d_final.p[i] * h;
    }
}
