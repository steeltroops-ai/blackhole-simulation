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
        keyFn?: (input: TInput) => string
    ): TOutput {
        const key = keyFn ? keyFn(input) : JSON.stringify(input);

        if (this.cache.has(key)) {
            return this.cache.get(key)!;
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
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
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
export class UniformBatcher {
    private uniforms: Map<string, any> = new Map();

    /**
     * Queue a uniform update
     */
    set(name: string, value: any): void {
        this.uniforms.set(name, value);
    }

    /**
     * Apply all queued uniform updates to WebGL
     */
    flush(gl: WebGLRenderingContext, program: WebGLProgram): void {
        for (const [name, value] of this.uniforms.entries()) {
            const location = gl.getUniformLocation(program, name);
            if (location === null) continue;

            // Determine uniform type and call appropriate gl.uniform* function
            if (typeof value === 'number') {
                // Check if this is an integer uniform (quality, maxRaySteps)
                if (name === 'u_quality' || name === 'u_maxRaySteps') {
                    gl.uniform1i(location, value);
                } else {
                    gl.uniform1f(location, value);
                }
            } else if (Array.isArray(value)) {
                if (value.length === 2) {
                    gl.uniform2f(location, value[0], value[1]);
                } else if (value.length === 3) {
                    gl.uniform3f(location, value[0], value[1], value[2]);
                } else if (value.length === 4) {
                    gl.uniform4f(location, value[0], value[1], value[2], value[3]);
                }
            }
        }

        this.uniforms.clear();
    }

    /**
     * Clear all queued uniforms without applying
     */
    clear(): void {
        this.uniforms.clear();
    }

    /**
     * Get number of queued uniforms
     */
    size(): number {
        return this.uniforms.size;
    }
}
