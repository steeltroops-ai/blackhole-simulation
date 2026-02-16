#![allow(clippy::too_many_arguments)]
mod constants;
mod disk;
mod geodesic;
mod kerr;
mod spectrum;
mod derivatives; // Hamiltonian Derivatives
mod invariants; // Conserved quantities
mod integrator; // Adaptive Integrator
mod camera; // Camera EKF

// NEW: Decoupled Physics Kernel Architecture (PHD-Grade)
mod metric; // Spacetime Fabric (Geodesics)
mod matter; // Stress-Energy Fields (T_mu_nu)
mod quantum; // Hawking & Planck Effects

mod tiling; // Tiled Rendering
mod structs; // WebGPU Data Layouts
mod training; // NRS Training Core

use wasm_bindgen::prelude::*;
use js_sys::Float32Array;

// Enable panic hook for better debugging
#[wasm_bindgen]
pub fn init_hooks() {
    console_error_panic_hook::set_once();
}

// Byte offsets for the SAB Layout (v2 Protocol)
// Header
pub const OFFSET_CONTROL: usize = 0;    // [0..63]
pub const OFFSET_CAMERA: usize = 64;    // [64..127]
pub const OFFSET_PHYSICS: usize = 128;  // [128..255]
pub const OFFSET_TELEMETRY: usize = 256;// [256..511]
// Large Data
pub const OFFSET_LUTS: usize = 2048;    // [2048+]

#[wasm_bindgen]
pub struct PhysicsEngine {
    mass: f64,
    spin: f64,
    lut_width: usize,
    lut_buffer: Vec<f32>,
    sab_buffer: Vec<f32>, // Internal buffer (fallback)
    external_sab_ptr: Option<*mut f32>, // Pointer to Worker-shared memory
    camera: camera::CameraState,
    last_good_camera: camera::CameraState, // Phase 5.3: NaN Guard
}

