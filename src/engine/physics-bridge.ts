// Memory Protocol v2 Offsets (Must match Rust lib.rs)
// These are F32 ELEMENT indices, NOT byte offsets.
// To get byte offset: multiply by 4.
// To get Int32Array index: same as f32 index (both are 4-byte elements).
export const OFFSETS = {
  CONTROL: 0,
  CAMERA: 64,
  PHYSICS: 128,
  TELEMETRY: 256,
  LUTS: 2048,
} as const;

export class PhysicsBridge {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private engine: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private wasmModule: any = null;
  private worker: Worker | null = null;
  private workerReady = false; // BUG FIX: Only true after WASM loads inside worker
  private initializationPromise: Promise<void> | null = null;
  private currentMass = 1.0;
  private currentSpin = 0.0;
  private lastBuffer: ArrayBuffer | SharedArrayBuffer | null = null;
  private sab: SharedArrayBuffer | null = null;
  private _lastGoodCamera = new Float32Array(64);
  private _lastGoodPhysics = new Float32Array(128);

  // Persistent views
  private controlView: Float32Array = new Float32Array(0);
  private cameraView: Float32Array = new Float32Array(0);
  private physicsView: Float32Array = new Float32Array(0);

  // Fallback views (Map to WASM memory directly)
  private wasmMemory: WebAssembly.Memory | null = null;
  private wasmControlView: Float32Array = new Float32Array(0);
  private wasmCameraView: Float32Array = new Float32Array(0);
  private wasmPhysicsView: Float32Array = new Float32Array(0);

  // Cached Int32Array view for Atomics (avoids per-frame allocation)
  private seqView: Int32Array | null = null;
  private lastSeenSequence: number = -1;

  public async initialize(): Promise<void> {
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        // eslint-disable-next-line no-console
        console.log("PhysicsBridge: Initializing WASM Kernel...");

        // Note: In Next.js, we need to handle both SSR and Client-side loading.
        // The worker is the primary driver in production.
        this.worker = new Worker(
          new URL("../workers/physics.worker.ts", import.meta.url),
          { type: "module" },
        );

        // Setup SharedArrayBuffer (SAB) for Zero-Copy Sync
        // 2MB is enough for headers + several 512x512 LUTs
        this.sab = new SharedArrayBuffer(2 * 1024 * 1024);
        this.initializeViews();

        // BUG FIX: Must send mass and spin, otherwise Rust receives NaN
        this.worker.postMessage({
          type: "INIT",
          data: { sab: this.sab, mass: 1.0, spin: 0.9 },
        });

        return new Promise<void>((resolve, reject) => {
          if (!this.worker) return reject("Worker failed to init");
          this.worker.onmessage = (e) => {
            if (e.data.type === "READY") {
              // eslint-disable-next-line no-console
              console.log("PhysicsBridge: Worker Ready.");
              this.workerReady = true;
              resolve();
            } else if (e.data.type === "ERROR") {
              reject(e.data.error);
            }
          };
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("PhysicsBridge Fallback: Loading in main thread...", err);
        // Fallback for environments where workers or SAB are disabled
        const wasmModuleWrap = await import("blackhole-physics");
        const wasmModule = await wasmModuleWrap.default();
        this.wasmMemory = wasmModule.memory;
        this.engine = new wasmModuleWrap.PhysicsEngine(1.0, 0.9);
        this.initializeFallbackViews();
      }
    })();

