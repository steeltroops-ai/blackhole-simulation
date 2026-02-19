#![allow(dead_code)]
/// Geodesic Integrators
///
/// Implements high-precision integration schemes for ray tracing in Kerr metric.
/// Used for ground-truth validation of shader approximations.

use crate::metric::Metric;
use glam::DVec3;

// --- Legacy Newtonian State (Deprecated) ---
#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct RayStateNewtonian {
    pub pos: DVec3,
    pub vel: DVec3,
}

#[repr(C)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum TerminationReason {
    None,
    Horizon,
    Singularity,
    Escape,
}

/// Relativistic Phase Space State (8D)
/// Coordinates: Boyer-Lindquist or Kerr-Schild (t, r, theta, phi)
/// Momentum: Covariant p_mu (p_t, p_r, p_theta, p_phi)
#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct RayStateRelativistic {
    pub x: [f64; 4], // x^mu
    pub p: [f64; 4], // p_mu
}

impl RayStateRelativistic {
    pub fn check_termination<M: Metric>(&self, metric: &M) -> TerminationReason {
        let r = self.x[1];
        let rh = metric.get_horizon_radius();
        
        // 1. Horizon capture: stop slightly before singularity/horizon to avoid NaNs
        // We use a safe margin for Boyer-Lindquist.
        if r < 1.001 * rh {
            return TerminationReason::Horizon;
        }
        
        // 2. Escape condition
        if r > 1000.0 {
            return TerminationReason::Escape;
        }
        
        TerminationReason::None
    }
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
pub fn get_state_derivative<M: Metric>(state: &RayStateRelativistic, metric: &M) -> RayStateRelativistic {
    let r = state.x[1];
    let theta = state.x[2];
    
    // 1. Get Inverse Metric g^mu_nu
    let g_inv = metric.g_contravariant(r, theta);
    
    // 2. Compute dx^mu/dlambda = g^mu_nu * p_nu
    let g_tt = g_inv[0];
    let g_tr = g_inv[1];
    let g_tph = g_inv[3];
    let g_rt = g_inv[4];
    let g_rr = g_inv[5];
    let g_rph = g_inv[7];
    let g_thth = g_inv[10];
    let g_pht = g_inv[12];
    let g_phr = g_inv[13];
    let g_phph = g_inv[15];
    
    let p_t = state.p[0];
    let p_r = state.p[1];
    let p_th = state.p[2];
    let p_ph = state.p[3];
    
    // Velocity dx/dlambda (General for non-diagonal metrics like Kerr-Schild)
    let dt = g_tt * p_t + g_tr * p_r + g_tph * p_ph;
    let dr = g_rt * p_t + g_rr * p_r + g_rph * p_ph;
    let dth = g_thth * p_th;
    let dph = g_pht * p_t + g_phr * p_r + g_phph * p_ph;
    
    // 3. Compute dp_mu/dlambda = -dH/dx^mu
    let derivs = metric.calculate_hamiltonian_derivatives(r, theta, state.p);
    
    RayStateRelativistic {
        x: [dt, dr, dth, dph],
        p: [0.0, -derivs.dh_dr, -derivs.dh_dtheta, 0.0],
    }
}

/// Adaptive RKF45 Step specialized for Kerr Geodesics
pub fn rkf45_step<M: Metric>(state: &RayStateRelativistic, metric: &M, h: f64) -> (RayStateRelativistic, f64) {
    let k1 = get_state_derivative(state, metric);
    
    let k2_state = state.add_k1(k1, h / 4.0);
    let k2 = get_state_derivative(&k2_state, metric);
    
    let k3_state = state.add_k2(k1, 3.0 * h / 32.0, k2, 9.0 * h / 32.0);
    let k3 = get_state_derivative(&k3_state, metric);
    
    let k4_state = state.add_k3(k1, 1932.0 * h / 2197.0, k2, -7200.0 * h / 2197.0, k3, 7296.0 * h / 2197.0);
    let k4 = get_state_derivative(&k4_state, metric);
    
    let k5_state = state.add_k4(k1, 439.0 * h / 216.0, k2, -8.0 * h, k3, 3680.0 * h / 513.0, k4, -845.0 * h / 4104.0);
    let k5 = get_state_derivative(&k5_state, metric);
    
    let k6_state = state.add_k5(k1, -8.0 * h / 27.0, k2, 2.0 * h, k3, -3544.0 * h / 2565.0, k4, 1859.0 * h / 4104.0, k5, -11.0 * h / 40.0);
    let k6 = get_state_derivative(&k6_state, metric);

    // 5th order solution
    let mut final_state = *state;
    for i in 0..4 {
        final_state.x[i] += h * (16.0/135.0 * k1.x[i] + 6656.0/12825.0 * k3.x[i] + 28561.0/56430.0 * k4.x[i] - 9.0/50.0 * k5.x[i] + 2.0/55.0 * k6.x[i]);
        final_state.p[i] += h * (16.0/135.0 * k1.p[i] + 6656.0/12825.0 * k3.p[i] + 28561.0/56430.0 * k4.p[i] - 9.0/50.0 * k5.p[i] + 2.0/55.0 * k6.p[i]);
    }

    // Error estimate (diff between 4th and 5th order)
    let mut error = 0.0f64;
    for i in 0..4 {
        let err_x = h * ( (16.0/135.0 - 25.0/216.0) * k1.x[i] +
                          (6656.0/12825.0 - 1408.0/2565.0) * k3.x[i] +
                          (28561.0/56430.0 - 2197.0/4104.0) * k4.x[i] +
                          (-9.0/50.0 + 1.0/5.0) * k5.x[i] +
                          2.0/55.0 * k6.x[i] );
        error = error.max(err_x.abs());
    }

    (final_state, error)
}

/// Runge-Kutta 4th Order Step (RK4)
/// General purpose high-order integrator for non-separable Hamiltonians.
pub fn step_rk4<M: Metric>(state: &mut RayStateRelativistic, metric: &M, h: f64) {
    let k1 = get_state_derivative(state, metric);
    
    let state_k2 = state.add_k1(k1, 0.5 * h);
    let k2 = get_state_derivative(&state_k2, metric);
    
    let state_k3 = state.add_k1(k2, 0.5 * h);
    let k3 = get_state_derivative(&state_k3, metric);
    
    let state_k4 = state.add_k1(k3, h);
    let k4 = get_state_derivative(&state_k4, metric);
    
    for i in 0..4 {
        state.x[i] += (h / 6.0) * (k1.x[i] + 2.0 * k2.x[i] + 2.0 * k3.x[i] + k4.x[i]);
        state.p[i] += (h / 6.0) * (k1.p[i] + 2.0 * k2.p[i] + 2.0 * k3.p[i] + k4.p[i]);
    }
}

impl RayStateRelativistic {
    pub fn add_k1(&self, k1: Self, s1: f64) -> Self {
        let mut n = *self;
        for i in 0..4 {
            n.x[i] += k1.x[i] * s1;
            n.p[i] += k1.p[i] * s1;
        }
        n
    }
    pub fn add_k2(&self, k1: Self, s1: f64, k2: Self, s2: f64) -> Self {
        let mut n = *self;
        for i in 0..4 {
            n.x[i] += k1.x[i] * s1 + k2.x[i] * s2;
            n.p[i] += k1.p[i] * s1 + k2.p[i] * s2;
        }
        n
    }
    pub fn add_k3(&self, k1: Self, s1: f64, k2: Self, s2: f64, k3: Self, s3: f64) -> Self {
        let mut n = *self;
        for i in 0..4 {
            n.x[i] += k1.x[i] * s1 + k2.x[i] * s2 + k3.x[i] * s3;
            n.p[i] += k1.p[i] * s1 + k2.p[i] * s2 + k3.p[i] * s3;
        }
        n
    }
    pub fn add_k4(&self, k1: Self, s1: f64, k2: Self, s2: f64, k3: Self, s3: f64, k4: Self, s4: f64) -> Self {
        let mut n = *self;
        for i in 0..4 {
            n.x[i] += k1.x[i] * s1 + k2.x[i] * s2 + k3.x[i] * s3 + k4.x[i] * s4;
            n.p[i] += k1.p[i] * s1 + k2.p[i] * s2 + k3.p[i] * s3 + k4.p[i] * s4;
        }
        n
    }
    pub fn add_k5(&self, k1: Self, s1: f64, k2: Self, s2: f64, k3: Self, s3: f64, k4: Self, s4: f64, k5: Self, s5: f64) -> Self {
        let mut n = *self;
        for i in 0..4 {
            n.x[i] += k1.x[i] * s1 + k2.x[i] * s2 + k3.x[i] * s3 + k4.x[i] * s4 + k5.x[i] * s5;
            n.p[i] += k1.p[i] * s1 + k2.p[i] * s2 + k3.p[i] * s3 + k4.p[i] * s4 + k5.p[i] * s5;
        }
        n
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
