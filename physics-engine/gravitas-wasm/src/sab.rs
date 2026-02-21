//! SharedArrayBuffer protocol constants and helpers.
//!
//! Defines the memory layout for zero-copy communication between
//! the Rust physics kernel (running in a WebWorker) and the
//! JavaScript/GPU rendering pipeline.

/// SAB Layout v2 - Field offsets (in f32 element indices)
///
/// ```text
/// Offset     | Block       | Size (f32) | Contents
/// ---------- | ----------- | ---------- | --------
///   0 -  63  | CONTROL     | 16         | lock, mouse_dx/dy, zoom, dt, ...
///  64 - 127  | CAMERA      | 16         | pos(3), pad, vel(3), pad, quat(4), ...
/// 128 - 255  | PHYSICS     | 16         | horizon, isco, mass, spin, ...
/// 256 - 511  | TELEMETRY   | 64         | sequence counter, frame time, ...
/// 2048+      | LUTS        | variable   | Disk temperature LUT, Spectrum LUT
/// ```
pub const OFFSET_CONTROL: usize = 0;
pub const OFFSET_CAMERA: usize = 64;
pub const OFFSET_PHYSICS: usize = 128;
pub const OFFSET_TELEMETRY: usize = 256;
pub const OFFSET_LUTS: usize = 2048;
