//! Conservation laws and Hamiltonian monitoring.
//!
//! In Kerr spacetime, null geodesics have four constants of motion:
//!
//! 1. **Energy** E = -p_t (time translation symmetry)
//! 2. **Angular momentum** L_z = p_phi (axial symmetry)
//! 3. **Carter constant** Q (hidden symmetry, Killing-Yano tensor)
//! 4. **Hamiltonian** H = 0 (null geodesic constraint)

mod constants_of_motion;
mod renormalization;
mod audit;

pub use constants_of_motion::ConstantsOfMotion;
pub use constants_of_motion::compute_constants;
pub use renormalization::renormalize_null;
pub use audit::NumericalAudit;

use crate::geodesic::GeodesicState;
use crate::metric::Metric;

/// Compute the Hamiltonian H = (1/2) g^{mu nu} p_mu p_nu.
///
/// For null geodesics this should be 0. Non-zero values indicate numerical drift.
pub fn hamiltonian<M: Metric>(state: &GeodesicState, metric: &M) -> f64 {
    let g_inv = metric.contravariant(state.x[1], state.x[2]);
    let g = g_inv.as_array();
    let p = &state.p;

    0.5 * (g[0] * p[0] * p[0]
        + g[5] * p[1] * p[1]
        + g[10] * p[2] * p[2]
        + g[15] * p[3] * p[3]
        + 2.0 * g[3] * p[0] * p[3]
        + 2.0 * g[1] * p[0] * p[1]
        + 2.0 * g[7] * p[1] * p[3])
}
