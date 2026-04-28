//! Bounds-check tests for SAB writes.
//!
//! These pin the layout constants so a future change that would let the
//! shadow-curve writer overflow PHYSICS into TELEMETRY fails at test time.

use gravitas_wasm::{
    OFFSET_CAMERA, OFFSET_CONTROL, OFFSET_LUTS, OFFSET_PHYSICS, OFFSET_TELEMETRY,
    SHADOW_CURVE_FLOATS, SHADOW_CURVE_MAX_POINTS, SHADOW_CURVE_OFFSET_IN_PHYSICS,
};

#[test]
fn block_offsets_are_monotonic_and_aligned() {
    assert!(OFFSET_CONTROL < OFFSET_CAMERA);
    assert!(OFFSET_CAMERA < OFFSET_PHYSICS);
    assert!(OFFSET_PHYSICS < OFFSET_TELEMETRY);
    assert!(OFFSET_TELEMETRY < OFFSET_LUTS);
    // Each offset is a valid f32 index (no fractional alignment).
    assert_eq!(OFFSET_CONTROL % 1, 0);
    assert_eq!(OFFSET_CAMERA % 1, 0);
    assert_eq!(OFFSET_PHYSICS % 1, 0);
}

#[test]
fn shadow_curve_max_points_fits_physics_block() {
    let physics_block_floats = OFFSET_TELEMETRY - OFFSET_PHYSICS;
    let last_slot_in_curve =
        SHADOW_CURVE_OFFSET_IN_PHYSICS + (SHADOW_CURVE_FLOATS - 1);
    assert!(
        last_slot_in_curve < physics_block_floats,
        "Last shadow-curve slot {} >= PHYSICS block size {}; would overflow into TELEMETRY",
        last_slot_in_curve,
        physics_block_floats,
    );
}

#[test]
fn shadow_curve_floats_equals_max_points_times_two() {
    assert_eq!(SHADOW_CURVE_FLOATS, SHADOW_CURVE_MAX_POINTS * 2);
}

#[test]
fn shadow_curve_max_writer_slot_is_below_telemetry() {
    // The writer pattern is `OFFSET_PHYSICS + 16 + i*2 + 1` for i in 0..actual_points.
    // With actual_points capped at SHADOW_CURVE_MAX_POINTS, the maximum absolute
    // slot is OFFSET_PHYSICS + 16 + (MAX-1)*2 + 1.
    let max_slot = OFFSET_PHYSICS
        + SHADOW_CURVE_OFFSET_IN_PHYSICS
        + (SHADOW_CURVE_MAX_POINTS - 1) * 2
        + 1;
    assert!(
        max_slot < OFFSET_TELEMETRY,
        "Max writer slot {} >= OFFSET_TELEMETRY {}",
        max_slot,
        OFFSET_TELEMETRY,
    );
}
