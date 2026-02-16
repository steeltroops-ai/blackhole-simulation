import {
  createShader,
  createProgram,
  getSharedQuadBuffer,
} from "@/utils/webgl-utils";
import {
  reprojectionVertexShader,
  reprojectionFragmentShader,
} from "@/shaders/postprocess/reprojection.glsl";

/**
 * Temporal Reprojection Manager
 *
 * Implements a "Poor Man's TAA" (Temporal Accumulation) strategy:
 * - Maintains a history buffer (texture) of the previous frame.
 * - Blends the current frame with the history buffer.
 * - Drastically stabilizes noise from ray-marching (e.g., accretion disk turbulence).
 * - Disables accumulation during rapid camera movement to prevent ghosting.
 *
 * Phase 2 Architectural Component
 */
export class ReprojectionManager {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private quadBuffer: WebGLBuffer | null = null;

  // Double-buffering logic (ping-pong)
  private pingFramebuffer: WebGLFramebuffer | null = null;
  private pingTexture: WebGLTexture | null = null;
  private pongFramebuffer: WebGLFramebuffer | null = null;
  private pongTexture: WebGLTexture | null = null;

  private currentWriteIndex = 0; // 0 = ping, 1 = pong

  private width = 1;
  private height = 1;
  private isInitialized = false;

