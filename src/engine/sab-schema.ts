/**
 * Canonical SharedArrayBuffer layout for the physics ↔ renderer protocol.
 *
 * This file is the single source of truth. The Rust side (`gravitas-wasm`)
 * pins the same values in `OFFSET_*` constants and a comment requiring
 * them to match this file.
 *
 * Block ownership:
 *   CONTROL   : main-thread writes (operator inputs).
 *   CAMERA    : main-thread writes (camera pose).
 *   PHYSICS   : worker writes (integration state, shadow curve).
 *   TELEMETRY : worker writes (sequence counter, FPS, frame index, dt).
 *   LUTS      : worker writes (precomputed lookup tables).
 *
 * Offsets are f32 element indices, not byte offsets. Multiply by 4 for
 * byte offsets; Int32Array uses the same indices since both are 4-byte
 * elements.
 */

/** Branded type to distinguish a byte offset from an f32 index. */
export type SabByteOffset = number & { readonly __brand: "SabByteOffset" };

/** Branded type for an f32 element index into the SAB. */
export type SabFloatIndex = number & { readonly __brand: "SabFloatIndex" };

const findex = (n: number): SabFloatIndex => n as SabFloatIndex;

/** F32 element offsets for each block. */
export const OFFSETS = {
  CONTROL: findex(0),
  CAMERA: findex(64),
  PHYSICS: findex(128),
  TELEMETRY: findex(256),
  LUTS: findex(2048),
} as const;

/** Block sizes in f32 element count. */
export const BLOCK_FLOATS = {
  CONTROL: OFFSETS.CAMERA - OFFSETS.CONTROL,
  CAMERA: OFFSETS.PHYSICS - OFFSETS.CAMERA,
  PHYSICS: OFFSETS.TELEMETRY - OFFSETS.PHYSICS,
  TELEMETRY: OFFSETS.LUTS - OFFSETS.TELEMETRY,
} as const;

/** Slot offsets inside the TELEMETRY block (relative). */
export const TELEMETRY_SLOTS = {
  SEQUENCE: 0,
  FPS: 1,
  FRAME_INDEX: 2,
  DT: 3,
} as const;

/** Shadow-curve cap inside PHYSICS (16 reserved scalars + 56 (x,y) points). */
export const SHADOW_CURVE_MAX_POINTS = 56;
