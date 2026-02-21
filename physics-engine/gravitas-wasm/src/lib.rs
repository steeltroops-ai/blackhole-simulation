//! gravitas-wasm: WebAssembly bridge for the Gravitas GR physics engine.
//!
//! This crate wraps `gravitas-core` and exposes it to JavaScript via wasm-bindgen.
//! All physics computation is delegated to the core library.
//! This crate only handles:
//!   - SharedArrayBuffer (SAB) protocol
//!   - Camera EKF (browser-specific input handling)
//!   - WebGPU data layout structs
#![allow(clippy::too_many_arguments)]
#![allow(dead_code)]
#![allow(unused_imports)]
#![allow(unused_mut)]
#![allow(unused_variables)]

mod camera;
mod sab;

use gravitas::metric::{Kerr, Metric, Orbit};
use gravitas::metric::kerr::CoordinateSystem;
use gravitas::geodesic::{GeodesicState, IntegrationOptions, IntegrationMethod, AdaptiveStepper, integrate};
use gravitas::invariants;
use gravitas::physics::{disk, spectrum};

use js_sys::Float32Array;
use wasm_bindgen::prelude::*;

// Enable panic hook for better debugging
#[wasm_bindgen]
pub fn init_hooks() {
    console_error_panic_hook::set_once();
}

// SAB byte offsets (v2 Protocol)
pub const OFFSET_CONTROL: usize = 0;
pub const OFFSET_CAMERA: usize = 64;
pub const OFFSET_PHYSICS: usize = 128;
pub const OFFSET_TELEMETRY: usize = 256;
pub const OFFSET_LUTS: usize = 2048;

#[wasm_bindgen]
pub struct PhysicsEngine {
    mass: f64,
    spin: f64,
    metric_bl: Kerr,
    metric_ks: Kerr,
    lut_width: usize,
    lut_buffer: Vec<f32>,
    sab_buffer: Vec<f32>,
    external_sab_ptr: Option<*mut f32>,
    camera: camera::CameraState,
    last_good_camera: camera::CameraState,
}

#[wasm_bindgen]
impl PhysicsEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(mass: f64, spin: f64) -> PhysicsEngine {
        PhysicsEngine {
            mass,
            spin,
            metric_bl: Kerr::new(mass, spin),
            metric_ks: Kerr::kerr_schild(mass, spin),
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
        self.metric_bl = Kerr::new(mass, spin);
        self.metric_ks = Kerr::kerr_schild(mass, spin);
    }

    pub fn compute_horizon(&self) -> f64 {
        self.metric_bl.event_horizon()
    }

    pub fn compute_isco(&self) -> f64 {
        self.metric_bl.isco(Orbit::Prograde)
    }

    pub fn compute_photon_sphere(&self) -> f64 {
        self.metric_bl.photon_sphere()
    }

    pub fn compute_dilation(&self, r: f64) -> f64 {
        // Original behavior: returns dt_coord / dt_proper = 1 / sqrt(-g_tt)
        let td = self.metric_bl.time_dilation(r, std::f64::consts::FRAC_PI_2);
        if td <= 0.0 {
            100.0 // Inside horizon / ergosphere cap
        } else {
            1.0 / td
        }
    }

    pub fn generate_disk_lut(&mut self) -> Vec<f32> {
        self.lut_buffer = disk::generate_temperature_lut(&self.metric_bl, self.lut_width);
        self.lut_buffer.clone()
    }

    pub fn get_disk_lut_ptr(&self) -> *const f32 {
        self.lut_buffer.as_ptr()
    }

    pub fn get_sab_ptr(&self) -> *const f32 {
        self.sab_buffer.as_ptr()
    }

    pub fn set_camera_state(&mut self, px: f64, py: f64, pz: f64, _lx: f64, _ly: f64, _lz: f64) {
        self.camera.position = glam::DVec3::new(px, py, pz);
    }

    pub fn set_auto_spin(&mut self, enabled: bool) {
        self.camera.auto_spin = enabled;
    }

    pub fn generate_spectrum_lut(
        &self,
        width: usize,
        height: usize,
        max_temp: f64,
    ) -> Float32Array {
        let data = spectrum::generate_blackbody_lut(width, height, max_temp);
        Float32Array::from(data.as_slice())
    }

    /// Spacetime visualization: embedding mesh for React Three Fiber
    pub fn generate_embedding_mesh(
        &self,
        r_min: f64,
        r_max: f64,
        n_radial: usize,
        n_angular: usize,
    ) -> Float32Array {
        let data = gravitas::spacetime::embedding::embedding_mesh(
            self.mass, self.spin, r_min, r_max, n_radial, n_angular,
        );
        Float32Array::from(data.as_slice())
    }

    /// Spacetime visualization: ergosphere mesh
    pub fn generate_ergosphere_mesh(
        &self,
        n_polar: usize,
        n_azimuthal: usize,
    ) -> Float32Array {
        let data = gravitas::spacetime::frame_drag::ergosphere_mesh(
            &self.metric_bl, n_polar, n_azimuthal,
        );
        Float32Array::from(data.as_slice())
    }

