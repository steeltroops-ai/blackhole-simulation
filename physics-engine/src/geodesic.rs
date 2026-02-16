/// Geodesic Integrators
///
/// Implements high-precision integration schemes for ray tracing in Kerr metric.
/// Used for ground-truth validation of shader approximations.

use crate::derivatives;
use crate::kerr;
use glam::DVec3;

// --- Legacy Newtonian State (Deprecated) ---
#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct RayStateNewtonian {
    pub pos: DVec3,
    pub vel: DVec3,
}

/// Relativistic Phase Space State (8D)
/// Coordinates: Boyer-Lindquist (t, r, theta, phi)
/// Momentum: Covariant p_mu (p_t, p_r, p_theta, p_phi)
#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct RayStateRelativistic {
    pub x: [f64; 4], // x^mu
    pub p: [f64; 4], // p_mu
}

impl RayStateRelativistic {
    pub fn new(t: f64, r: f64, theta: f64, phi: f64, pt: f64, pr: f64, pth: f64, pph: f64) -> Self {
        Self {
            x: [t, r, theta, phi],
            p: [pt, pr, pth, pph],
        }
    }
}

/// Calculate the time derivative of the state vector (Hamiltonian equations)
/// dy/dlambda = f(y)
/// where y = (x^mu, p_mu)
pub fn get_state_derivative(state: &RayStateRelativistic, mass: f64, spin: f64) -> RayStateRelativistic {
    let r = state.x[1];
    let theta = state.x[2];
    
    // 1. Get Inverse Metric g^mu_nu
    let g_inv = kerr::metric_inverse_bl(r, theta, mass, spin);
    
    // 2. Compute dx^mu/dlambda = g^mu_nu * p_nu (contravariant velocity)
    let g_tt = g_inv[0];
    let g_tph = g_inv[3];
    let g_rr = g_inv[5];
    let g_thth = g_inv[10];
    let g_phph = g_inv[15];
    
    let p_t = state.p[0];
    let p_r = state.p[1];
    let p_th = state.p[2];
    let p_ph = state.p[3];
    
    // Velocity dx/dlambda (using Hamiltonian p_mu as momentum)
    let dt = g_tt * p_t + g_tph * p_ph;
    let dr = g_rr * p_r;
    let dth = g_thth * p_th;
    let dph = g_tph * p_t + g_phph * p_ph;
    
    // 3. Compute dp_mu/dlambda = -dH/dx^mu
    // dH/dt = 0, dH/dphi = 0 (stationarity and axisymmetry)
    let derivs = derivatives::calculate_derivatives(r, theta, state.p, mass, spin);
    
    RayStateRelativistic {
        x: [dt, dr, dth, dph],
        p: [0.0, -derivs.dh_dr, -derivs.dh_dtheta, 0.0],
    }
}


/// Runge-Kutta 4th Order Step (RK4)
/// General purpose high-order integrator for non-separable Hamiltonians.
pub fn step_rk4(state: &mut RayStateRelativistic, mass: f64, spin: f64, h: f64) {
    // k1 = f(y)
    let k1 = get_state_derivative(state, mass, spin);
    
    // k2 = f(y + h/2 * k1)
    let state_k2 = RayStateRelativistic {
        x: [
            state.x[0] + 0.5 * h * k1.x[0],
            state.x[1] + 0.5 * h * k1.x[1],
            state.x[2] + 0.5 * h * k1.x[2],
            state.x[3] + 0.5 * h * k1.x[3]
        ],
        p: [
            state.p[0] + 0.5 * h * k1.p[0],
            state.p[1] + 0.5 * h * k1.p[1],
            state.p[2] + 0.5 * h * k1.p[2],
            state.p[3] + 0.5 * h * k1.p[3]
        ]
    };
    let k2 = get_state_derivative(&state_k2, mass, spin);
    
    // k3 = f(y + h/2 * k2)
    let state_k3 = RayStateRelativistic {
        x: [
            state.x[0] + 0.5 * h * k2.x[0],
            state.x[1] + 0.5 * h * k2.x[1],
            state.x[2] + 0.5 * h * k2.x[2],
            state.x[3] + 0.5 * h * k2.x[3]
        ],
        p: [
            state.p[0] + 0.5 * h * k2.p[0],
            state.p[1] + 0.5 * h * k2.p[1],
            state.p[2] + 0.5 * h * k2.p[2],
            state.p[3] + 0.5 * h * k2.p[3]
        ]
    };
    let k3 = get_state_derivative(&state_k3, mass, spin);
    
    // k4 = f(y + h * k3)
    let state_k4 = RayStateRelativistic {
        x: [
            state.x[0] + h * k3.x[0],
            state.x[1] + h * k3.x[1],
            state.x[2] + h * k3.x[2],
            state.x[3] + h * k3.x[3]
        ],
        p: [
            state.p[0] + h * k3.p[0],
            state.p[1] + h * k3.p[1],
            state.p[2] + h * k3.p[2],
            state.p[3] + h * k3.p[3]
        ]
    };
    let k4 = get_state_derivative(&state_k4, mass, spin);
    
    // Combine: y_new = y + h/6 (k1 + 2k2 + 2k3 + k4)
    for i in 0..4 {
        state.x[i] += (h / 6.0) * (k1.x[i] + 2.0 * k2.x[i] + 2.0 * k3.x[i] + k4.x[i]);
        state.p[i] += (h / 6.0) * (k1.p[i] + 2.0 * k2.p[i] + 2.0 * k3.p[i] + k4.p[i]);
    }
}

// Keep acceleration_kerr for legacy potential-based tests if needed, but warn
pub fn acceleration_kerr(pos: DVec3, _vel: DVec3, mass: f64, _spin: f64) -> DVec3 {
    let r = pos.length();
    let r2 = r * r;
    // Newtonian term (monopole)
    let newton = -mass / r2;
    // Lensing term (approximate 2M/r correction for light)
    let lens_factor = 1.0 + 3.0 * mass / r;
    let accel_mag = newton * lens_factor;
    pos.normalize() * accel_mag
}

// Deprecated symplectic step
pub fn step_velocity_verlet(state: &mut RayStateNewtonian, mass: f64, spin: f64, dt: f64) {
    let acc_start = acceleration_kerr(state.pos, state.vel, mass, spin);
    let v_half = state.vel + acc_start * (0.5 * dt);
    state.pos += v_half * dt;
    let acc_end = acceleration_kerr(state.pos, v_half, mass, spin);
    state.vel = v_half + acc_end * (0.5 * dt);
}