#[wasm_bindgen]
impl PhysicsEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(mass: f64, spin: f64) -> PhysicsEngine {
        PhysicsEngine {
            mass,
            spin,
            lut_width: 512,
            lut_buffer: Vec::new(),
            sab_buffer: vec![0.0; 2048],
            external_sab_ptr: None,
            camera: camera::CameraState::new(),
            last_good_camera: camera::CameraState::new(),
        }
    }

    pub fn attach_sab(&mut self, ptr: *mut f32) {
        self.external_sab_ptr = Some(ptr);
    }

    pub fn update_params(&mut self, mass: f64, spin: f64) {
        self.mass = mass;
        self.spin = spin;
    }

    pub fn compute_horizon(&self) -> f64 {
        kerr::event_horizon(self.mass, self.spin)
    }

    pub fn compute_isco(&self) -> f64 {
        kerr::isco(self.mass, self.spin, true)
    }

    pub fn generate_disk_lut(&mut self) -> Vec<f32> {
        self.lut_buffer = disk::generate_lut(self.mass, self.spin, self.lut_width);
        self.lut_buffer.clone()
    }

    pub fn get_disk_lut_ptr(&self) -> *const f32 {
        self.lut_buffer.as_ptr()
    }

    pub fn get_sab_ptr(&self) -> *const f32 {
        self.sab_buffer.as_ptr()
    }

    pub fn set_camera_state(&mut self, px: f64, py: f64, pz: f64, lx: f64, ly: f64, lz: f64) {
        self.camera.position = glam::DVec3::new(px, py, pz);
        // orientation is derived from lookAt in JS and passed, but here we just update position for now
        // A full conversion would use Quat::from_lookat
    }

    pub fn set_auto_spin(&mut self, enabled: bool) {
        self.camera.auto_spin = enabled;
    }

    // --- New Spectrum Functions ---

    pub fn generate_spectrum_lut(&self, width: usize, height: usize, max_temp: f64) -> Float32Array {
        let data = spectrum::generate_blackbody_lut(width, height, max_temp);
        Float32Array::from(data.as_slice())
    }

    // --- SAB Protocol v2 (Preview) ---
    // This function simulates the SAB read/write loop for now. 
    // In Phase 3, this will read directly from the shared memory pointer.
    // --- SAB Protocol v2 Implementation ---
    // Reads Inputs from SAB -> Updates State -> Writes Outputs to SAB
    // Zero-Copy, High-Performance loop designed for 120Hz ticks.
    // Uses internal SAB buffer (accessed via get_sab_ptr from JS)
    pub fn tick_sab(&mut self, dt_override: f64) {
        let sab_ptr = if let Some(ext_ptr) = self.external_sab_ptr {
            ext_ptr
        } else {
            self.sab_buffer.as_mut_ptr()
        };
        unsafe {
            // 1. READ INPUTS (Control Block)
            // Layout: [0: lock, 1: mouse_dx, 2: mouse_dy, 3: zoom_delta, 4: dt_js]
            let mouse_dx = *sab_ptr.add(OFFSET_CONTROL + 1) as f64;
            let mouse_dy = *sab_ptr.add(OFFSET_CONTROL + 2) as f64;
            let zoom_delta = *sab_ptr.add(OFFSET_CONTROL + 3) as f64;
            // Use JS frame delta if override is 0.0, otherwise use fixed step
            let dt = if dt_override > 0.0 { dt_override } else { *sab_ptr.add(OFFSET_CONTROL + 4) as f64 };

            // Reset input flags (consume the event)
            *sab_ptr.add(OFFSET_CONTROL + 1) = 0.0;
            *sab_ptr.add(OFFSET_CONTROL + 2) = 0.0;
            *sab_ptr.add(OFFSET_CONTROL + 3) = 0.0;

            // 2. UPDATE SIMULATION
            let input = camera::CameraInput {
                mouse_dx,
                mouse_dy,
                zoom_delta,
                dt,
            };
            
            // EKF Prediction Step (Phase 5.3: Includes Soft-Landing Guard)
            camera::update_camera(&input, &mut self.camera);

            if !self.camera.validate() {
                // NaN/Inf Detected: Soft-Landing Recovery
                self.camera = self.last_good_camera;
            } else {
                // Frame is stable, update backup
                self.last_good_camera = self.camera;
            }

            // 3. WRITE OUTPUTS (Camera Block)
            // Layout: [0..2: pos, 4..7: vel, 8..11: quat]
            // Position (x, y, z)
            *sab_ptr.add(OFFSET_CAMERA) = self.camera.position.x as f32;
            *sab_ptr.add(OFFSET_CAMERA + 1) = self.camera.position.y as f32;
            *sab_ptr.add(OFFSET_CAMERA + 2) = self.camera.position.z as f32;

            // Velocity (vx, vy, vz)
            *sab_ptr.add(OFFSET_CAMERA + 4) = self.camera.velocity.x as f32;
            *sab_ptr.add(OFFSET_CAMERA + 5) = self.camera.velocity.y as f32;
            *sab_ptr.add(OFFSET_CAMERA + 6) = self.camera.velocity.z as f32;

            // Orientation Quaternion (x, y, z, w)
            *sab_ptr.add(OFFSET_CAMERA + 8) = self.camera.orientation.x as f32;
            *sab_ptr.add(OFFSET_CAMERA + 9) = self.camera.orientation.y as f32;
            *sab_ptr.add(OFFSET_CAMERA + 10) = self.camera.orientation.z as f32;
            *sab_ptr.add(OFFSET_CAMERA + 11) = self.camera.orientation.w as f32;

            // 4. WRITE PHYSICS CONSTANTS (Physics Block)
            // Useful for shaders to read direct from SAB
            *sab_ptr.add(OFFSET_PHYSICS) = self.compute_horizon() as f32;
            *sab_ptr.add(OFFSET_PHYSICS + 1) = self.compute_isco() as f32;
            *sab_ptr.add(OFFSET_PHYSICS + 2) = self.mass as f32;
            *sab_ptr.add(OFFSET_PHYSICS + 3) = self.spin as f32;

            // 5. UPDATE SEQUENCE (Consistency Guard)
            *sab_ptr.add(OFFSET_TELEMETRY) += 1.0;
        }
    }
    
    pub fn get_sab_layout(&self) -> Vec<usize> {
        vec![OFFSET_CONTROL, OFFSET_CAMERA, OFFSET_PHYSICS, OFFSET_TELEMETRY, OFFSET_LUTS]
    }

    /// Ground Truth Geodesic Integration (Phase 5 End-to-End)
    /// Performs high-precision adaptive integration for a single ray.
    /// Returns [t, r, theta, phi, pt, pr, ptheta, pphi]
    pub fn integrate_ray_relativistic(
        &self, 
        initial_state: Vec<f64>, // [t, r, theta, phi, pt, pr, ptheta, pphi]
        steps: usize,
        tolerance: f64
    ) -> Vec<f64> {
        if initial_state.len() < 8 { return initial_state; }
        
        // 1. Initialize State
        let mut state = geodesic::RayStateRelativistic::new(
            initial_state[0], initial_state[1], initial_state[2], initial_state[3],
            initial_state[4], initial_state[5], initial_state[6], initial_state[7]
        );
        
        // 2. Initialize Stepper
        let mut stepper = integrator::AdaptiveStepper::new(tolerance);
        let mut h = 0.01; // Initial Guess
        
        let horizon = self.compute_horizon();

        // 3. Integration Loop
        for _ in 0..steps {
            // Adaptive Step
            h = stepper.step(&mut state, self.mass, self.spin, h);
            
            // Numerical Regularization (Phase 5.1)
            invariants::renormalize_momentum(&mut state, self.mass, self.spin);
            
            // Check termination conditions
            let r = state.x[1];
            if r < horizon * 1.001 { break; } // Hit Horizon
            if r > 1000.0 { break; } // Escaped
        }
        
        // 4. Return Final State
        vec![
            state.x[0], state.x[1], state.x[2], state.x[3],
            state.p[0], state.p[1], state.p[2], state.p[3]
        ]
    }
}