    /// Bardeen critical curve: exact shadow boundary for spinning BH.
    /// Returns flat array of [alpha0, beta0, alpha1, beta1, ...] pairs.
    pub fn compute_shadow_curve(
        &self,
        theta_obs: f64,
        n_points: usize,
    ) -> Float32Array {
        let points = gravitas::physics::shadow::bardeen_shadow(
            &self.metric_bl, theta_obs, n_points,
        );
        let flat: Vec<f32> = points.iter()
            .flat_map(|(a, b)| vec![*a as f32, *b as f32])
            .collect();
        Float32Array::from(flat.as_slice())
    }

    /// Schwarzschild shadow radius (critical impact parameter).
    pub fn compute_shadow_radius(&self) -> f64 {
        gravitas::physics::shadow::schwarzschild_shadow_radius(self.mass)
    }

    /// Page-Thorne flux at radius r (full GR disk flux function).
    pub fn compute_disk_flux(&self, r: f64) -> f64 {
        gravitas::physics::disk::page_thorne_flux(r, &self.metric_bl, 1.0)
    }

    /// Full GR g-factor for disk emission at radius r with impact parameter lambda.
    pub fn compute_g_factor(&self, r: f64, lambda: f64) -> f64 {
        gravitas::physics::redshift::kerr_g_factor(r, self.mass, self.spin, lambda)
    }

    // =================================================================
    // SPACETIME VISUALIZATION: curvature.rs, lightcone.rs, frame_drag.rs,
    // embedding.rs -- now exposed to JavaScript for 3D grid rendering.
    // =================================================================

    /// FROM curvature.rs: Kretschner scalar at a point.
    /// K = R_{abcd} R^{abcd} -- coordinate-invariant tidal force measure.
    pub fn compute_kretschner(&self, r: f64, theta: f64) -> f64 {
        gravitas::spacetime::curvature::kretschner_kerr(r, theta, self.mass, self.spin)
    }

    /// FROM curvature.rs: Generate a 2D scalar field of curvature values.
    /// Returns flat array of (r, theta, K) triples.
    pub fn generate_curvature_field(
        &self,
        r_min: f64,
        r_max: f64,
        n_radial: usize,
        n_polar: usize,
    ) -> Float32Array {
        let field = gravitas::spacetime::curvature::curvature_field(
            self.mass, self.spin, r_min, r_max, n_radial, n_polar,
        );
        let flat: Vec<f32> = field
            .iter()
            .flat_map(|(r, t, k)| vec![*r as f32, *t as f32, *k as f32])
            .collect();
        Float32Array::from(flat.as_slice())
    }

    /// FROM lightcone.rs: Light cone tilt angle at (r, theta).
    /// Uses the full covariant metric: tan(alpha) = sqrt(-g_tt / g_rr).
    pub fn compute_light_cone_tilt(&self, r: f64, theta: f64) -> f64 {
        gravitas::spacetime::lightcone::light_cone_tilt(&self.metric_bl, r, theta)
    }

    /// FROM lightcone.rs: Generate a 2D field of tilt angles.
    /// Returns flat array of (r, theta, tilt_angle) triples.
    pub fn generate_tilt_field(
        &self,
        r_min: f64,
        r_max: f64,
        n_radial: usize,
        n_polar: usize,
    ) -> Float32Array {
        let field = gravitas::spacetime::lightcone::tilt_field(
            &self.metric_bl, r_min, r_max, n_radial, n_polar,
        );
        let flat: Vec<f32> = field
            .iter()
            .flat_map(|(r, t, a)| vec![*r as f32, *t as f32, *a as f32])
            .collect();
        Float32Array::from(flat.as_slice())
    }

    /// FROM frame_drag.rs: Frame-dragging angular velocity at (r, theta).
    /// omega = -g_{t phi} / g_{phi phi} (ZAMO angular velocity).
    pub fn compute_frame_drag_omega(&self, r: f64, theta: f64) -> f64 {
        gravitas::spacetime::frame_drag::frame_dragging_omega(&self.metric_bl, r, theta)
    }

    /// FROM frame_drag.rs: Generate a 2D vector field of frame dragging.
    /// Returns flat array of (r, theta, omega) triples.
    pub fn generate_frame_drag_field(
        &self,
        r_min: f64,
        r_max: f64,
        n_radial: usize,
        n_polar: usize,
    ) -> Float32Array {
        let field = gravitas::spacetime::frame_drag::frame_drag_field(
            &self.metric_bl, r_min, r_max, n_radial, n_polar,
        );
        let flat: Vec<f32> = field
            .iter()
            .flat_map(|(r, t, o)| vec![*r as f32, *t as f32, *o as f32])
            .collect();
        Float32Array::from(flat.as_slice())
    }

    /// FROM embedding.rs: Flamm's paraboloid height at radius r.
    /// z = 2 * sqrt(rs * (r - rs))  for Schwarzschild.
    pub fn compute_flamm_height(&self, r: f64) -> f64 {
        gravitas::spacetime::embedding::flamm_height(r, self.mass)
    }

