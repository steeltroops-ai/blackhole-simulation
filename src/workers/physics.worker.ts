/**
 * Black Hole Physics Worker
 * Decoupled Physics Heartbeat (120Hz)
 */

interface WorkerInitialData {
  sab: SharedArrayBuffer;
  mass: number;
  spin: number;
}

// State
let engine: any = null;
let sab: SharedArrayBuffer | null = null;
let lastTickTime = 0;

// Constants matching lib.rs
const OFFSETS = {
  CONTROL: 0,
  CAMERA: 64,
  PHYSICS: 128,
  TELEMETRY: 256,
} as const;

// Subarray views for the SharedArrayBuffer
let sabControlView: Float32Array;
let sabCameraView: Float32Array;
let sabPhysicsView: Float32Array;
let sabTelemetryView: Float32Array;

const IDLE_THRESHOLD_MS = 3000;
let isIdle = false;
let idleStartTime = 0;

self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === "INIT") {
    const { sab: sharedBuffer, mass, spin } = data as WorkerInitialData;
    sab = sharedBuffer;

    sabControlView = new Float32Array(
      sab,
      OFFSETS.CONTROL * 4,
      OFFSETS.CAMERA - OFFSETS.CONTROL,
    );
    sabCameraView = new Float32Array(
      sab,
      OFFSETS.CAMERA * 4,
      OFFSETS.PHYSICS - OFFSETS.CAMERA,
    );
    sabPhysicsView = new Float32Array(
      sab,
      OFFSETS.PHYSICS * 4,
      OFFSETS.TELEMETRY - OFFSETS.PHYSICS,
    );
    sabTelemetryView = new Float32Array(sab, OFFSETS.TELEMETRY * 4, 16);

    try {
      const wasmModuleWrap = await import("blackhole-physics");
      const wasmModule = await wasmModuleWrap.default();
      const { PhysicsEngine } = wasmModuleWrap;

      engine = new PhysicsEngine(mass, spin);

      // Store reference to memory for calculation copies
      (self as any).wasmMemory = wasmModule.memory;

      lastTickTime = performance.now();
      calculate();

      self.postMessage({ type: "READY" });
    } catch (err: any) {
      console.error("Physics Worker Initialization Failed:", err);
      self.postMessage({
        type: "ERROR",
        error: err?.message || "Unknown error",
      });
    }
  }

  if (type === "UPDATE_PARAMS" && engine) {
    engine.update_params(data.mass, data.spin);
  }

  if (type === "SET_CAMERA_STATE" && engine) {
    const { pos, lookAt } = data;
    engine.set_camera_state(pos.x, pos.y, pos.z, lookAt.x, lookAt.y, lookAt.z);
  }

  if (type === "SET_AUTO_SPIN" && engine) {
    engine.set_auto_spin(data);
  }

  if (type === "UPDATE_INPUTS" && sabControlView) {
    // Write directly to shared memory
    sabControlView[1] = data.orbitX;
    sabControlView[2] = data.orbitY;
    sabControlView[3] = data.zoom;
    sabControlView[4] = data.dt;
  }
};

// Persistent views to avoid GC pressure
let wasmF32: Float32Array | null = null;
let lastBufferLength = 0;

function calculate() {
  if (!engine || !sab) return;

  const currentTime = performance.now();
  const dt = (currentTime - lastTickTime) / 1000;
  lastTickTime = currentTime;

  // 1. REBIND PERSISTENT VIEWS (Phase 2.1: Memory Guard)
  const currentBuffer = (self as any).wasmMemory.buffer;
  if (!wasmF32 || currentBuffer.byteLength !== lastBufferLength) {
    wasmF32 = new Float32Array(currentBuffer);
    lastBufferLength = currentBuffer.byteLength;
  }

  // 2. READ INPUTS FROM SHARED BUFFER
  const mouse_dx = sabControlView[1];
  const mouse_dy = sabControlView[2];
  const zoom_delta = sabControlView[3];

  // 3. IDLE DETECTION
  const hasInput =
    Math.abs(mouse_dx) > 0.0001 ||
    Math.abs(mouse_dy) > 0.0001 ||
    Math.abs(zoom_delta) > 0.0001;
  if (hasInput) {
    isIdle = false;
    idleStartTime = currentTime;
  } else if (!isIdle && currentTime - idleStartTime > IDLE_THRESHOLD_MS) {
    isIdle = true;
  }

  // 4. RUN PHYSICS
  // The "Anti-Spiral" logic: Clamp DT to prevent integration explosions
  const clampedDt = Math.min(dt, 0.033);
  engine.tick_sab(clampedDt);

  // 5. SYNC TO SHARED BUFFER (Anti-Tearing)
  // Primary Sequence increment (Signals "Write Started")
  sabTelemetryView[0] += 1.0;

  const wasmSABPtr = engine.get_sab_ptr();
  const startIdx = wasmSABPtr / 4;

  // Zero-Copy Bulk Transfer
  sabCameraView.set(
    wasmF32.subarray(startIdx + OFFSETS.CAMERA, startIdx + OFFSETS.PHYSICS),
  );
  sabPhysicsView.set(
    wasmF32.subarray(startIdx + OFFSETS.PHYSICS, startIdx + OFFSETS.TELEMETRY),
  );

  // Secondary Sequence increment (Signals "Write Complete")
  sabTelemetryView[0] += 1.0;

  // High-Precision Loop Control
  const targetDelay = isIdle ? 1000 : 1000 / 120;
  const processingTime = performance.now() - currentTime;
  const finalDelay = Math.max(0, targetDelay - processingTime);

  setTimeout(calculate, finalDelay);
}
