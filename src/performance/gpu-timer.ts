/**
 * GPU Timing via EXT_disjoint_timer_query (WebGL 1) or
 * EXT_disjoint_timer_query_webgl2 (WebGL 2).
 *
 * This extension provides actual GPU elapsed time for draw calls,
 * distinct from CPU-side frame time. It reveals the true GPU bottleneck.
 *
 * IMPORTANT: This extension is:
 *   - Available on most desktop GPUs (Chrome, Firefox)
 *   - Disabled by default in some browsers due to Spectre-class timing attacks
 *   - Not available on most mobile GPUs
 *   - Results arrive asynchronously (1-3 frames latency)
 *
 * Phase 7: GPU timing for accurate performance analysis.
 *
 * Reference: https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query/
 */

// Extension interface for WebGL 2 (EXT_disjoint_timer_query_webgl2)
interface EXTDisjointTimerQueryWebGL2 {
  TIME_ELAPSED_EXT: number;
  TIMESTAMP_EXT: number;
  GPU_DISJOINT_EXT: number;
  QUERY_COUNTER_BITS_EXT: number;
}

export class GPUTimer {
  private ext: EXTDisjointTimerQueryWebGL2 | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private pendingQueries: WebGLQuery[] = [];
  private lastGpuTimeMs: number = 0;
  private _available: boolean = false;
  public lastResolutionChange: number = 0;

  /**
   * Attempt to acquire the timer query extension.
   * Returns true if GPU timing is available.
   */
  initialize(gl: WebGL2RenderingContext): boolean {
    this.gl = gl;

    // WebGL 2 extension
    this.ext = gl.getExtension(
      "EXT_disjoint_timer_query_webgl2",
    ) as EXTDisjointTimerQueryWebGL2;

    this._available = this.ext !== null;

    if (this._available) {
      // Available
    } else {
      // Not available
    }


    return this._available;
  }

  /** Whether GPU timing is available on this context */
  get available(): boolean {
    return this._available;
  }

  /**
   * Begin timing a GPU operation.
   * Call this before the draw calls you want to measure.
   */
  beginFrame(): void {
    if (!this.ext || !this.gl) return;

    // Check for disjoint -- GPU was reset, discard all pending queries
    // GPU_DISJOINT is from EXT extension in WebGL 2
    const disjoint = this.gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    if (disjoint) {
      this.drainPending();
      return;
    }

    // createQuery is core in WebGL 2
    const query = this.gl.createQuery();
    if (query) {
      // TIME_ELAPSED_EXT comes from extension
      this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
      this.pendingQueries.push(query);
    }
  }

  /**
   * End timing the current GPU operation.
   * Results arrive asynchronously; poll via getLastGpuTimeMs().
   */
  endFrame(): void {
    if (!this.ext || !this.gl || this.pendingQueries.length === 0) return;
    // endQuery is core in WebGL 2
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.collectResults();
  }

  /**
   * Returns the most recent GPU elapsed time in milliseconds.
   * Returns 0 if no results are available yet or extension not supported.
   */
  getLastGpuTimeMs(): number {
    return this.lastGpuTimeMs;
  }

  /**
   * Check pending queries and collect any that have completed.
   * Queries complete 1-3 frames after submission (GPU pipeline latency).
   */
  private collectResults(): void {
    if (!this.ext || !this.gl) return;

    // Process completed queries from the front of the queue
    while (this.pendingQueries.length > 0) {
      const query = this.pendingQueries[0];

      // getQueryParameter is core in WebGL 2
      const available = this.gl.getQueryParameter(
        query,
        this.gl.QUERY_RESULT_AVAILABLE,
      );

      if (!available) break; // Remaining queries are also not ready

      // Result is in nanoseconds (core QUERY_RESULT)
      const timeNanos = this.gl.getQueryParameter(
        query,
        this.gl.QUERY_RESULT,
      ) as number;

      this.lastGpuTimeMs = timeNanos / 1_000_000;
      this.gl.deleteQuery(query);
      this.pendingQueries.shift();
    }

    // Safety: prevent unbounded growth if results never arrive
    if (this.pendingQueries.length > 10) {
      this.drainPending();
    }
  }

  /**
   * Delete all pending queries (used on disjoint or cleanup).
   */
  private drainPending(): void {
    if (!this.ext || !this.gl) return;
    for (const q of this.pendingQueries) {
      this.gl.deleteQuery(q);
    }
    this.pendingQueries.length = 0;
  }

  /**
   * Clean up all GPU resources.
   */
  cleanup(): void {
    this.drainPending();
    this.ext = null;
    this.gl = null;
    this._available = false;
    this.lastGpuTimeMs = 0;
  }
}
