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
  private controlView: Float32Array = new Float32Array(0);
  private cameraView: Float32Array = new Float32Array(0);
  private physicsView: Float32Array = new Float32Array(0);

  public async initialize(): Promise<void> {
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        console.log("PhysicsBridge: Initializing WASM Kernel...");

        // Note: In Next.js, we need to handle both SSR and Client-side loading.
        // The worker is the primary driver in production.
        this.worker = new Worker(
          new URL("../workers/physics.worker.ts", import.meta.url),
        );

        // Setup SharedArrayBuffer (SAB) for Zero-Copy Sync
        // 2MB is enough for headers + several 512x512 LUTs
        this.sab = new SharedArrayBuffer(2 * 1024 * 1024);
        this.initializeViews();

        this.worker.postMessage({ type: "INIT", sab: this.sab });

        return new Promise<void>((resolve, reject) => {
          if (!this.worker) return reject("Worker failed to init");
          this.worker.onmessage = (e) => {
            if (e.data.type === "READY") {
              console.log("PhysicsBridge: Worker Ready.");
              resolve();
            } else if (e.data.type === "ERROR") {
              reject(e.data.error);
            }
          };
        });
      } catch (err) {
        console.error("PhysicsBridge Fallback: Loading in main thread...", err);
        // Fallback for environments where workers or SAB are disabled
        const wasmModuleWrap = await import("../wasm/blackhole_physics");
        await wasmModuleWrap.default();
        this.engine = new wasmModuleWrap.PhysicsEngine(1.0, 0.9);
      }
    })();

    return this.initializationPromise;
  }

  private initializeViews() {
    if (!this.sab) return;
    this.controlView = new Float32Array(this.sab, OFFSETS.CONTROL, 16);
    this.cameraView = new Float32Array(this.sab, OFFSETS.CAMERA, 16);
    this.physicsView = new Float32Array(this.sab, OFFSETS.PHYSICS, 16);
  }

  public isReady(): boolean {
    return !!(this.engine || this.worker);
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
   */
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
