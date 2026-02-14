/**
 * Bloom Post-Processing Manager
 *
 * Manages multi-pass bloom rendering:
 * 1. Render scene to framebuffer
 * 2. Extract bright pixels
 * 3. Apply Gaussian blur (horizontal + vertical)
 * 4. Combine with original scene
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import {
  bloomVertexShader,
  brightPassShader,
  blurShader,
  combineShader,
} from "../shaders/postprocess/bloom.glsl";
import { createQuadBuffer, setupPositionAttribute } from "../utils/webgl-utils";

/**
 * Bloom configuration
 */
export interface BloomConfig {
  enabled: boolean;
  intensity: number; // 0.0 to 1.0
  threshold: number; // Brightness threshold for bloom
  blurPasses: number; // Number of blur iterations
}

/**
 * Default bloom configuration
 */
export const DEFAULT_BLOOM_CONFIG: BloomConfig = {
  enabled: true,
  intensity: 0.5,
  threshold: 0.8,
  blurPasses: 2,
};

/**
 * Bloom Post-Processing Manager
 *
 * Requirements:
 * - 8.1: Skip bloom render pass when disabled
 * - 8.2: Output fragment colors directly without post-processing when disabled
 * - 8.3: Apply multi-pass bloom with configurable intensity when enabled
 * - 8.4: Reduce frame time by at least 20% when disabled
 */
export class BloomManager {
  private gl: WebGLRenderingContext;
  private config: BloomConfig;

  // Framebuffers
  private sceneFramebuffer: WebGLFramebuffer | null = null;
  private brightFramebuffer: WebGLFramebuffer | null = null;
  private blurFramebuffer1: WebGLFramebuffer | null = null;
  private blurFramebuffer2: WebGLFramebuffer | null = null;

  // Textures
  private sceneTexture: WebGLTexture | null = null;
  private brightTexture: WebGLTexture | null = null;
  private blurTexture1: WebGLTexture | null = null;
  private blurTexture2: WebGLTexture | null = null;

  // Shader programs
  private brightPassProgram: WebGLProgram | null = null;
  private blurProgram: WebGLProgram | null = null;
  private combineProgram: WebGLProgram | null = null;

  // Vertex buffer for full-screen quad
  private quadBuffer: WebGLBuffer | null = null;

  // Canvas dimensions
  private width: number = 0;
  private height: number = 0;

  constructor(
    gl: WebGLRenderingContext,
    config: BloomConfig = DEFAULT_BLOOM_CONFIG,
  ) {
    this.gl = gl;
    this.config = { ...config };
  }

  /**
   * Initialize bloom resources
   * Requirements: 8.1, 8.3
   */
  initialize(width: number, height: number): boolean {
    this.width = width;
    this.height = height;

    try {
      // Create full-screen quad buffer
      this.quadBuffer = createQuadBuffer(this.gl);
      if (!this.quadBuffer) {
        throw new Error("Failed to create quad buffer");
      }

      // Compile shader programs
      this.brightPassProgram = this.createProgram(
        bloomVertexShader,
        brightPassShader,
      );
      this.blurProgram = this.createProgram(bloomVertexShader, blurShader);
      this.combineProgram = this.createProgram(
        bloomVertexShader,
        combineShader,
      );

      if (
        !this.brightPassProgram ||
        !this.blurProgram ||
        !this.combineProgram
      ) {
        throw new Error("Failed to compile bloom shaders");
      }

      // Create framebuffers and textures
      this.createFramebuffers();

      return true;
    } catch (error) {
      console.error("Failed to initialize bloom:", error);
      this.cleanup();
      return false;
    }
  }

  /**
   * Create framebuffers and textures for bloom passes
   */
  private createFramebuffers(): void {
    // Scene framebuffer (full resolution)
    this.sceneTexture = this.createTexture(this.width, this.height);
    if (!this.sceneTexture) throw new Error("Failed to create scene texture");
    this.sceneFramebuffer = this.createFramebuffer(this.sceneTexture);

    // Bright pass framebuffer (half resolution for performance)
    const halfWidth = Math.max(1, Math.floor(this.width / 2));
    const halfHeight = Math.max(1, Math.floor(this.height / 2));

    this.brightTexture = this.createTexture(halfWidth, halfHeight);
    if (!this.brightTexture) throw new Error("Failed to create bright texture");
    this.brightFramebuffer = this.createFramebuffer(this.brightTexture);

    // Blur framebuffers (half resolution)
    this.blurTexture1 = this.createTexture(halfWidth, halfHeight);
    if (!this.blurTexture1) throw new Error("Failed to create blur texture 1");
    this.blurFramebuffer1 = this.createFramebuffer(this.blurTexture1);

    this.blurTexture2 = this.createTexture(halfWidth, halfHeight);
    if (!this.blurTexture2) throw new Error("Failed to create blur texture 2");
    this.blurFramebuffer2 = this.createFramebuffer(this.blurTexture2);
  }

