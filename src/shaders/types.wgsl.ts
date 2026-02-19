const typesShader = `
// --- WebGPU Data Layouts (WGSL) ---
// Must match src/types/webgpu.ts and physics-engine/src/structs.rs exactly.

// --- Binding 0: Camera Uniforms (std140) ---
struct CameraUniforms {
    view_matrix: mat4x4<f32>,       // 64 bytes
    proj_matrix: mat4x4<f32>,       // 64 bytes
    inv_view: mat4x4<f32>,          // 64 bytes
    inv_proj: mat4x4<f32>,          // 64 bytes
    prev_view_proj: mat4x4<f32>,    // 64 bytes
    position: vec3<f32>,            // 12 bytes
    _pad1: f32,                     // 4 bytes -> 16 byte align
    direction: vec3<f32>,           // 12 bytes
    _pad2: f32,                     // 4 bytes -> 16 byte align
};
// Total: 352 bytes

// --- Binding 1: Physics Parameters (std140) ---
struct PhysicsParams {
    mass: f32,                      // 4 bytes
    spin: f32,                      // 4 bytes
    resolution: vec2<f32>,          // 8 bytes
    time: f32,                      // 4 bytes
    dt: f32,                        // 4 bytes
    frame_index: u32,               // 4 bytes
    _pad: u32,                      // 4 bytes -> 32 byte align
};
// Total: 32 bytes

// --- Binding 2: Ray Payload (std430 / storage) ---
struct RayPayload {
    origin: vec4<f32>,              // 16 bytes
    direction: vec4<f32>,           // 16 bytes
    color: vec4<f32>,               // 16 bytes (rgb + alpha/padding)
    throughput: vec4<f32>,          // 16 bytes (rgb + padding)
    
    // Meta (packed u32)
    pixel_index: u32,               // 4 bytes
    bounces: u32,                   // 4 bytes
    terminated: u32,                // 4 bytes
    _pad: u32,                      // 4 bytes
};
// Total: 80 bytes

// --- Binding 3: Ray Batch for Tiled Compute ---
struct TiledRayBatch {
    count: atomic<u32>,             // 4 bytes
    _pad: array<u32, 3>,            // 12 bytes -> 16 byte header
    rays: array<RayPayload>,        // Variable length
};
`;

export default typesShader;