  // Cached uniform/attribute locations (Phase 1: eliminates per-frame string lookups)
  private loc_currentFrame: WebGLUniformLocation | null = null;
  private loc_historyFrame: WebGLUniformLocation | null = null;
  private loc_blendFactor: WebGLUniformLocation | null = null;
  private loc_cameraMoving: WebGLUniformLocation | null = null;
  private loc_textureScale: WebGLUniformLocation | null = null;
  private loc_resolution: WebGLUniformLocation | null = null;
  private attrib_position: number = -1;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.initShaders();
    this.quadBuffer = getSharedQuadBuffer(gl);
  }

  private initShaders() {
    const vs = createShader(
      this.gl,
      this.gl.VERTEX_SHADER,
      reprojectionVertexShader,
    );
    const fs = createShader(
      this.gl,
      this.gl.FRAGMENT_SHADER,
      reprojectionFragmentShader,
    );

    if (vs && fs) {
      this.program = createProgram(this.gl, vs, fs);
    }

    // Cache uniform and attribute locations (O(1) per frame instead of O(4) string lookups)
    if (this.program) {
      const gl = this.gl;
      this.loc_currentFrame = gl.getUniformLocation(
        this.program,
        "u_currentFrame",
      );
      this.loc_historyFrame = gl.getUniformLocation(
        this.program,
        "u_historyFrame",
      );
      this.loc_blendFactor = gl.getUniformLocation(
        this.program,
        "u_blendFactor",
      );
      this.loc_cameraMoving = gl.getUniformLocation(
        this.program,
        "u_cameraMoving",
      );
      this.loc_textureScale = gl.getUniformLocation(
        this.program,
        "u_textureScale",
      );
      this.loc_resolution = gl.getUniformLocation(this.program, "u_resolution");
      this.attrib_position = gl.getAttribLocation(this.program, "position");
    }
  }

  /**
   * Initialize buffers based on screen size.
   * Must be called on resize.
   */
  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;

    // Cleanup old textures
    this.cleanupTextures();

    // Create Ping (Read/History)
    this.pingTexture = this.createTexture(width, height);
    this.pingFramebuffer = this.createFramebuffer(this.pingTexture);

    // Create Pong (Write/Current)
    this.pongTexture = this.createTexture(width, height);
    this.pongFramebuffer = this.createFramebuffer(this.pongTexture);

    this.isInitialized = true;
  }

  private createTexture(width: number, height: number): WebGLTexture | null {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
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
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  private createFramebuffer(
    texture: WebGLTexture | null,
  ): WebGLFramebuffer | null {
    if (!texture) return null;
    const gl = this.gl;
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );

    // Phase 1 Fix: Check framebuffer completeness
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.error(
        "ReprojectionManager: Framebuffer incomplete, status:",
        status,
      );
      gl.deleteFramebuffer(fb);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return null;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fb;
  }

  private cleanupTextures() {
    const gl = this.gl;
    if (this.pingTexture) gl.deleteTexture(this.pingTexture);
    if (this.pingFramebuffer) gl.deleteFramebuffer(this.pingFramebuffer);
    if (this.pongTexture) gl.deleteTexture(this.pongTexture);
    if (this.pongFramebuffer) gl.deleteFramebuffer(this.pongFramebuffer);
  }

  /**
   * Resolve the current frame by blending with history.
   *
   * @param sourceTexture The texture containing the raw current frame render
   * @param blendFactor 0.0 to 1.0 (default 0.9 for high stability)
   * @param cameraMoving Boolean flag - if true, blend factor is reduced to prevent ghosting
   */
  public resolve(
    sourceTexture: WebGLTexture,
    blendFactor: number = 0.7, // Reduced from 0.9 for less ghosting
    cameraMoving: boolean = false,
    renderScale: number = 1.0,
  ) {
    if (!this.program || !this.isInitialized) return;

    const gl = this.gl;

    // Determine Read (History) and Write (Current Result) targets
    // If index is 0: Write to Pong, Read from Ping
    // If index is 1: Write to Ping, Read from Pong
    const writeFb =
      this.currentWriteIndex === 0
        ? this.pongFramebuffer
        : this.pingFramebuffer;
    const readTex =
      this.currentWriteIndex === 0 ? this.pingTexture : this.pongTexture;

    if (!writeFb || !readTex) return;

    // 1. Bind Write Framebuffer (Destination)
    // We are rendering the "blended result" into this buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, writeFb);

    // Virtual Viewport Scaling
    const scaledWidth = Math.floor(this.width * renderScale);
    const scaledHeight = Math.floor(this.height * renderScale);
    gl.viewport(0, 0, scaledWidth, scaledHeight);

    gl.useProgram(this.program);

    // 2. Bind Textures (using cached locations -- zero string lookups)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(this.loc_currentFrame!, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, readTex);
    gl.uniform1i(this.loc_historyFrame!, 1);

    // 3. Set Uniforms (cached locations)
    gl.uniform1f(this.loc_blendFactor!, blendFactor);
    gl.uniform1i(this.loc_cameraMoving!, cameraMoving ? 1 : 0);
    if (this.loc_textureScale)
      gl.uniform2f(this.loc_textureScale, renderScale, renderScale);
    if (this.loc_resolution)
      gl.uniform2f(this.loc_resolution, scaledWidth, scaledHeight);

    // 4. Draw Quad (using cached attribute location)
    if (this.quadBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      if (this.attrib_position !== -1) {
        gl.enableVertexAttribArray(this.attrib_position);
        gl.vertexAttribPointer(this.attrib_position, 2, gl.FLOAT, false, 0, 0);
      }
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // Safety: Unbind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // 5. Swap ping-pong for next frame
    this.currentWriteIndex = 1 - this.currentWriteIndex;
  }

  /**
   * Returns the texture containing the final blended result.
   * This should be drawn to the screen or passed to next stage (Bloom).
   */
  public getResultTexture(): WebGLTexture | null {
    // After swap: if currentWriteIndex is 1, we just wrote to pong (index 0).
    return this.currentWriteIndex === 1 ? this.pongTexture : this.pingTexture;
  }

  /**
   * Cleanup all GPU resources.
   * Must be called on unmount to prevent GPU memory leaks.
   */
  public cleanup(): void {
    this.cleanupTextures();
    const gl = this.gl;
    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }
    this.quadBuffer = null; // Shared buffer, do not delete
    this.isInitialized = false;
    this.loc_currentFrame = null;
    this.loc_historyFrame = null;
    this.loc_blendFactor = null;
    this.loc_cameraMoving = null;
    this.attrib_position = -1;
  }
}
