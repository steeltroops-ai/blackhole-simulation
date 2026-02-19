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
import { createQuadBuffer } from "../utils/webgl-utils";

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
  private gl: WebGL2RenderingContext;
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

  // Phase 2: Cached uniform and attribute locations
  // Eliminates ~16 gl.getUniformLocation() string lookups per frame
  private locs: {
    // brightPass program
    bp_texture: WebGLUniformLocation | null;
    bp_threshold: WebGLUniformLocation | null;
    bp_position: number;
    // blur program
    blur_texture: WebGLUniformLocation | null;
    blur_resolution: WebGLUniformLocation | null;
    blur_direction: WebGLUniformLocation | null;
    blur_position: number;
    // combine program
    combine_sceneTexture: WebGLUniformLocation | null;
    combine_bloomTexture: WebGLUniformLocation | null;
    combine_bloomIntensity: WebGLUniformLocation | null;
    combine_position: number;
    // Virtual Viewport Scaling
    bp_textureScale: WebGLUniformLocation | null;
    combine_textureScale: WebGLUniformLocation | null;
    draw_textureScale: WebGLUniformLocation | null;
  } = {
    bp_texture: null,
    bp_threshold: null,
    bp_position: -1,
    blur_texture: null,
    blur_resolution: null,
    blur_direction: null,
    blur_position: -1,
    combine_sceneTexture: null,
    combine_bloomTexture: null,
    combine_bloomIntensity: null,
    combine_position: -1,
    bp_textureScale: null,
    combine_textureScale: null,
    draw_textureScale: null,
  };

  constructor(
    gl: WebGL2RenderingContext,
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

      // Phase 2: Cache all uniform and attribute locations at init time
      this.cacheLocations();

      // Create framebuffers and textures
      this.createFramebuffers();

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
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

    // Blur framebuffers (quarter resolution for wider bloom and performance)
    const blurWidth = Math.max(1, Math.floor(this.width / 4));
    const blurHeight = Math.max(1, Math.floor(this.height / 4));

    this.blurTexture1 = this.createTexture(blurWidth, blurHeight);
    if (!this.blurTexture1) throw new Error("Failed to create blur texture 1");
    this.blurFramebuffer1 = this.createFramebuffer(this.blurTexture1);

    this.blurTexture2 = this.createTexture(blurWidth, blurHeight);
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
      gl.RGBA16F, // Internal format: 16-bit floating point per channel (HDR)
      width,
      height,
      0,
      gl.RGBA,
      gl.HALF_FLOAT, // Type: Half float is sufficient for HDR and faster
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
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.error("Shader compile error:", gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }

  /**
   * Cache all uniform and attribute locations for all 3 programs.
   * Called once at initialization. Eliminates per-frame string lookups.
   */
  private cacheLocations(): void {
    const gl = this.gl;

    if (this.brightPassProgram) {
      this.locs.bp_texture = gl.getUniformLocation(
        this.brightPassProgram,
        "u_texture",
      );
      this.locs.bp_threshold = gl.getUniformLocation(
        this.brightPassProgram,
        "u_threshold",
      );
      this.locs.bp_position = gl.getAttribLocation(
        this.brightPassProgram,
        "position",
      );
      this.locs.bp_textureScale = gl.getUniformLocation(
        this.brightPassProgram,
        "u_textureScale",
      );
    }

    if (this.blurProgram) {
      this.locs.blur_texture = gl.getUniformLocation(
        this.blurProgram,
        "u_texture",
      );
      this.locs.blur_resolution = gl.getUniformLocation(
        this.blurProgram,
        "u_resolution",
      );
      this.locs.blur_direction = gl.getUniformLocation(
        this.blurProgram,
        "u_direction",
      );
      this.locs.blur_position = gl.getAttribLocation(
        this.blurProgram,
        "position",
      );
    }

    if (this.combineProgram) {
      this.locs.combine_sceneTexture = gl.getUniformLocation(
        this.combineProgram,
        "u_sceneTexture",
      );
      this.locs.combine_bloomTexture = gl.getUniformLocation(
        this.combineProgram,
        "u_bloomTexture",
      );
      this.locs.combine_bloomIntensity = gl.getUniformLocation(
        this.combineProgram,
        "u_bloomIntensity",
      );
      this.locs.combine_position = gl.getAttribLocation(
        this.combineProgram,
        "position",
      );
      this.locs.combine_textureScale = gl.getUniformLocation(
        this.combineProgram,
        "u_textureScale",
      );
    }
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
      // eslint-disable-next-line no-console
      console.warn("Bloom FBO missing");
      return null;
    }

    // Safety: Unbind potential feedback textures
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    this.gl.activeTexture(this.gl.TEXTURE1);
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
  applyBloom(renderScale: number = 1.0): void {
    if (!this.config.enabled || !this.sceneTexture) {
      return;
    }
    this.applyBloomToTexture(this.sceneTexture, renderScale);
  }

  /**
   * Apply bloom post-processing to a specific input texture
   * and render the result to the screen.
   *
   * This is used when the input comes from an external source (like Reprojection TAA)
   * rather than the internal sceneFramebuffer.
   */
  applyBloomToTexture(
    inputTexture: WebGLTexture,
    renderScale: number = 1.0,
  ): void {
    // Requirement 8.1: Skip bloom when disabled
    if (!this.config.enabled) {
      // If bloom is disabled, we still need to draw the input texture to screen
      // because the input might be an offscreen TAA buffer.
      this.drawTextureToScreen(inputTexture, renderScale);
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
    // Scale the bright pass viewport by the same renderScale
    const halfWidth = Math.max(1, Math.floor((this.width * renderScale) / 2));
    const halfHeight = Math.max(1, Math.floor((this.height * renderScale) / 2));
    gl.viewport(0, 0, halfWidth, halfHeight);

    gl.useProgram(this.brightPassProgram);

    // Phase 2: Use cached attribute location
    if (this.locs.bp_position !== -1) {
      gl.enableVertexAttribArray(this.locs.bp_position);
      gl.vertexAttribPointer(this.locs.bp_position, 2, gl.FLOAT, false, 0, 0);
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    gl.uniform1i(this.locs.bp_texture, 0);
    gl.uniform1f(this.locs.bp_threshold, this.config.threshold);
    // Set texture scale for sampling the active sub-region
    if (this.locs.bp_textureScale) {
      gl.uniform2f(this.locs.bp_textureScale, renderScale, renderScale);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Unbind to prevent feedback
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // === PASS 2: Blur passes ===
    gl.useProgram(this.blurProgram);

    // Phase 2: Use cached attribute location
    if (this.locs.blur_position !== -1) {
      gl.enableVertexAttribArray(this.locs.blur_position);
      gl.vertexAttribPointer(this.locs.blur_position, 2, gl.FLOAT, false, 0, 0);
    }

    // Set viewport to quarter resolution for blur passes (scaled by renderScale)
    const blurWidth = Math.max(1, Math.floor((this.width * renderScale) / 4));
    const blurHeight = Math.max(1, Math.floor((this.height * renderScale) / 4));
    gl.viewport(0, 0, blurWidth, blurHeight);

    gl.uniform2f(this.locs.blur_resolution, blurWidth, blurHeight);

    let currentSourceTexture = this.brightTexture;

    for (let i = 0; i < this.config.blurPasses; i++) {
      // Horizontal blur: Source -> Blur1
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.blurFramebuffer1);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, currentSourceTexture);
      gl.uniform1i(this.locs.blur_texture, 0);
      gl.uniform2f(this.locs.blur_direction, 1.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Vertical blur: Blur1 -> Blur2
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.blurFramebuffer2);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.blurTexture1);
      gl.uniform1i(this.locs.blur_texture, 0);
      gl.uniform2f(this.locs.blur_direction, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // For next iteration, source is Blur2
      currentSourceTexture = this.blurTexture2;
    }

    // Final source texture for combine pass is the result of vertical blur
    const sourceTexture = currentSourceTexture;

    // === PASS 3: Combine with original scene ===
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);

    gl.useProgram(this.combineProgram);

    // Phase 2: Use cached attribute location
    if (this.locs.combine_position !== -1) {
      gl.enableVertexAttribArray(this.locs.combine_position);
      gl.vertexAttribPointer(
        this.locs.combine_position,
        2,
        gl.FLOAT,
        false,
        0,
        0,
      );
    }

    // Bind scene texture (Original Input)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    gl.uniform1i(this.locs.combine_sceneTexture, 0);

    // Bind bloom texture (Blurred Result)
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(this.locs.combine_bloomTexture, 1);

    // Set bloom intensity
    gl.uniform1f(this.locs.combine_bloomIntensity, this.config.intensity);

    // Virtual Viewport: Scale original input coordinates
    if (this.locs.combine_textureScale) {
      gl.uniform2f(this.locs.combine_textureScale, renderScale, renderScale);
    }

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
  public drawTextureToScreen(
    texture: WebGLTexture,
    renderScale: number = 1.0,
  ): void {
    // Re-use combine shader with 0 intensity? Or a simple passthrough?
    const gl = this.gl;
    if (!this.combineProgram) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.combineProgram);

    // Phase 2: Use cached locations
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    if (this.locs.combine_position !== -1) {
      gl.enableVertexAttribArray(this.locs.combine_position);
      gl.vertexAttribPointer(
        this.locs.combine_position,
        2,
        gl.FLOAT,
        false,
        0,
        0,
      );
    }

    // Virtual Viewport Scaling
    if (this.locs.combine_textureScale) {
      gl.uniform2f(this.locs.combine_textureScale, renderScale, renderScale);
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.locs.combine_sceneTexture, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.brightTexture); // safe dummy
    gl.uniform1i(this.locs.combine_bloomTexture, 1);

    gl.uniform1f(this.locs.combine_bloomIntensity, 0.0);

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
    // Phase 2: Mutate in-place instead of spread-allocating
    if (config.enabled !== undefined) this.config.enabled = config.enabled;
    if (config.intensity !== undefined)
      this.config.intensity = config.intensity;
    if (config.threshold !== undefined)
      this.config.threshold = config.threshold;
    if (config.blurPasses !== undefined)
      this.config.blurPasses = config.blurPasses;
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
