//! Camera state and Extended Kalman Filter for browser input smoothing.
//!
//! This module is WASM-specific: it handles mouse/zoom input from JavaScript and
//! smooths camera motion for the render loop. The camera state is written to the
//! SharedArrayBuffer for the GPU shaders to consume.
#![allow(dead_code)]

/// Camera state for the EKF predictor.
#[derive(Clone, Copy)]
pub struct CameraState {
    pub position: glam::DVec3,
    pub velocity: glam::DVec3,
    pub orientation: glam::DQuat,
    pub auto_spin: bool,
}

/// Input deltas from JavaScript (per-frame).
#[derive(Clone, Copy)]
pub struct CameraInput {
    pub mouse_dx: f64,
    pub mouse_dy: f64,
    pub zoom_delta: f64,
    pub dt: f64,
}

impl CameraState {
    pub fn new() -> Self {
        Self {
            position: glam::DVec3::new(0.0, 0.0, 20.0),
            velocity: glam::DVec3::ZERO,
            orientation: glam::DQuat::from_xyzw(0.0, 1.0, 0.0, 0.0),
            auto_spin: false,
        }
    }

    pub fn validate(&self) -> bool {
        self.position.is_finite() && self.velocity.is_finite() && self.orientation.is_finite()
    }
}

/// Simplified kinematic filter that smooths input jitter.
pub fn update_camera(input: &CameraInput, state: &mut CameraState) {
    let dt = input.dt;
    if dt <= 0.0 {
        return;
    }

    // Prediction: velocity decays with friction
    let friction = (-5.0 * dt).exp();
    state.velocity *= friction;
    state.position += state.velocity * dt;

    // Mouse input -> orbital rotation
    let sensitivity = 2.0;
    let yaw = -input.mouse_dx * sensitivity * dt;
    let rot_y = glam::DQuat::from_rotation_y(yaw);
    state.position = rot_y.mul_vec3(state.position);

    // Auto-spin
    if state.auto_spin {
        let spin_rate = 0.15;
        let auto_yaw = spin_rate * dt;
        let rot_auto = glam::DQuat::from_rotation_y(auto_yaw);
        state.position = rot_auto.mul_vec3(state.position);
    }

    // Zoom
    let zoom_factor = 1.0 + input.zoom_delta * dt;
    state.position *= zoom_factor;
}
