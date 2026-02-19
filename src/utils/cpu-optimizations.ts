/**
 * CPU-side optimization utilities
 *
 * Provides caching, debouncing, and idle detection for performance optimization
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

/**
 * Physics value cache for unchanged inputs
 *
 * Requirements: 14.2
 * Property 15: Physics value caching
 */
export class PhysicsCache<TInput, TOutput> {
  private cache = new Map<string, TOutput>();

  /**
   * Get a cached value or compute it if not cached
   *
   * @param input - Input parameters
   * @param computeFn - Function to compute the value if not cached
   * @param keyFn - Function to generate cache key from input (optional)
   * @returns Cached or computed value
   */
  get(
    input: TInput,
    computeFn: (input: TInput) => TOutput,
    keyFn?: (input: TInput) => string,
  ): TOutput {
    const key = keyFn ? keyFn(input) : JSON.stringify(input);

    if (this.cache.has(key)) {
      return this.cache.get(key) as TOutput;
    }

    const value = computeFn(input);
    this.cache.set(key, value);
    return value;
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * Debounce function for parameter changes
 *
 * Requirements: 14.3
 * Property 16: Parameter debouncing
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Idle detector for frame rate reduction
 *
 * Requirements: 14.5
 * Property 17: Idle frame rate reduction
 */
export class IdleDetector {
  private lastActivityTime: number = Date.now();
  private idleThresholdMs: number;

  constructor(idleThresholdMs: number = 5000) {
    this.idleThresholdMs = idleThresholdMs;
  }

  /**
   * Record user activity
   */
  recordActivity(): void {
    this.lastActivityTime = Date.now();
  }

  /**
   * Check if the system is idle
   *
   * @returns true if idle (no activity for > threshold)
   */
  isIdle(): boolean {
    return Date.now() - this.lastActivityTime > this.idleThresholdMs;
  }

  /**
   * Get time since last activity in milliseconds
   */
  getTimeSinceActivity(): number {
    return Date.now() - this.lastActivityTime;
  }

  /**
   * Reset the idle timer
   */
  reset(): void {
    this.lastActivityTime = Date.now();
  }

  /**
   * Set the idle threshold
   */
  setThreshold(thresholdMs: number): void {
    this.idleThresholdMs = thresholdMs;
  }
}

/**
 * Batch uniform updates for WebGL
 *
 * Requirements: 14.1
 */
/**
 * Optimized Uniform Manager for WebGL
 *
 * Improvements over previous version:
 * 1. Caches uniform locations at startup (removes gl.getUniformLocation from render loop).
 * 2. Implements dirty checking (only updates WebGL if value changed).
 * 3. Uses direct WebGL calls instead of intermediate Map storage.
 *
 * Requirements: 14.1
 */
export class UniformBatcher {
  private locations = new Map<string, WebGLUniformLocation>();
  private attribLocations = new Map<string, number>();
  private valueCache = new Map<string, unknown>(); // For dirty checking
  private gl: WebGL2RenderingContext | null = null;
  public program: WebGLProgram | null = null;

  /**
   * upload active uniforms and attributes from the program to the cache
   * Must be called whenever the program changes
   */
  upload(gl: WebGL2RenderingContext, program: WebGLProgram): void {
    this.gl = gl;
    this.program = program;
    this.locations.clear();
    this.attribLocations.clear();
    this.valueCache.clear();

    // 1. Cache Uniforms
    const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < numUniforms; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info) {
        const loc = gl.getUniformLocation(program, info.name);
        if (loc) {
          this.locations.set(info.name, loc);
        }
      }
    }

    // 2. Cache Attributes
    const numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < numAttribs; i++) {
      const info = gl.getActiveAttrib(program, i);
      if (info) {
        const loc = gl.getAttribLocation(program, info.name);
        if (loc !== -1) {
          this.attribLocations.set(info.name, loc);
        }
      }
    }
  }

  /**
   * Set a uniform value.
   * Will only issue a WebGL call if the value is different from the last cached value.
   */
  /**
   * Set a uniform value.
   * Optimized to handle primitives and TypedArrays without allocation.
   */
  set(name: string, value: number | number[] | Float32Array): void {
    if (!this.gl || !this.program) return;

    const loc = this.locations.get(name);
    if (!loc) return;

    // Fast path: Number
    if (typeof value === "number") {
      const prev = this.valueCache.get(name);
      if (prev === value) return;
      this.valueCache.set(name, value);

      if (
        name === "u_quality" ||
        name === "u_maxRaySteps" ||
        name === "u_cameraMoving" ||
        // All sampler uniforms MUST use uniform1i, not uniform1f.
        // Using a pattern match instead of a hardcoded whitelist so new
        // sampler uniforms (e.g. u_diskLUT, u_spectrumLUT) don't get missed.
        name.includes("Tex") ||
        name.includes("LUT")
      ) {
        this.gl.uniform1i(loc, value);
      } else {
        this.gl.uniform1f(loc, value);
      }
      return;
    }

    // Fast path: Float32Array (Zero-Copy)
    if (value instanceof Float32Array) {
      // Deep comparison for arrays is expensive, so we might skip it or use a dirty flag from caller.
      // For now, we assume if a Float32Array is passed, it might be mutated, so we assume dirty
      // OR we implement a fast check if we keep a copy.
      // To be truly O(1), we just check identity if different buffer, or force update.
      // Let's force update for Float32Array to ensure correctness, assuming caller optimizes frequency.
      // OR better: check content if small.

      if (value.length === 2) this.gl.uniform2fv(loc, value);
      else if (value.length === 3) this.gl.uniform3fv(loc, value);
      else if (value.length === 4) this.gl.uniform4fv(loc, value);
      return;
    }

    // Slow path: Array (inputs like [w, h]) - Deprecated for hot path but supported
    if (Array.isArray(value)) {
      if (value.length === 2) this.gl.uniform2f(loc, value[0], value[1]);
      else if (value.length === 3)
        this.gl.uniform3f(loc, value[0], value[1], value[2]);
      else if (value.length === 4)
        this.gl.uniform4f(loc, value[0], value[1], value[2], value[3]);
    }
  }

  // Explicit type setters for zero-allocation usage
  set1f(name: string, v: number): void {
    this.set(name, v);
  }

  set2f(name: string, x: number, y: number): void {
    if (!this.gl || !this.program) return;
    const loc = this.locations.get(name);
    if (!loc) return;

    const cacheKey = `${name}_2f`;
    const cached = this.valueCache.get(cacheKey) as
      | [number, number]
      | undefined;
    if (cached && cached[0] === x && cached[1] === y) return;

    this.valueCache.set(cacheKey, [x, y]);
    this.gl.uniform2f(loc, x, y);
  }

  set3f(name: string, x: number, y: number, z: number): void {
    if (!this.gl || !this.program) return;
    const loc = this.locations.get(name);
    if (!loc) return;

    const cacheKey = `${name}_3f`;
    const cached = this.valueCache.get(cacheKey) as
      | [number, number, number]
      | undefined;
    if (cached && cached[0] === x && cached[1] === y && cached[2] === z) return;

    this.valueCache.set(cacheKey, [x, y, z]);
    this.gl.uniform3f(loc, x, y, z);
  }

  // eslint-disable-next-line max-params
  set4f(name: string, x: number, y: number, z: number, w: number): void {
    if (!this.gl || !this.program) return;
    const loc = this.locations.get(name);
    if (!loc) return;

    const cacheKey = `${name}_4f`;
    const cached = this.valueCache.get(cacheKey) as
      | [number, number, number, number]
      | undefined;
    if (
      cached &&
      cached[0] === x &&
      cached[1] === y &&
      cached[2] === z &&
      cached[3] === w
    )
      return;

    this.valueCache.set(cacheKey, [x, y, z, w]);
    this.gl.uniform4f(loc, x, y, z, w);
  }

  /**
   * Setup a vertex attribute pointer using the cached location.
   */
  // eslint-disable-next-line max-params
  setupAttribute(
    name: string,
    buffer: WebGLBuffer | null,
    size: number = 2,
    type: number = 5126, // gl.FLOAT
    normalized: boolean = false,
    stride: number = 0,
    offset: number = 0,
  ): void {
    if (!this.gl || !buffer) return;

    const loc = this.attribLocations.get(name);
    if (loc === undefined || loc === -1) return;

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.enableVertexAttribArray(loc);
    this.gl.vertexAttribPointer(loc, size, type, normalized, stride, offset);
  }

  /**
   * Clear context references
   */
  clear(): void {
    this.locations.clear();
    this.attribLocations.clear();
    this.valueCache.clear();
    this.gl = null;
    this.program = null;
  }

  /**
   * Get number of tracked uniforms
   */
  size(): number {
    return this.locations.size;
  }
}
