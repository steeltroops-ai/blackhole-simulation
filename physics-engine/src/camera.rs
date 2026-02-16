// Camera State for EKF
#[derive(Clone, Copy)]
pub struct CameraState {
    pub position: glam::DVec3, // Cartesian (x,y,z)
    pub velocity: glam::DVec3, // (vx, vy, vz)
    pub orientation: glam::DQuat, // Rotation from world to camera
    pub auto_spin: bool, // Auto-orbiting enabled
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
            auto_spin: false,
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
    
    let sensitivity = 2.0;
    let yaw = -input.mouse_dx * sensitivity * dt;
    // let pitch = -input.mouse_dy * sensitivity * dt; // Pitch disabled for stability in basic orbit
    
    // Orbital rotation logic
    let rot_y = glam::DQuat::from_rotation_y(yaw);
    state.position = rot_y.mul_vec3(state.position);
    
    // 3. Auto-Spin Logic
    if state.auto_spin {
        let spin_rate = 0.15; // rad/s
        let auto_yaw = spin_rate * dt;
        let rot_auto = glam::DQuat::from_rotation_y(auto_yaw);
        state.position = rot_auto.mul_vec3(state.position);
    }
    
    // Zoom
    let zoom_factor = 1.0 + input.zoom_delta * dt;
    state.position *= zoom_factor;
}
