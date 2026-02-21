//! Momentum renormalization for null geodesics.
//!
//! Projects the radial momentum p_r onto the null constraint surface H = 0
//! to correct numerical drift accumulated during integration.

use crate::geodesic::GeodesicState;
use crate::metric::Metric;

/// Renormalize momentum to strictly satisfy H = 0 (null geodesic condition).
///
/// Solves for p_r from the quadratic A*p_r^2 + B*p_r + C = 0,
/// choosing the root closest to the current p_r to maintain ray direction.
pub fn renormalize_null<M: Metric>(state: &mut GeodesicState, metric: &M) {
    let r = state.x[1];
    let theta = state.x[2];
    let g_inv = metric.contravariant(r, theta);
    let g = g_inv.as_array();

    let p_t = state.p[0];
    let p_r = state.p[1];
    let p_th = state.p[2];
    let p_ph = state.p[3];

    // Quadratic in p_r: A*pr^2 + B*pr + C = 0
    let a_quad = g[5]; // g^rr
    let b_quad = 2.0 * (g[1] * p_t + g[7] * p_ph); // 2(g^tr*pt + g^rph*pph)
    let c_quad = g[0] * p_t * p_t
        + g[10] * p_th * p_th
        + g[15] * p_ph * p_ph
        + 2.0 * g[3] * p_t * p_ph;

    if a_quad.abs() > 1e-12 {
        let discriminant = b_quad * b_quad - 4.0 * a_quad * c_quad;
        if discriminant >= 0.0 {
            let sqrt_d = discriminant.sqrt();
            let sol1 = (-b_quad + sqrt_d) / (2.0 * a_quad);
            let sol2 = (-b_quad - sqrt_d) / (2.0 * a_quad);

            // Choose root closest to current p_r
            state.p[1] = if (sol1 - p_r).abs() < (sol2 - p_r).abs() {
                sol1
            } else {
                sol2
            };
        }
    }
}
