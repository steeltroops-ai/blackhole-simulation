/**
 * WebGL Utility Functions
 *
 * This module provides utility functions for WebGL shader compilation,
 * program linking, and buffer setup. These functions are extracted from
 * the main application to improve code organization and reusability.
 */

/**
 * Creates and compiles a WebGL shader from source code.
 *
 * @param gl - The WebGL rendering context
 * @param type - The type of shader (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
 * @param source - The GLSL shader source code as a string
 * @returns The compiled WebGLShader, or null if compilation failed
 *
 * @example
 * const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
 * if (!vertexShader) {
 *   console.error('Failed to compile vertex shader');
 * }
 */
export function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    const typeStr = type === gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT";

    // Format source with line numbers
    const lines = source.split("\n");
    const numberedSource = lines
      .map((l, i) => `${(i + 1).toString().padStart(4, " ")}: ${l}`)
      .join("\n");

    console.error(
      `Shader Compilation Error (${typeStr}):\n${info}\n\nSource:\n${numberedSource}`,
    );

    gl.deleteShader(shader);

    // Throw error to be caught by caller
    throw new Error(`Shader Compilation Failed (${typeStr}): ${info}`);
  }
  return shader;
}

/**
 * Creates and links a WebGL program from vertex and fragment shaders.
 *
 * @param gl - The WebGL rendering context
 * @param vertexShader - The compiled vertex shader
 * @param fragmentShader - The compiled fragment shader
 * @returns The linked WebGLProgram, or null if linking failed
 *
 * @example
 * const program = createProgram(gl, vertexShader, fragmentShader);
 * if (!program) {
 *   console.error('Failed to create WebGL program');
 * }
 */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) {
    console.error("Failed to create program");
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    console.error(`Program link error: ${info}`);
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

/**
 * Creates a buffer with vertex data for a full-screen quad.
 * This is commonly used for fragment shader-based rendering where
 * all computation happens in the fragment shader.
 *
 * @param gl - The WebGL rendering context
 * @returns The WebGLBuffer containing the quad vertices, or null if creation failed
 *
 * @example
 * const buffer = createQuadBuffer(gl);
 * if (buffer) {
 *   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
 * }
 */
/**
 * Shared Geometry Manager
 * Maintains a single VBO per GL context to avoid duplicate allocations.
 */
const sharedQuadBuffers = new WeakMap<WebGL2RenderingContext, WebGLBuffer>();

/**
 * Returns a shared WebGLBuffer containing a full-screen quad.
 * Creates it if it doesn't exist for the given context.
 */
export function getSharedQuadBuffer(
  gl: WebGL2RenderingContext,
): WebGLBuffer | null {
  const existing = sharedQuadBuffers.get(gl);
  if (existing && gl.isBuffer(existing)) {
    return existing;
  }

  const buffer = gl.createBuffer();
  if (!buffer) return null;

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0,
    ]),
    gl.STATIC_DRAW,
  );

  // Unbind to prevent accidental mutations
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  sharedQuadBuffers.set(gl, buffer);
  return buffer;
}

/**
 * Legacy support / Direct creation
 * @deprecated Use getSharedQuadBuffer instead
 */
export function createQuadBuffer(
  gl: WebGL2RenderingContext,
): WebGLBuffer | null {
  return getSharedQuadBuffer(gl);
}

/**
 * Sets up vertex attribute pointer for a position attribute.
 * This configures how WebGL should read vertex data from the buffer.
 *
 * @param gl - The WebGL rendering context
 * @param program - The WebGL program containing the attribute
 * @param attributeName - The name of the attribute in the shader (e.g., 'position')
 *
 * @example
 * setupPositionAttribute(gl, program, 'position');
 */
export function setupPositionAttribute(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  attributeName: string,
  buffer: WebGLBuffer | null,
): void {
  if (!buffer) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  const positionLocation = gl.getAttribLocation(program, attributeName);
  if (positionLocation !== -1) {
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  }
}

interface TextureOptions {
  width: number;
  height: number;
  data: Uint8Array | Float32Array | null;
  minFilter?: number;
  magFilter?: number;
  wrap?: number;
  internalFormat?: number;
  format?: number;
  type?: number;
}

/**
 * Creates a WebGL texture from raw data
 */
export function createTextureFromData(
  gl: WebGL2RenderingContext,
  options: TextureOptions,
): WebGLTexture | null {
  const {
    width,
    height,
    data,
    minFilter = gl.LINEAR,
    magFilter = gl.LINEAR,
    wrap = gl.REPEAT,
    internalFormat = gl.RGBA,
    format = gl.RGBA,
    type = gl.UNSIGNED_BYTE,
  } = options;
  
  const texture = gl.createTexture();
  if (!texture) return null;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  
  // Handle different data types
  if (data instanceof Float32Array) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        internalFormat, // e.g. gl.R32F or gl.RGBA32F
        width,
        height,
        0,
        format, // e.g. gl.RED or gl.RGBA
        gl.FLOAT,
        data
      );
  } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        internalFormat,
        width,
        height,
        0,
        format,
        type,
        data as Uint8Array // Cast needed or logic adjustment
      );
  }

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);

  return texture;
}

/**
 * Generates a high-quality RGBA noise texture for shader lookups
 * Replaces expensive runtime hash calls.
 */
export function createNoiseTexture(
  gl: WebGL2RenderingContext,
  size: number = 256,
): WebGLTexture | null {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.floor(Math.random() * 255);
  }
  return createTextureFromData(gl, {
    width: size,
    height: size,
    data,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR,
    wrap: gl.REPEAT,
  });
}

/**
 * Generates a Blue Noise texture approximation (Uniform distribution with high frequency)
 * Used for dithering to break banding.
 */
export function createBlueNoiseTexture(
  gl: WebGL2RenderingContext,
  size: number = 256,
): WebGLTexture | null {
  // Approximate blue noise by generating white noise per channel
  // In a real production app, we would load a pre-computed asset.
  // For this procedural implementation, we'll use high-quality white noise
  // but use NEAREST filtering to preserve the precise pixel values for dithering.
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.floor(Math.random() * 255);
  }

  return createTextureFromData(gl, {
    width: size,
    height: size,
    data,
    minFilter: gl.NEAREST,
    magFilter: gl.NEAREST, // Important for dithering lookup
    wrap: gl.REPEAT,
  });
}
