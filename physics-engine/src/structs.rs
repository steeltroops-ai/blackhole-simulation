/// WebGPU Data Layouts for Rust Kernel
///
/// Ensures byte-perfect alignment with WGSL shaders (std140/std430).
/// Used for direct memory mapping via SharedArrayBuffer.

use glam::{Vec4, Mat4};

#[repr(C)]
#[derive(Clone, Copy, Debug)]
pub struct CameraUniforms {
    pub view_matrix: Mat4,       // 64 bytes
    pub proj_matrix: Mat4,       // 64 bytes
    pub inv_view: Mat4,          // 64 bytes
    pub inv_proj: Mat4,          // 64 bytes
    pub position: Vec4,          // 16 bytes (xyz + pad)
    pub direction: Vec4,         // 16 bytes (xyz + pad)
    // 64*4 + 16 + 16 = 288 bytes
}

#[repr(C, align(16))]
#[derive(Clone, Copy, Debug)]
pub struct PhysicsParams {
    pub mass: f32,               // 4 bytes
    pub spin: f32,               // 4 bytes
    pub resolution: [f32; 2],    // 8 bytes (width, height)
    pub time: f32,               // 4 bytes
    pub dt: f32,                 // 4 bytes
    pub _padding: [f32; 2],      // 8 bytes -> Total 32 bytes
}

#[repr(C, align(16))]
#[derive(Clone, Copy, Debug)]
pub struct RayPayload {
    pub origin: Vec4,            // 16 bytes
    pub direction: Vec4,         // 16 bytes
    pub color: Vec4,             // 16 bytes
    pub throughput: Vec4,        // 16 bytes
    pub meta: [u32; 4],          // 16 bytes (pixel_idx, bounces, terminated, pad)
}

// 16 * 5 = 80 bytes
// Ensure alignment matches RAY_PAYLOAD_SIZE (80 bytes)

#[repr(C)]
pub struct TiledRayBatch {
    pub count: u32,
    pub _pad: [u32; 3],         // 16-byte header
    pub rays: [RayPayload; 64], // Batch of 64 rays for warp-level parallelism
}
