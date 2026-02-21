//! Constants of motion in Kerr spacetime.

use crate::geodesic::GeodesicState;
use crate::metric::Metric;
use num_complex::Complex64;

/// The four constants of motion for a null geodesic in Kerr spacetime.
#[derive(Debug, Clone, Copy)]
pub struct ConstantsOfMotion {
    /// Conserved energy E = -p_t.
    pub energy: f64,
    /// Conserved angular momentum L_z = p_phi.
    pub angular_momentum: f64,
    /// Carter constant Q (from the Killing-Yano tensor).
    pub carter_constant: f64,
    /// Hamiltonian H = (1/2) g^{mu nu} p_mu p_nu (should be 0 for null rays).
    pub hamiltonian: f64,
    /// Walker-Penrose constant (complex, conserved for null geodesics).
    pub walker_penrose: Complex64,
}

/// Compute all constants of motion for a geodesic state.
pub fn compute_constants<M: Metric>(state: &GeodesicState, metric: &M) -> ConstantsOfMotion {
    let p_t = state.p[0];
    let p_th = state.p[2];
    let p_ph = state.p[3];

    let r = state.x[1];
    let theta = state.x[2];

    let m = metric.mass();
    let spin = metric.spin();
    let a = spin * m;
    let cos_theta = theta.cos();
    let sin_theta = theta.sin();
    let sin2 = sin_theta * sin_theta;

    let energy = -p_t;
    let angular_momentum = p_ph;

    // Carter constant Q (null geodesic)
    let e2 = energy * energy;
    let lz2 = angular_momentum * angular_momentum;
    let lz_term = if sin2 < 1e-12 { 0.0 } else { lz2 / sin2 };
    let carter = p_th * p_th + cos_theta * cos_theta * (lz_term - a * a * e2);

    // Hamiltonian
    let h = crate::invariants::hamiltonian(state, metric);

    // Walker-Penrose constant
    let rho_inv = Complex64::new(r, a * cos_theta);
    let walker_penrose = rho_inv * carter.max(0.0).sqrt();

    ConstantsOfMotion {
        energy,
        angular_momentum,
        carter_constant: carter,
        hamiltonian: h,
        walker_penrose,
    }
}
