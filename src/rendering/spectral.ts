import { physicsBridge } from "@/engine/physics-bridge";
import { createTextureFromData } from "@/utils/webgl-utils";

/**
 * SpectralManager: Handles the generation and lifecycle of the Spectral LUT.
 *
 * This component executes Phase 1.1 of the Horizon Gold implementation plan.
 * It bridges the Rust-generated CIE 1931 spectral data with the WebGL pipeline.
 */
export class SpectralManager {
  private gl: WebGL2RenderingContext;
  private texture: WebGLTexture | null = null;
  private width: number = 4096;
  private height: number = 256; // High-res redshift axis

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /**
   * Initializes or refreshes the Spectral LUT from the Rust physics kernel.
   * Uses RGBA16F format for high dynamic range spectral density.
   */
  public async initialize(): Promise<boolean> {
    try {
      await physicsBridge.ensureInitialized();

      // Generate 2D LUT: [Temperature, Redshift]
      // Max disc temperature is roughly 10^7 K for stellar mass BH
      const data = physicsBridge.getSpectrumLUT(
        this.width,
        this.height,
        10000000.0,
      );

      if (!data) {
        // eslint-disable-next-line no-console
        console.warn(
          "SpectralManager: Failed to retrieve LUT from PhysicsBridge",
        );
        return false;
      }

      // Create high-precision floating point texture
      this.texture = createTextureFromData(this.gl, {
        width: this.width,
        height: this.height,
        data: data,
        internalFormat: this.gl.RGBA16F,
        format: this.gl.RGBA,
        type: this.gl.HALF_FLOAT, // Balanced performance/precision
        minFilter: this.gl.LINEAR,
        magFilter: this.gl.LINEAR,
        wrap: this.gl.CLAMP_TO_EDGE,
      });

      // eslint-disable-next-line no-console
      console.log(
        `SpectralManager: Initialized ${this.width}x${this.height} RGBA16F LUT`,
      );
      return !!this.texture;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("SpectralManager: Initialization error", err);
      return false;
    }
  }

  public getTexture(): WebGLTexture | null {
    return this.texture;
  }

  public cleanup(): void {
    if (this.texture && this.gl) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }
  }
}
