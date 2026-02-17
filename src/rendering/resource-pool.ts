/**
 * GPU Resource Pool (Phase 5.4)
 *
 * Manages recycling of WebGL textures and framebuffers to minimize
 * allocation overhead and prevent GPU memory fragmentation.
 *
 * Requirements:
 * - Reduce GPU allocation calls by 90% after initial warmup.
 * - Prevent hidden memory leaks in post-processing managers.
 */

export interface TextureDescriptor {
  width: number;
  height: number;
  internalFormat: number;
  format: number;
  type: number;
  minFilter?: number;
  magFilter?: number;
}

export class GPUResourcePool {
  private gl: WebGL2RenderingContext;
  private texturePool: Map<string, WebGLTexture[]> = new Map();
  private fboPool: Map<WebGLTexture, WebGLFramebuffer> = new Map();

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  private getDescriptorKey(desc: TextureDescriptor): string {
    return `${desc.width}x${desc.height}_${desc.internalFormat}_${desc.format}_${desc.type}`;
  }

  /**
   * Acquire a texture from the pool or create a new one.
   */
  public acquireTexture(desc: TextureDescriptor): WebGLTexture {
    const key = this.getDescriptorKey(desc);
    const pool = this.texturePool.get(key);

    if (pool && pool.length > 0) {
      const tex = pool.pop();
      if (tex) return tex;
    }

    // Create new texture if pool is empty
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) throw new Error("Failed to create texture");

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      desc.internalFormat,
      desc.width,
      desc.height,
      0,
      desc.format,
      desc.type,
      null,
    );

    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      desc.minFilter || gl.LINEAR,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      desc.magFilter || gl.LINEAR,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
  }

  /**
   * Return a texture to the pool for later reuse.
   */
  public releaseTexture(texture: WebGLTexture, desc: TextureDescriptor): void {
    const key = this.getDescriptorKey(desc);
    let pool = this.texturePool.get(key);
    if (!pool) {
      pool = [];
      this.texturePool.set(key, pool);
    }
    pool.push(texture);
  }

  /**
   * Acquire a framebuffer attached to the given texture.
   * Caches framebuffers to avoid gl.createFramebuffer() / gl.framebufferTexture2D().
   */
  public acquireFramebuffer(texture: WebGLTexture): WebGLFramebuffer {
    const existing = this.fboPool.get(texture);
    if (existing) return existing;

    const gl = this.gl;
    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error("Failed to create FBO");

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );

    this.fboPool.set(texture, fbo);
    return fbo;
  }

  /**
   * Cleanup all pooled resources.
   */
  public cleanup(): void {
    const gl = this.gl;

    // Cleanup textures
    this.texturePool.forEach((textures) => {
      textures.forEach((tex) => gl.deleteTexture(tex));
    });
    this.texturePool.clear();

    // Cleanup framebuffers
    this.fboPool.forEach((fbo) => gl.deleteFramebuffer(fbo));
    this.fboPool.clear();
  }
}