    return this.initializationPromise;
  }

  private initializeViews() {
    if (!this.sab) return;
    this.controlView = new Float32Array(this.sab, OFFSETS.CONTROL * 4, 16);
    this.cameraView = new Float32Array(this.sab, OFFSETS.CAMERA * 4, 16);
    this.physicsView = new Float32Array(this.sab, OFFSETS.PHYSICS * 4, 16);
    this.seqView = new Int32Array(this.sab);
  }

  private initializeFallbackViews() {
    if (!this.engine || !this.wasmMemory) return;
    const ptr = this.engine.get_sab_ptr();
    this.wasmControlView = new Float32Array(
      this.wasmMemory.buffer,
      ptr + OFFSETS.CONTROL * 4,
      16,
    );
    this.wasmCameraView = new Float32Array(
      this.wasmMemory.buffer,
      ptr + OFFSETS.CAMERA * 4,
      16,
    );
    this.wasmPhysicsView = new Float32Array(
      this.wasmMemory.buffer,
      ptr + OFFSETS.PHYSICS * 4,
      16,
    );
  }

  public isReady(): boolean {
    // BUG FIX: Previously returned !!(this.engine || this.worker), which was
    // true immediately after Worker() constructor -- before WASM loaded.
    // Now we wait for the actual READY ack from the worker.
    return !!(this.engine || this.workerReady);
  }

  public async ensureInitialized(): Promise<void> {
    if (!this.initializationPromise) {
      return this.initialize();
    }
    return this.initializationPromise;
  }

  /**
   * Primary Telemetry Hook. Reads camera and physics state from SAB.
   * This is called 60+ times per second in the animation loop.
   *
   * MEMORY LAYOUT REMINDER:
   *   OFFSETS are f32 element indices.  Int32Array also uses 4-byte elements,
   *   so the element index into Int32Array is the SAME as the f32 index.
   *   DO NOT divide by 4 -- that was the original Bug #2.
   */
  public tick(
    dt: number,
  ): { camera: Float32Array; physics: Float32Array } | null {
    if (this.worker && this.sab && this.seqView) {
      // 1. Write the current frame delta to the shared control block
      this.controlView[4] = dt;

      // 2. CONSISTENCY CHECK (Anti-Tearing)
      const seq1 = Atomics.load(this.seqView, OFFSETS.TELEMETRY);

      // Fast path: if sequence hasn't changed since last read, data is the same.
      // Skip the expensive .set() copy entirely.
      if (seq1 === this.lastSeenSequence) {
        return { camera: this._lastGoodCamera, physics: this._lastGoodPhysics };
      }

      const camera = this.cameraView;
      const physics = this.physicsView;

      const seq2 = Atomics.load(this.seqView, OFFSETS.TELEMETRY);
      if (seq1 !== seq2) {
        // Data might be torn. Return last good state.
        return { camera: this._lastGoodCamera, physics: this._lastGoodPhysics };
      }

      // NaN Guard: If the physics engine produced garbage, don't propagate it
      if (
        !Number.isFinite(camera[0]) ||
        !Number.isFinite(camera[1]) ||
        !Number.isFinite(camera[2])
      ) {
        return { camera: this._lastGoodCamera, physics: this._lastGoodPhysics };
      }

      // Update shadowing caches (only when data actually changed)
      this._lastGoodCamera.set(camera);
      this._lastGoodPhysics.set(physics);
      this.lastSeenSequence = seq1;

      return { camera: this._lastGoodCamera, physics: this._lastGoodPhysics };
    }

    if (this.isReady() && this.engine) {
      // Main Thread Fallback path
      this.engine.tick_sab(dt);

      // Update shadowing caches from WASM memory
      this._lastGoodCamera.set(this.wasmCameraView);
      this._lastGoodPhysics.set(this.wasmPhysicsView);

      return { camera: this._lastGoodCamera, physics: this._lastGoodPhysics };
    }
    return null;
  }

  public updateParameters(mass: number, spin: number) {
    this.currentMass = mass;
    this.currentSpin = spin;

    if (this.worker) {
      this.worker.postMessage({ type: "UPDATE_PARAMS", data: { mass, spin } });
    }

    if (this.engine) {
      this.engine.update_params(mass, spin);
    }
  }

  public setCameraState(
    pos: { x: number; y: number; z: number },
    lookAt: { x: number; y: number; z: number },
  ) {
    if (this.worker) {
      this.worker.postMessage({
        type: "SET_CAMERA_STATE",
        data: { pos, lookAt },
      });
    }
    if (this.engine) {
      this.engine.set_camera_state(
        pos.x,
        pos.y,
        pos.z,
        lookAt.x,
        lookAt.y,
        lookAt.z,
      );
    }
  }

  public setAutoSpin(enabled: boolean) {
    if (this.worker) {
      this.worker.postMessage({ type: "SET_AUTO_SPIN", data: enabled });
    }
    if (this.engine) {
      this.engine.set_auto_spin(enabled);
    }
  }

  public updateInputs(inputs: {
    dt: number;
    orbitX: number;
    orbitY: number;
    zoom: number;
  }) {
    if (this.worker) {
      this.worker.postMessage({ type: "UPDATE_INPUTS", data: inputs });
    }
    // Shared memory handles the actual update if using SAB, but we still trigger logic
  }

  public getDiskLUT(): Float32Array | null {
    if (!this.engine) return null;
    return this.engine.generate_disk_lut();
  }

  public getSpectrumLUT(
    width: number,
    height: number,
    maxTemp: number,
  ): Float32Array | null {
    if (!this.engine) return null;
    return this.engine.generate_spectrum_lut(width, height, maxTemp);
  }

  public computeHorizon(): number {
    return this.engine ? this.engine.compute_horizon() : 2.0;
  }

  public computeISCO(): number {
    return this.engine ? this.engine.compute_isco() : 6.0;
  }

  public computePhotonSphere(): number {
    return this.engine ? this.engine.compute_photon_sphere() : 3.0;
  }

  public computeDilation(r: number): number {
    if (this.engine) return this.engine.compute_dilation(r);

    // Fallback: Schwarzschild approximation (r > 2M)
    const rs = 2.0 * this.currentMass;
    if (r <= rs) return 100.0;
    return 1.0 / Math.sqrt(1.0 - rs / r);
  }
}

export const physicsBridge = new PhysicsBridge();
