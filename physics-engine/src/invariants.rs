/// Invariants and Conservation Laws
///
/// Monitor and correct numerical drift using the constants of motion:
/// 1. Energy (E) - Conserved via Time Translation Symmetry
/// 2. Angular Momentum (Lz) - Conserved via Axial Symmetry
/// 3. Carter Constant (Q) - Conserved via Hidden Symmetry (Killing-Yano Tensor)
/// 4. Hamiltonian (H) - Conserved (= 0 for null geodesics)

use num_complex::Complex64;
use crate::kerr;
use crate::geodesic::RayStateRelativistic;

#[derive(Debug, Clone, Copy)]
pub struct ConstantsOfMotion {
    pub energy: f64,
    pub angular_momentum: f64,
    pub carter_constant: f64,
    pub hamiltonian: f64,
    pub walker_penrose: Complex64,
}

pub fn calculate_constants(state: &RayStateRelativistic, mass: f64, spin: f64) -> ConstantsOfMotion {
    let p_t = state.p[0];
    let p_r = state.p[1];
    let p_th = state.p[2];
    let p_ph = state.p[3];
    
    let r = state.x[1];
    let theta = state.x[2];
    
    let a = spin * mass;
    let cos_theta = theta.cos();
    let sin_theta = theta.sin();
    let sin2 = sin_theta * sin_theta;
    
    let _delta = r * r - 2.0 * mass * r + a * a;
    
    // E = -p_t, Lz = p_phi
    let energy = -p_t;
    let angular_momentum = p_ph;
    
    // Carter Constant Q (Null geodesic case)
    let e2 = energy * energy;
    let lz2 = angular_momentum * angular_momentum;
    let lz_term = if sin2 < 1e-9 { 0.0 } else { lz2 / sin2 };
    let carter = p_th * p_th + cos_theta * cos_theta * (lz_term - a * a * e2);
    
    // Hamiltonian H
    let g_inv = kerr::metric_inverse_bl(r, theta, mass, spin);
    let h = 0.5 * (
        g_inv[0] * p_t * p_t +
        g_inv[5] * p_r * p_r +
        g_inv[10] * p_th * p_th +
        g_inv[15] * p_ph * p_ph +
        2.0 * g_inv[3] * p_t * p_ph
    );

    // --- Walker-Penrose Constant (Phase 5.1 surrogate) ---
    // In Kerr geometry, (r - i a cos theta) is the complex coordinate factor.
    let rho_inv = Complex64::new(r, a * cos_theta);
    
    // The complex conserved quantity for null geodesics is related to Carter's Q.
    // We store the complex root that combines r and theta effects.
    let walker_penrose = rho_inv * carter.sqrt();

    ConstantsOfMotion {
        energy,
        angular_momentum,
        carter_constant: carter,
        hamiltonian: h,
        walker_penrose,
    }
}

/// Renormalize momentum to strictly satisfy H = 0 (Null Geodesic Condition)
/// Projects p_r to satisfy the constraint, assuming E and Lz are exact.
pub fn renormalize_momentum(state: &mut RayStateRelativistic, mass: f64, spin: f64) {
    let consts = calculate_constants(state, mass, spin);
    let h_err = consts.hamiltonian; // Should be 0
    
    if h_err.abs() > 1e-9 {
        // Adjust p_r to zero out H
        // H = 0.5 * (g^rr p_r^2 + terms_fixed)
        // g^rr p_r^2 = -terms_fixed
        // p_r = +/- sqrt(-terms_fixed / g^rr)
        
        // Let's correct p_r to match the sign of current p_r
        
        let p_t = state.p[0];
        let p_r = state.p[1];
        let p_th = state.p[2];
        let p_ph = state.p[3];
        
        let r = state.x[1];
        let theta = state.x[2];
        
        let g_inv = kerr::metric_inverse_bl(r, theta, mass, spin);
        let g_tt = g_inv[0];
        let g_tph = g_inv[3];
        let g_rr = g_inv[5];
        let g_thth = g_inv[10];
        let g_phph = g_inv[15];
        
        let fixed_terms = g_tt * p_t * p_t +
                          g_thth * p_th * p_th +
                          g_phph * p_ph * p_ph +
                          2.0 * g_tph * p_t * p_ph;
                          
        // We need g^rr * p_r_new^2 + fixed_terms = 0
        // p_r_new^2 = -fixed_terms / g^rr
        
        if g_rr.abs() > 1e-12 {
            let target_sq = -fixed_terms / g_rr;
            if target_sq >= 0.0 {
                let p_r_new = target_sq.sqrt();
                // Set sign to match current direction
                state.p[1] = if p_r < 0.0 { -p_r_new } else { p_r_new };
            }
        }
    }
}
