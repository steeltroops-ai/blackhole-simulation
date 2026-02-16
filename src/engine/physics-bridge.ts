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

  // View into specific sections
  public controlView!: Float32Array; // Changed to Float32Array to match Rust f32 reads
  public cameraView!: Float32Array;
  public physicsView!: Float32Array;
  public telemetryView!: Float32Array;

  constructor() {}

  async init(wasmModule: any) {
    // Initialize the Rust WASM module
    this.engine = new PhysicsEngine(1.0, 0.0); // Default mass=1, spin=0

    // Get the pointer to the internal SAB buffer in Rust memory
    const sabPtr = this.engine.get_sab_ptr();

    // Access WASM linear memory
    this.memory = wasmModule.memory;

    if (this.memory) {
      // ... (buffer calc) ...
      const buffer = this.memory.buffer;
      const startIdx = sabPtr / 4;

      this.f32 = new Float32Array(buffer);
      this.u32 = new Uint32Array(buffer);

      // Create Zero-Copy Subarray Views into the Rust-owned buffer
      
      // Control Block (f32) - Rust reads these as f32
      this.controlView = this.f32.subarray(
        startIdx + OFFSETS.CONTROL,
        startIdx + OFFSETS.CAMERA
      );

      // Camera Block (f32)
      this.cameraView = this.f32.subarray(
        startIdx + OFFSETS.CAMERA,
        startIdx + OFFSETS.PHYSICS
      );

      // Physics Block (f32)
      this.physicsView = this.f32.subarray(
        startIdx + OFFSETS.PHYSICS,
        startIdx + OFFSETS.TELEMETRY
      );

      // Telemetry Block (f32)
      this.telemetryView = this.f32.subarray(
        startIdx + OFFSETS.TELEMETRY,
        startIdx + OFFSETS.LUTS
      );
      
      console.log("Physics Bridge Initialized via Zero-Copy SAB Protocol");
    }
  }

  // Helper validation (removed createViews as it is now integrated into init)
  public isReady(): boolean {
      return !!this.engine && !!this.f32;
  }
  
  public tick(dt: number) {
      if (this.engine) {
          // In real zero-copy, we might just write to SAB and let Rust read it.
          // But tick_sab triggers the update logic in Rust.
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
    // This returns a copy from Rust (via wasm-bindgen currently)
    // Future optimization: Return a view into the WASM memory directly
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
