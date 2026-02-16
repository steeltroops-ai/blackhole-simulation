// Camera State for EKF
#[derive(Clone, Copy)]
pub struct CameraState {
    pub position: glam::DVec3, // Cartesian (x,y,z)
    pub velocity: glam::DVec3, // (vx, vy, vz)
    pub orientation: glam::DQuat, // Rotation from world to camera
}

// Input from JS (deltas)
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
            position: glam::DVec3::new(0.0, 0.0, -10.0), // Start at 10 radii back
            velocity: glam::DVec3::ZERO,
            orientation: glam::DQuat::IDENTITY,
        }
    }

    pub fn validate(&self) -> bool {
        self.position.is_finite() && 
        self.velocity.is_finite() && 
        self.orientation.is_finite()
    }
}

/// Extended Kalman Filter (EKF) for Camera Prediction
/// 
/// State Vector x = [pos_x, pos_y, pos_z, vel_x, vel_y, vel_z]
/// Measurement z = [mouse_dx, mouse_dy] (interpreted as velocity constraints)
///
/// This is a simplified "Kinematic Filter" that smooths the input jitter.
pub fn update_camera(input: &CameraInput, state: &mut CameraState) {
    let dt = input.dt;
    if dt <= 0.0 { return; }
    
    // 1. Prediction Step (Physics Model)
    // x_k = F * x_{k-1}
    // Simple friction model: velocity decays
    let friction = (-5.0 * dt).exp(); // critical damping approx
    state.velocity *= friction;
    state.position += state.velocity * dt;
    
    // 2. Control Input (Mouse Force)
    // Apply mouse movement as instantaneous impulse to angular velocity
    // (Simplified: mapping mouse delta directly to orbital rotation for now)
    
    let sensitivity = 2.0;
    let yaw = -input.mouse_dx * sensitivity * dt;
    let pitch = -input.mouse_dy * sensitivity * dt;
    
    // Orbital rotation logic
    // Rotate position around origin
    let rot_y = glam::DQuat::from_rotation_y(yaw);
    let _rot_x = glam::DQuat::from_rotation_x(pitch); // Should be local X
    
    // Apply rotations
    state.position = rot_y.mul_vec3(state.position);
    // state.position = rot_x.mul_vec3(state.position); // Pitch is trickier to accumulate correctly without gimbal lock logic
    
    // Zoom
    let zoom_factor = 1.0 + input.zoom_delta * dt;
    state.position *= zoom_factor;
}