    /// FROM embedding.rs: Proper radial distance between r1 and r2.
    /// Integrates sqrt(g_rr) dr using the actual metric tensor.
    pub fn compute_proper_distance(&self, r1: f64, r2: f64, n_steps: usize) -> f64 {
        gravitas::spacetime::embedding::proper_distance(&self.metric_bl, r1, r2, n_steps)
    }

    /// SAB tick: reads inputs, updates camera, writes outputs.
    pub fn tick_sab(&mut self, dt_override: f64) {
        let sab_ptr = if let Some(ext_ptr) = self.external_sab_ptr {
            ext_ptr
        } else {
            self.sab_buffer.as_mut_ptr()
        };

        unsafe {
            // 1. READ INPUTS
            let mouse_dx = *sab_ptr.add(OFFSET_CONTROL + 1) as f64;
            let mouse_dy = *sab_ptr.add(OFFSET_CONTROL + 2) as f64;
            let zoom_delta = *sab_ptr.add(OFFSET_CONTROL + 3) as f64;
            let dt = if dt_override > 0.0 {
                dt_override
            } else {
                *sab_ptr.add(OFFSET_CONTROL + 4) as f64
            };

            *sab_ptr.add(OFFSET_CONTROL + 1) = 0.0;
            *sab_ptr.add(OFFSET_CONTROL + 2) = 0.0;
            *sab_ptr.add(OFFSET_CONTROL + 3) = 0.0;

            // 2. UPDATE CAMERA
            let input = camera::CameraInput {
                mouse_dx,
                mouse_dy,
                zoom_delta,
                dt,
            };
            camera::update_camera(&input, &mut self.camera);

            if !self.camera.validate() {
                self.camera = self.last_good_camera;
            } else {
                self.last_good_camera = self.camera;
            }

            // 3. WRITE CAMERA STATE
            *sab_ptr.add(OFFSET_CAMERA) = self.camera.position.x as f32;
            *sab_ptr.add(OFFSET_CAMERA + 1) = self.camera.position.y as f32;
            *sab_ptr.add(OFFSET_CAMERA + 2) = self.camera.position.z as f32;

            *sab_ptr.add(OFFSET_CAMERA + 4) = self.camera.velocity.x as f32;
            *sab_ptr.add(OFFSET_CAMERA + 5) = self.camera.velocity.y as f32;
            *sab_ptr.add(OFFSET_CAMERA + 6) = self.camera.velocity.z as f32;

            *sab_ptr.add(OFFSET_CAMERA + 8) = self.camera.orientation.x as f32;
            *sab_ptr.add(OFFSET_CAMERA + 9) = self.camera.orientation.y as f32;
            *sab_ptr.add(OFFSET_CAMERA + 10) = self.camera.orientation.z as f32;
            *sab_ptr.add(OFFSET_CAMERA + 11) = self.camera.orientation.w as f32;

            // 4. WRITE PHYSICS (computed via gravitas-core)
            *sab_ptr.add(OFFSET_PHYSICS) = self.compute_horizon() as f32;
            *sab_ptr.add(OFFSET_PHYSICS + 1) = self.compute_isco() as f32;
            *sab_ptr.add(OFFSET_PHYSICS + 2) = self.mass as f32;
            *sab_ptr.add(OFFSET_PHYSICS + 3) = self.spin as f32;

            // 5. UPDATE SEQUENCE
            *sab_ptr.add(OFFSET_TELEMETRY) += 1.0;
        }
    }

    pub fn get_sab_layout(&self) -> Vec<usize> {
        vec![
            OFFSET_CONTROL,
            OFFSET_CAMERA,
            OFFSET_PHYSICS,
            OFFSET_TELEMETRY,
            OFFSET_LUTS,
        ]
    }

    /// High-precision geodesic integration (delegates to gravitas-core).
    pub fn integrate_ray_relativistic(
        &self,
        initial_state: Vec<f64>,
        steps: usize,
        tolerance: f64,
        use_kerr_schild: bool,
    ) -> Vec<f64> {
        if initial_state.len() < 8 {
            return initial_state;
        }

        let state = GeodesicState::new(
            initial_state[0], initial_state[1], initial_state[2], initial_state[3],
            initial_state[4], initial_state[5], initial_state[6], initial_state[7],
        );

        let options = IntegrationOptions {
            method: IntegrationMethod::AdaptiveRKF45,
            tolerance,
            initial_step: 0.01,
            max_steps: steps,
            escape_radius: 1000.0,
            renormalize_interval: 10,
            record_path: false,
        };

        let trajectory = if use_kerr_schild {
            integrate(&state, &self.metric_ks, &options)
        } else {
            integrate(&state, &self.metric_bl, &options)
        };

        let s = trajectory.final_state;
        vec![s.x[0], s.x[1], s.x[2], s.x[3], s.p[0], s.p[1], s.p[2], s.p[3]]
    }
}