  /**
   * Create a texture
   */
  private createTexture(width: number, height: number): WebGLTexture | null {
    const gl = this.gl;
    const texture = gl.createTexture();

    if (!texture) return null;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );

    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
  }

  /**
   * Create a framebuffer with attached texture
   */
  private createFramebuffer(texture: WebGLTexture): WebGLFramebuffer | null {
    const gl = this.gl;
    const framebuffer = gl.createFramebuffer();

    if (!framebuffer) return null;

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );

    // Check framebuffer status
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.error("Framebuffer incomplete:", status);
      return null;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return framebuffer;
  }

  /**
   * Compile shader program
   */
  private createProgram(
    vertexSource: string,
    fragmentSource: string,
  ): WebGLProgram | null {
    const gl = this.gl;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(
      gl.FRAGMENT_SHADER,
      fragmentSource,
    );

    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return null;
    }

    return program;
  }

  /**
   * Compile shader
   */
  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;
    const shader = gl.createShader(type);

    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }

  /**
   * Begin scene rendering
   * Requirements: 8.1, 8.2
   *
   * @returns Framebuffer to render to (null for direct rendering when bloom disabled)
   */
  beginScene(forceOffscreen = false): WebGLFramebuffer | null {
    // Requirements: 8.1, 8.2
    // If bloom is globally disabled, render directly to screen (unless forced offscreen by TAA)
    if (!this.config.enabled && !forceOffscreen) {
      return null;
    }

    // Safety: If Framebuffer failed to initialize, fallback to screen to prevent black void
    if (!this.sceneFramebuffer) {
      console.warn("Bloom FBO missing, falling back to direct screen render");
      return null;
    }

    // Safety: Unbind potential feedback textures
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.sceneFramebuffer);
    return this.sceneFramebuffer;
  }

  /**
   * Apply bloom post-processing
   * Requirements: 8.3
   */
  /**
   * Get the scene texture (raw render result)
   */
  getSceneTexture(): WebGLTexture | null {
    return this.sceneTexture;
  }

  /**
   * Apply bloom post-processing to the internally rendered scene
   * Requirements: 8.3
   */
  applyBloom(): void {
    if (!this.config.enabled || !this.sceneTexture) {
      return;
    }
    this.applyBloomToTexture(this.sceneTexture);
  }

  /**
   * Apply bloom post-processing to a specific input texture
   * and render the result to the screen.
   *
   * This is used when the input comes from an external source (like Reprojection TAA)
   * rather than the internal sceneFramebuffer.
   */
  applyBloomToTexture(inputTexture: WebGLTexture): void {
    // Requirement 8.1: Skip bloom when disabled
    if (!this.config.enabled) {
      // If bloom is disabled, we still need to draw the input texture to screen
      // because the input might be an offscreen TAA buffer.
      this.drawTextureToScreen(inputTexture);
      return;
    }

    const gl = this.gl;

    // Save current viewport
    // Optimization: Avoid gl.getParameter(gl.VIEWPORT) which causes pipeline stall
    // We know the viewport matches our canvas dimensions
    const viewport = [0, 0, this.width, this.height];

    // Bind quad buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);

    // === PASS 1: Extract bright pixels ===
    if (!this.brightPassProgram || !this.blurProgram || !this.combineProgram) {
      return;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.brightFramebuffer);
    const halfWidth = Math.max(1, Math.floor(this.width / 2));
    const halfHeight = Math.max(1, Math.floor(this.height / 2));
    gl.viewport(0, 0, halfWidth, halfHeight);

    gl.useProgram(this.brightPassProgram);

    setupPositionAttribute(
      gl,
      this.brightPassProgram,
      "position",
      this.quadBuffer,
    );

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture); // USE INPUT TEXTURE
    gl.uniform1i(gl.getUniformLocation(this.brightPassProgram, "u_texture"), 0);
    gl.uniform1f(
      gl.getUniformLocation(this.brightPassProgram, "u_threshold"),
      this.config.threshold,
    );

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Unbind to prevent feedback
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // === PASS 2: Blur passes ===
    gl.useProgram(this.blurProgram);

    setupPositionAttribute(gl, this.blurProgram, "position", this.quadBuffer);

    const resolutionLoc = gl.getUniformLocation(
      this.blurProgram,
      "u_resolution",
    );
    const directionLoc = gl.getUniformLocation(this.blurProgram, "u_direction");
    const textureLoc = gl.getUniformLocation(this.blurProgram, "u_texture");

    gl.uniform2f(resolutionLoc, halfWidth, halfHeight);

    let sourceTexture = this.brightTexture;
    let targetFramebuffer = this.blurFramebuffer1;
    let targetTexture = this.blurTexture1;

    for (let i = 0; i < this.config.blurPasses; i++) {
      // Horizontal blur
      gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
      gl.uniform1i(textureLoc, 0);
      gl.uniform2f(directionLoc, 1.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT); // Clear buffer before drawing
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Unbind texture immediately to prevent feedback
      gl.bindTexture(gl.TEXTURE_2D, null);

      // Vertical blur
      sourceTexture = targetTexture;
      targetFramebuffer =
        i % 2 === 0 ? this.blurFramebuffer2 : this.blurFramebuffer1;
      targetTexture = i % 2 === 0 ? this.blurTexture2 : this.blurTexture1;

      gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
      gl.uniform1i(textureLoc, 0);
      gl.uniform2f(directionLoc, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT); // Clear buffer
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Unbind texture immediately
      gl.bindTexture(gl.TEXTURE_2D, null);

      sourceTexture = targetTexture;
      targetFramebuffer =
        i % 2 === 0 ? this.blurFramebuffer1 : this.blurFramebuffer2;
      targetTexture = i % 2 === 0 ? this.blurTexture1 : this.blurTexture2;
    }

    // === PASS 3: Combine with original scene ===
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);

    gl.useProgram(this.combineProgram);
    setupPositionAttribute(
      gl,
      this.combineProgram,
      "position",
      this.quadBuffer,
    );

    // Bind scene texture (Original Input)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture); // USE INPUT TEXTURE
    gl.uniform1i(
      gl.getUniformLocation(this.combineProgram, "u_sceneTexture"),
      0,
    );

    // Bind bloom texture (Blurred Result)
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(
      gl.getUniformLocation(this.combineProgram, "u_bloomTexture"),
      1,
    );

    // Set bloom intensity
    gl.uniform1f(
      gl.getUniformLocation(this.combineProgram, "u_bloomIntensity"),
      this.config.intensity,
    );

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Unbind all units used in combine
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Helper to simple draw a texture to screen (no bloom)
   */
  private drawTextureToScreen(texture: WebGLTexture): void {
    // Re-use combine shader with 0 intensity? Or a simple passthrough?
    // Combine shader is simplest reuse
    // Combine shader is simplest reuse
    const gl = this.gl;
    if (!this.combineProgram) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.combineProgram);

    setupPositionAttribute(
      gl,
      this.combineProgram,
      "position",
      this.quadBuffer,
    );

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(
      gl.getUniformLocation(this.combineProgram, "u_sceneTexture"),
      0,
    );

    gl.activeTexture(gl.TEXTURE1); // Bind something to avoid warning, though unused
    gl.bindTexture(gl.TEXTURE_2D, this.brightTexture); // safe dummy
    gl.uniform1i(
      gl.getUniformLocation(this.combineProgram, "u_bloomTexture"),
      1,
    );

    gl.uniform1f(
      gl.getUniformLocation(this.combineProgram, "u_bloomIntensity"),
      0.0,
    );

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Cleanup
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Update bloom configuration
   */
  updateConfig(config: Partial<BloomConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Resize framebuffers
   */
  resize(width: number, height: number): void {
    if (this.width === width && this.height === height) {
      return;
    }

    this.width = width;
    this.height = height;

    // Recreate framebuffers with new size
    this.cleanupFramebuffers();
    this.createFramebuffers();
  }

  /**
   * Cleanup framebuffers
   */
  private cleanupFramebuffers(): void {
    const gl = this.gl;

    if (this.sceneFramebuffer) gl.deleteFramebuffer(this.sceneFramebuffer);
    if (this.brightFramebuffer) gl.deleteFramebuffer(this.brightFramebuffer);
    if (this.blurFramebuffer1) gl.deleteFramebuffer(this.blurFramebuffer1);
    if (this.blurFramebuffer2) gl.deleteFramebuffer(this.blurFramebuffer2);

    if (this.sceneTexture) gl.deleteTexture(this.sceneTexture);
    if (this.brightTexture) gl.deleteTexture(this.brightTexture);
    if (this.blurTexture1) gl.deleteTexture(this.blurTexture1);
    if (this.blurTexture2) gl.deleteTexture(this.blurTexture2);

    this.sceneFramebuffer = null;
    this.brightFramebuffer = null;
    this.blurFramebuffer1 = null;
    this.blurFramebuffer2 = null;

    this.sceneTexture = null;
    this.brightTexture = null;
    this.blurTexture1 = null;
    this.blurTexture2 = null;
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    const gl = this.gl;

    this.cleanupFramebuffers();

    if (this.brightPassProgram) gl.deleteProgram(this.brightPassProgram);
    if (this.blurProgram) gl.deleteProgram(this.blurProgram);
    if (this.combineProgram) gl.deleteProgram(this.combineProgram);
    // Do not delete quadBuffer as it is shared

    this.brightPassProgram = null;
    this.blurProgram = null;
    this.combineProgram = null;
    this.quadBuffer = null;
  }
}
