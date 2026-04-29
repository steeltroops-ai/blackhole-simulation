import { PHYSICS_CONSTANTS } from "@/configs/physics.config";

export const COMMON_CHUNK = `
  precision highp float;
  
  // Fragment output (WebGL2)
  out vec4 fragColor;
  
  // === UNIFORMS ===
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_mass;
  uniform float u_spin;
  uniform float u_disk_density;
  uniform float u_disk_temp;
  uniform vec2 u_mouse;
  uniform float u_zoom;
  uniform float u_lensing_strength;
  uniform float u_frame_dragging_strength;
  uniform float u_disk_size;
  uniform float u_disk_scale_height;
  uniform int u_maxRaySteps;
  uniform sampler2D u_noiseTex;
  uniform sampler2D u_blueNoiseTex;
  uniform sampler2D u_spectrumLUT;
  uniform float u_debug; // Debug mode toggle

  uniform float u_show_redshift; // Toggle for gravitational redshift overlay
  uniform float u_show_kerr_shadow; // Toggle for Kerr shadow guide
  uniform vec2 u_shadowShift; // Analytical Shadow Extents (min_alpha, max_alpha)
  uniform vec2 u_shadowCurve[64]; // Analytic Critical Curve (64 points)
  uniform float u_shadowCount;    // Actual number of valid points in the curve

  // SP-4 module 4A polarization compositing. ADR-0022 wires Stokes
  // (Q, U, V) onto a single uniform vec4 so the shader composites
  // hue/saturation per pixel without expanding the framebuffer.
  // u_polarization_enabled is a 0/1 toggle the operator flips at the
  // control panel; per ADR-0027 it auto-disables on tier 1.
  uniform float u_polarization_enabled;
  uniform vec4 u_stokes; // (I, Q, U, V) in the local emission tetrad

  // SP-4 module 4B per-tier band selection. ADR-0023 ladder:
  // tier 1 = 1 band (broadband 230 GHz),
  // tier 2 = 3 bands (radio + EHT + optical),
  // tier 3 = 5 bands. The shader reads u_active_band_freq_hz to
  // tonemap the disk emissivity at the active EHT-relative band.
  // The integer band index lives only on the JS side until the
  // tonemap LUT lookup wires through.
  uniform float u_active_band_freq_hz;

  // SP-4 module 4D Wald magnetosphere streamline overlay. Tier 3 only.
  // u_b_field_strength is in geometric units (B_0 with M = 1) and
  // scales the streamline brightness; 0 disables the overlay.
  uniform float u_b_field_strength;

  // SP-4 module 4E plunging-stream emission inside r < r_ISCO.
  // u_plunge_envelope_scale controls the exponential falloff (in
  // units of M); 0 reverts to the hard cutoff at ISCO.
  uniform float u_plunge_envelope_scale;

  
  // High-Precision Camera State (SAB Synced)
  uniform vec3 u_camPos;
  uniform vec4 u_camQuat;

  // === CONSTANTS ===
#define PI 3.14159265359
#define MAX_DIST ${PHYSICS_CONSTANTS.rayMarching.maxDistance.toFixed(1)}
#define MIN_STEP ${PHYSICS_CONSTANTS.rayMarching.minStep.toFixed(2)}
#define MAX_STEP ${PHYSICS_CONSTANTS.rayMarching.maxStep.toFixed(1)}

  // === HELPER FUNCTIONS ===
  mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
  }

  // ACES Tone Mapping (Narkowicz 2014)
  vec3 aces_tone_mapping(vec3 color) {
    float A = 2.51;
    float B = 0.03;
    float C = 2.43;
    float D = 0.59;
    float E = 0.14;
    return clamp((color * (A * color + B)) / (color * (C * color + D) + E), 0.0, 1.0);
  }


    /**
     * Analytic Shadow Boundary check.
     * Uses the Critical Curve coefficients from Rust to determine if a ray
     * hit the event horizon with infinite sub-pixel precision.
     */
    bool is_shadow(vec2 impactParams, vec2 criticalCurve) {
        // Simple elliptical approximation for now, 
        // will be upgraded to full parametric in Phase 3.
        float dist = length(impactParams / criticalCurve);
        return dist < 1.0;
    }

  // Quaternion Rotation (Phase 5.2)
  vec3 qrot(vec4 q, vec3 v) {
    return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
  }
`;
