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
  uniform float u_disk_size;
  uniform int u_maxRaySteps;
  uniform sampler2D u_noiseTex;
  uniform sampler2D u_blueNoiseTex;
  uniform float u_debug; // Debug mode toggle
  uniform float u_show_redshift; // Toggle for gravitational redshift overlay
  uniform float u_show_kerr_shadow; // Toggle for Kerr shadow guide
  
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

  // Quaternion Rotation (Phase 5.2)
  vec3 qrot(vec4 q, vec3 v) {
    return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
  }
`;
