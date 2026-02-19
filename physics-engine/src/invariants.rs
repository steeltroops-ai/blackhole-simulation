#![allow(dead_code)]
/// Invariants and Conservation Laws
///
/// Monitor and correct numerical drift using the constants of motion:
/// 1. Energy (E) - Conserved via Time Translation Symmetry
/// 2. Angular Momentum (Lz) - Conserved via Axial Symmetry
/// 3. Carter Constant (Q) - Conserved via Hidden Symmetry (Killing-Yano Tensor)
/// 4. Hamiltonian (H) - Conserved (= 0 for null geodesics)

use num_complex::Complex64;
use crate::metric::Metric;
use crate::geodesic::RayStateRelativistic;

#[derive(Debug, Clone, Copy)]
pub struct ConstantsOfMotion {
    pub energy: f64,
    pub angular_momentum: f64,
    pub carter_constant: f64,
    pub hamiltonian: f64,
    pub walker_penrose: Complex64,
}

pub fn calculate_constants<M: Metric>(state: &RayStateRelativistic, metric: &M) -> ConstantsOfMotion {
    let p_t = state.p[0];
    let p_r = state.p[1];
    let p_th = state.p[2];
    let p_ph = state.p[3];
    
    let r = state.x[1];
    let theta = state.x[2];
    
    let mass = metric.get_mass();
    let spin = metric.get_spin();
    let a = spin * mass;
    let cos_theta = theta.cos();
    let sin_theta = theta.sin();
    let sin2 = sin_theta * sin_theta;
    
    // E = -p_t, Lz = p_phi
    let energy = -p_t;
    let angular_momentum = p_ph;
    
    // Carter Constant Q (Null geodesic case)
    let e2 = energy * energy;
    let lz2 = angular_momentum * angular_momentum;
    let lz_term = if sin2 < 1e-12 { 0.0 } else { lz2 / sin2 };
    let carter = p_th * p_th + cos_theta * cos_theta * (lz_term - a * a * e2);
    
    // Hamiltonian H
    let g_inv = metric.g_contravariant(r, theta);
    let h = 0.5 * (
        g_inv[0] * p_t * p_t +
        g_inv[5] * p_r * p_r +
        g_inv[10] * p_th * p_th +
        g_inv[15] * p_ph * p_ph +
        2.0 * g_inv[3] * p_t * p_ph +
        2.0 * g_inv[1] * p_t * p_r +  // tr
        2.0 * g_inv[7] * p_r * p_ph   // rphi
    );

    // --- Walker-Penrose Constant (Phase 5.1 surrogate) ---
    // In Kerr geometry, (r - i a cos theta) is the complex coordinate factor.
    let rho_inv = Complex64::new(r, a * cos_theta);
    
    // The complex conserved quantity for null geodesics is related to Carter's Q.
    let walker_penrose = rho_inv * carter.max(0.0).sqrt();

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
pub fn renormalize_momentum<M: Metric>(state: &mut RayStateRelativistic, metric: &M) {
    let r = state.x[1];
    let theta = state.x[2];
    let g_inv = metric.g_contravariant(r, theta);
    
    let p_t = state.p[0];
    let p_r = state.p[1];
    let p_th = state.p[2];
    let p_ph = state.p[3];

    // Solve for p_r such that H = 0 (for null geodesics)
    // 0 = g^tt pt^2 + g^rr pr^2 + g^thth pth^2 + g^phph pph^2 + 2(g^tr pt pr + g^tph pt pph + g^rph pr pph)
    // Rearrange as quadratic in pr: A pr^2 + B pr + C = 0
    let a_quad = g_inv[5]; // g^rr
    let b_quad = 2.0 * (g_inv[1] * p_t + g_inv[7] * p_ph); // 2(g^tr pt + g^rph pph)
    let c_quad = g_inv[0] * p_t * p_t +
                 g_inv[10] * p_th * p_th +
                 g_inv[15] * p_ph * p_ph +
                 2.0 * g_inv[3] * p_t * p_ph;

    if a_quad.abs() > 1e-12 {
        let discriminant = b_quad * b_quad - 4.0 * a_quad * c_quad;
        if discriminant >= 0.0 {
            // Two solutions: pr = (-B +/- sqrt(D)) / 2A
            let sqrt_d = discriminant.sqrt();
            let sol1 = (-b_quad + sqrt_d) / (2.0 * a_quad);
            let sol2 = (-b_quad - sqrt_d) / (2.0 * a_quad);
            
            // Choose solution closest to current p_r to maintain direction
            state.p[1] = if (sol1 - p_r).abs() < (sol2 - p_r).abs() { sol1 } else { sol2 };
        }
    }
}
