import { PhysicsEngine } from "blackhole-physics";

// Memory Protocol v2 Offsets (Must match Rust lib.rs)
export const OFFSETS = {
  CONTROL: 0,
  CAMERA: 64,
  PHYSICS: 128,
  TELEMETRY: 256,
  LUTS: 2048,
} as const;

export interface PhysicsBridgeConfig {
  wasmModule: any;
  sab?: SharedArrayBuffer; // Optional, creates new if undefined
}

export class PhysicsBridge {
  private engine: PhysicsEngine | null = null;
  private memory: WebAssembly.Memory | null = null;
  private f32: Float32Array | null = null;
  private u32: Uint32Array | null = null;
  private initializationPromise: Promise<void> | null = null;

  // View into specific sections
  public controlView!: Float32Array;
  public cameraView!: Float32Array;
  public physicsView!: Float32Array;
  public telemetryView!: Float32Array;

  constructor() {}

  /**
   * Safe entry point to ensure physics is ready before use.
   * Can be called multiple times; returns the same initialization promise.
   */
  public async ensureInitialized(): Promise<void> {
    if (this.engine) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        // Dynamic import of the WASM glue code
        const wasmModule = await import("blackhole-physics");
        // For 'web' target, we must call the default export (init)
        const wasm = await wasmModule.default();
        await this.init(wasm);
      } catch (err) {
        console.error("PhysicsBridge failed to initialize WASM:", err);
        this.initializationPromise = null;
        throw err;
      }
    })();

    return this.initializationPromise;
  }

  public async init(wasmModule: any) {
    if (this.engine) return;

    // Initialize the Rust WASM module
    this.engine = new PhysicsEngine(1.0, 0.0);

    // Access WASM linear memory
    this.memory = wasmModule.memory;

    if (this.memory && this.engine) {
      const sabPtr = this.engine.get_sab_ptr();
      const buffer = this.memory.buffer;
      const startIdx = sabPtr / 4;

      this.f32 = new Float32Array(buffer);
      this.u32 = new Uint32Array(buffer);

      // Create Zero-Copy Subarray Views into the Rust-owned buffer
      this.controlView = this.f32.subarray(
        startIdx + OFFSETS.CONTROL,
        startIdx + OFFSETS.CAMERA,
      );

      this.cameraView = this.f32.subarray(
        startIdx + OFFSETS.CAMERA,
        startIdx + OFFSETS.PHYSICS,
      );

      this.physicsView = this.f32.subarray(
        startIdx + OFFSETS.PHYSICS,
        startIdx + OFFSETS.TELEMETRY,
      );

      this.telemetryView = this.f32.subarray(
        startIdx + OFFSETS.TELEMETRY,
        startIdx + OFFSETS.LUTS,
      );

      console.log("Physics Bridge Initialized via Zero-Copy SAB Protocol");
    }
  }

  public isReady(): boolean {
    return !!this.engine && !!this.f32;
  }

  public tick(dt: number) {
    if (this.engine) {
      this.engine.tick_sab(dt);
    }
  }

  public updateParameters(mass: number, spin: number) {
    if (this.engine) {
      this.engine.update_params(mass, spin);
    }
  }

  public getDiskLUT(): Float32Array | null {
    if (!this.engine) return null;
    return this.engine.generate_disk_lut();
  }

  public getSpectrumLUT(width: number, maxTemp: number): Float32Array | null {
    if (!this.engine) return null;
    return this.engine.generate_spectrum_lut(width, maxTemp);
  }

  public computeHorizon(): number {
    return this.engine ? this.engine.compute_horizon() : 2.0;
  }

  public computeISCO(): number {
    return this.engine ? this.engine.compute_isco() : 6.0;
  }
}

export const physicsBridge = new PhysicsBridge();
