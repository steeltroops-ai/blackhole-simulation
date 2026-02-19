/**
 * WebGPU Data Layouts
 *
 * Strict alignment rules for std140/std430 compatibility.
 * All structs must be padded to 16-byte boundaries (vec4<f32>) where possible.
 */

// --- Uniform Buffer Objects (UBO) - std140 ---

/**
 * Camera Uniforms (64 bytes aligned)
 * Binding 0
 */
export interface CameraUniforms {
  viewMatrix: Float32Array; // mat4x4<f32> (64 bytes)
  projectionMatrix: Float32Array; // mat4x4<f32> (64 bytes)
  inverseView: Float32Array; // mat4x4<f32> (64 bytes) - For ray generation
  inverseProjection: Float32Array; // mat4x4<f32> (64 bytes)
  prevViewProj: Float32Array; // mat4x4<f32> (64 bytes) - For TAA Reprojection
  position: Float32Array; // vec3<f32> + padding (16 bytes)
  direction: Float32Array; // vec3<f32> + padding (16 bytes)
}

// Byte size: 64 * 5 + 16 + 16 = 352 bytes
export const CAMERA_UNIFORM_SIZE = 352;

/**
 * Physics Parameters (32 bytes aligned)
 * Binding 1
 */
export interface PhysicsParams {
  mass: number; // f32 (4)
  spin: number; // f32 (4)
  resolution: [number, number]; // vec2<f32> (8)
  time: number; // f32 (4)
  dt: number; // f32 (4)
  frameIndex: number; // u32 (4)
  _padding: number; // 4 bytes padding to reach 32
}

// Byte size: 4 + 4 + 8 + 4 + 4 + 4 + 4 = 32 bytes
export const PHYSICS_PARAM_SIZE = 32;

// --- Storage Buffer Objects (SSBO) - std430 ---

/**
 * Ray Payload for Compute Shaders
 * Used for wavefront path tracing queues.
 *
 * Struct Layout:
 * - origin: vec3<f32> (12) + pad (4) = 16
 * - direction: vec3<f32> (12) + pad (4) = 16
 * - color: vec3<f32> (12) + pad (4) = 16
 * - throughput: vec3<f32> (12) + pad (4) = 16
 * - pixel_index: u32 (4)
 * - bounces: u32 (4)
 * - terminated: u32 (4)
 * - _pad: u32 (4) -> To align to 16 bytes
 *
 * Total: 16 * 4 + 16 = 80 bytes
 */
export const RAY_PAYLOAD_SIZE = 80;

/**
 * Helper to write PhysicsParams to a buffer
 */
export function writePhysicsParams(
  buffer: Float32Array,
  params: PhysicsParams,
  offset: number = 0,
) {
  buffer[offset + 0] = params.mass;
  buffer[offset + 1] = params.spin;
  buffer[offset + 2] = params.resolution[0];
  buffer[offset + 3] = params.resolution[1];
  buffer[offset + 4] = params.time;
  buffer[offset + 5] = params.dt;
  const intView = new Uint32Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.length,
  );
  intView[offset + 6] = params.frameIndex;
}

/**
 * Helper to pack CameraUniforms into a Float32Array (288 bytes = 72 floats)
 */
export function writeCameraUniforms(
  buffer: Float32Array,
  uniforms: CameraUniforms,
  offset: number = 0,
) {
  // viewMatrix (16 floats)
  buffer.set(uniforms.viewMatrix, offset + 0);
  // projectionMatrix (16 floats)
  buffer.set(uniforms.projectionMatrix, offset + 16);
  // inverseView (16 floats)
  buffer.set(uniforms.inverseView, offset + 32);
  // inverseProjection (16 floats)
  buffer.set(uniforms.inverseProjection, offset + 48);
  // prevViewProj (16 floats)
  buffer.set(uniforms.prevViewProj, offset + 64);

  // position (3 floats) + 1 pad
  buffer[offset + 80] = uniforms.position[0];
  buffer[offset + 81] = uniforms.position[1];
  buffer[offset + 82] = uniforms.position[2];
  buffer[offset + 83] = 0.0; // pad

  // direction (3 floats) + 1 pad
  buffer[offset + 84] = uniforms.direction[0];
  buffer[offset + 85] = uniforms.direction[1];
  buffer[offset + 86] = uniforms.direction[2];
  buffer[offset + 87] = 0.0; // pad
}
