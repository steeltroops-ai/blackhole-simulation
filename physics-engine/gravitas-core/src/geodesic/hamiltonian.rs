//! Hamiltonian equations of motion for geodesics.

use crate::geodesic::GeodesicState;
use crate::metric::Metric;

/// Compute the time derivative of the phase space state (Hamilton's equations).
///
/// dx^mu/dlambda = dH/dp_mu = g^{mu nu} p_nu
/// dp_mu/dlambda = -dH/dx^mu
///
/// Since the metric is stationary (dH/dt = 0) and axisymmetric (dH/dphi = 0),
/// p_t and p_phi are constants of motion, so dp_t/dlambda = 0 and dp_phi/dlambda = 0.
pub fn get_state_derivative<M: Metric>(state: &GeodesicState, metric: &M) -> GeodesicState {
    let r = state.x[1];
    let theta = state.x[2];

    let g_inv = metric.contravariant(r, theta);

    // Velocity: dx^mu/dlambda = g^{mu nu} p_nu
    let g = g_inv.as_array();
    let p = &state.p;

    let dt  = g[0]  * p[0] + g[1]  * p[1] + g[3]  * p[3];
    let dr  = g[4]  * p[0] + g[5]  * p[1] + g[7]  * p[3];
    let dth = g[10] * p[2];
    let dph = g[12] * p[0] + g[13] * p[1] + g[15] * p[3];

    // Momentum: dp_mu/dlambda = -dH/dx^mu
    let derivs = metric.hamiltonian_derivatives(r, theta, state.p);

    GeodesicState {
        x: [dt, dr, dth, dph],
        p: [0.0, -derivs.dh_dr, -derivs.dh_dtheta, 0.0],
    }
}
