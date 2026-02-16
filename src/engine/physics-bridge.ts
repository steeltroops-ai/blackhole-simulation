// Memory Protocol v2 Offsets (Must match Rust lib.rs)
export const OFFSETS = {
  CONTROL: 0,
  CAMERA: 64,
  PHYSICS: 128,
  TELEMETRY: 256,
  LUTS: 2048,
} as const;

export class PhysicsBridge {
  private engine: any = null;
  private wasmModule: any = null;
  private worker: Worker | null = null;
  private initializationPromise: Promise<void> | null = null;
  private lastBuffer: ArrayBuffer | SharedArrayBuffer | null = null;
  private sab: SharedArrayBuffer | null = null;
  private _lastGoodCamera = new Float32Array(64);
  private _lastGoodPhysics = new Float32Array(128);

  // Persistent views
  private _f32: Float32Array | null = null;

  // Subarray views
  public controlView!: Float32Array;
  public cameraView!: Float32Array;
  public physicsView!: Float32Array;
  public telemetryView!: Float32Array;

  constructor() {}

  public async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        // 1. Create Shared Communication Buffer (8KB)
        if (typeof SharedArrayBuffer !== "undefined") {
          this.sab = new SharedArrayBuffer(8192);
        } else {
          console.warn(
            "SharedArrayBuffer not available. Falling back to Main Thread Physics.",
          );
        }

        // 2. Spawn Worker for Phase 2 Threaded Simulation
        if (typeof Worker !== "undefined" && this.sab) {
          try {
            const workerInstance = new Worker(
              new URL("../workers/physics.worker.ts", import.meta.url),
              { type: "module" },
            );
            this.worker = workerInstance;

            await new Promise<void>((resolve, reject) => {
              workerInstance.onmessage = (e) => {
                if (e.data.type === "READY") resolve();
                if (e.data.type === "ERROR") reject(new Error(e.data.error));
              };

              workerInstance.postMessage({
                type: "INIT",
                data: {
                  sab: this.sab,
                  mass: this.engine ? this.engine.mass : 1.0,
                  spin: this.engine ? this.engine.spin : 0.0,
                },
              });
            });
          } catch (workerErr) {
            console.warn(
              "Failed to spawn physics worker, falling back to main thread:",
              workerErr,
            );
            this.worker = null;
          }
        }

        // 3. Initialize Local WASM for LUTs and Queries (and fallback tick)
        const wasmModuleWrap = await import("blackhole-physics");
        this.wasmModule = await wasmModuleWrap.default();
        const { PhysicsEngine } = wasmModuleWrap;
        this.engine = new PhysicsEngine(1.0, 0.0);

        // Sync views to the correct buffer
        // If worker is running, views MUST point to SharedArrayBuffer
        // If no worker, views point to WASM memory
        this.syncViews(
          this.sab && this.worker ? this.sab : this.wasmModule.memory.buffer,
        );

        console.log(
          `Physics Bridge Initialized: ${this.worker ? "Worker + Local LUTs" : "Main Thread Only"}`,
        );
      } catch (err) {
        console.error("Critical Physics Initialization Failure:", err);
        this.initializationPromise = null;
        throw err;
      }
    })();

    return this.initializationPromise;
  }

  private syncViews(buffer: ArrayBuffer | SharedArrayBuffer): boolean {
    if (buffer === this.lastBuffer && this._f32) return true;

    // IMPORTANT: If we are using the worker (SharedArrayBuffer), the layout
    // starts at 0. If we are using local fallback (WASM Buffer), we use the WASM pointer.
    const startIdx =
      this.worker && this.sab
        ? 0
        : this.engine
          ? this.engine.get_sab_ptr() / 4
          : 0;

    this._f32 = new Float32Array(buffer);
    this.controlView = this._f32.subarray(
      startIdx + OFFSETS.CONTROL,
      startIdx + OFFSETS.CAMERA,
    );
    this.cameraView = this._f32.subarray(
      startIdx + OFFSETS.CAMERA,
      startIdx + OFFSETS.PHYSICS,
    );
    this.physicsView = this._f32.subarray(
      startIdx + OFFSETS.PHYSICS,
      startIdx + OFFSETS.TELEMETRY,
    );
    this.telemetryView = this._f32.subarray(
      startIdx + OFFSETS.TELEMETRY,
      startIdx + OFFSETS.LUTS,
    );

    this.lastBuffer = buffer;
    return true;
  }

  public isReady(): boolean {
    // Both modes now require the local engine for LUTs and queries
    if (!this.engine) return false;

    // If worker exists, views were already synced to SAB
    if (this.worker && this.sab) return true;

    // Otherwise check fallback engine and its memory
    if (this.wasmModule) {
      return this.syncViews(this.wasmModule.memory.buffer);
    }
    return false;
  }

  public tick(
    dt: number,
  ): { camera: Float32Array; physics: Float32Array } | null {
    if (this.worker && this.sab) {
      // 1. Write the current frame delta to the shared control block
      this.controlView[4] = dt;

      // 2. CONSISTENCY CHECK (Anti-Tearing)
      // Read sequence -> Read Data -> Read sequence
      // If sequence changed, the worker was writing during our read.
      const seq1 = Atomics.load(
        new Int32Array(this.sab),
        OFFSETS.TELEMETRY / 4,
      );

      // Perform very fast copy/reads here...
      const camera = this.cameraView;
      const physics = this.physicsView;

      const seq2 = Atomics.load(
        new Int32Array(this.sab),
        OFFSETS.TELEMETRY / 4,
      );
      if (seq1 !== seq2) {
        // Data might be torn. Return last good state.
        return { camera: this._lastGoodCamera, physics: this._lastGoodPhysics };
      }

      // Update shadowing caches
      this._lastGoodCamera.set(camera);
      this._lastGoodPhysics.set(physics);

      return { camera: this._lastGoodCamera, physics: this._lastGoodPhysics };
    }

    if (this.isReady()) {
      this.engine.tick_sab(dt);
      return { camera: this.cameraView, physics: this.physicsView };
    }
    return null;
  }

  public updateParameters(mass: number, spin: number) {
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
    if (!this.isReady()) return null;
    return this.engine.generate_disk_lut();
  }

  public getSpectrumLUT(
    width: number,
    height: number,
    maxTemp: number,
  ): Float32Array | null {
    if (!this.isReady()) return null;
    return this.engine.generate_spectrum_lut(width, height, maxTemp);
  }

  public computeHorizon(): number {
    return this.engine ? this.engine.compute_horizon() : 2.0;
  }

  public computeISCO(): number {
    return this.engine ? this.engine.compute_isco() : 6.0;
  }
}

export const physicsBridge = new PhysicsBridge();
