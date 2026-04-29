//! Parallel transport of the polarization 4-vector f^μ along a null
//! geodesic in Kerr spacetime.
//!
//! The Walker-Penrose theorem (Walker & Penrose 1970, Eq. 2.3) says
//! that the complex constant κ_WP(state, p, f) is invariant along
//! null geodesics with parallel-transported f^μ. This module provides
//! the actual parallel-transport step so callers can verify the
//! invariant numerically and so the integrated polarization angle
//! matches the per-point κ_WP rotation that
//! `physics::polarization::evpa_rotation` already exposes.
//!
//! The parallel-transport equation in component form:
//!
//!   df^μ/dλ = −Γ^μ_νσ · p^ν · f^σ
//!
//! where p^ν is the *contravariant* photon momentum (dx^ν/dλ for an
//! affine parameter) and Γ^μ_νσ is the Christoffel symbol of the
//! second kind. Since gravitas-core stores p_ν (covariant), we raise
//! the index via the inverse metric inside `step_parallel_transport`.
//!
//! Reference: Walker & Penrose 1970, *Commun. Math. Phys.* 18, 265,
//! Eq. 2.3; Misner-Thorne-Wheeler 1973 §41 for the parallel-transport
//! formalism; Connors & Stark 1977 for the Kerr-specific application.

use crate::geodesic::GeodesicState;
use crate::metric::Metric;
use crate::tensor::christoffel_from_metric_derivs;

/// Default finite-difference step for the metric-derivative Christoffel
/// computation. Conservative; tighter values drift faster from
/// rounding noise, looser values miss geometry.
pub const DEFAULT_CHRISTOFFEL_EPS: f64 = 1.0e-5;

/// Raise the index on the covariant momentum p_ν to get the
/// contravariant p^μ via p^μ = g^{μν} p_ν.
fn raise_momentum<M: Metric>(state: &GeodesicState, metric: &M) -> [f64; 4] {
    let g_inv = metric.contravariant(state.x[1], state.x[2]);
    let g = g_inv.as_array();
    let p = &state.p;
    [
        g[0] * p[0] + g[1] * p[1] + g[2] * p[2] + g[3] * p[3],
        g[4] * p[0] + g[5] * p[1] + g[6] * p[2] + g[7] * p[3],
        g[8] * p[0] + g[9] * p[1] + g[10] * p[2] + g[11] * p[3],
        g[12] * p[0] + g[13] * p[1] + g[14] * p[2] + g[15] * p[3],
    ]
}

/// Right-hand side of the parallel-transport ODE at the given state:
/// returns df^μ/dλ for a contravariant polarization 4-vector f^μ.
#[must_use]
pub fn parallel_transport_rhs<M: Metric>(
    metric: &M,
    state: &GeodesicState,
    f_up: [f64; 4],
    christoffel_eps: f64,
) -> [f64; 4] {
    let p_up = raise_momentum(state, metric);
    let gamma = christoffel_from_metric_derivs(metric, state.x[1], state.x[2], christoffel_eps);
    let mut df = [0.0_f64; 4];
    // df^μ/dλ = -Γ^μ_νσ p^ν f^σ. The double sum over (ν, σ) keeps
    // tensor-index notation; the loop is intentional per the
    // existing christoffel.rs convention.
    #[allow(clippy::needless_range_loop)]
    for mu in 0..4 {
        let mut acc = 0.0;
        for nu in 0..4 {
            for sigma in 0..4 {
                acc += gamma[mu][nu][sigma] * p_up[nu] * f_up[sigma];
            }
        }
        df[mu] = -acc;
    }
    df
}

/// One classical RK4 step of the parallel-transport ODE.
///
/// The geodesic state (x, p) is treated as fixed for this step;
/// callers wanting joint integration of (x, p, f) call this function
/// alongside their existing geodesic stepper using consistent step
/// sizes.
///
/// Returns the parallel-transported f^μ after stepping by `h` in the
/// affine parameter.
#[must_use]
pub fn step_parallel_transport_rk4<M: Metric>(
    metric: &M,
    state: &GeodesicState,
    f_up: [f64; 4],
    h: f64,
    christoffel_eps: f64,
) -> [f64; 4] {
    let k1 = parallel_transport_rhs(metric, state, f_up, christoffel_eps);
    let f_k2 = add_scaled(f_up, k1, 0.5 * h);
    let k2 = parallel_transport_rhs(metric, state, f_k2, christoffel_eps);
    let f_k3 = add_scaled(f_up, k2, 0.5 * h);
    let k3 = parallel_transport_rhs(metric, state, f_k3, christoffel_eps);
    let f_k4 = add_scaled(f_up, k3, h);
    let k4 = parallel_transport_rhs(metric, state, f_k4, christoffel_eps);
    [
        f_up[0] + (h / 6.0) * (k1[0] + 2.0 * k2[0] + 2.0 * k3[0] + k4[0]),
        f_up[1] + (h / 6.0) * (k1[1] + 2.0 * k2[1] + 2.0 * k3[1] + k4[1]),
        f_up[2] + (h / 6.0) * (k1[2] + 2.0 * k2[2] + 2.0 * k3[2] + k4[2]),
        f_up[3] + (h / 6.0) * (k1[3] + 2.0 * k2[3] + 2.0 * k3[3] + k4[3]),
    ]
}

fn add_scaled(a: [f64; 4], b: [f64; 4], s: f64) -> [f64; 4] {
    [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s, a[3] + b[3] * s]
}

/// Combined geodesic + polarization step: advance (x, p, f) over one
/// fixed-step RK4 stride. Uses the Hamiltonian gradient for (x, p)
/// per `geodesic::step_rk4` and the parallel-transport equation for f.
///
/// The two integrations share the same step size to keep the f^μ
/// transport in step with the geodesic.
pub fn step_polarized_rk4<M: Metric>(
    metric: &M,
    state: &mut GeodesicState,
    f_up: [f64; 4],
    h: f64,
    christoffel_eps: f64,
) -> [f64; 4] {
    // Capture state snapshot before the geodesic step so the parallel
    // transport uses the position/momentum that produced the segment.
    let snapshot = *state;
    crate::geodesic::step_rk4(state, metric, h);
    step_parallel_transport_rk4(metric, &snapshot, f_up, h, christoffel_eps)
}
