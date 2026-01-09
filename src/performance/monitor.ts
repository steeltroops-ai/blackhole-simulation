/**
 * Performance monitoring system for the black hole simulation
 * 
 * Tracks FPS, frame times, and generates performance warnings
 * Requirements: 1.2, 10.1, 10.2, 10.3, 10.4, 10.5
 */

export interface PerformanceMetrics {
    currentFPS: number;
    frameTimeMs: number;
    rollingAverageFPS: number;
    quality: string;
    renderResolution: number; // Percentage of native resolution
    gpuMemoryUsageMB?: number;
}

/**
 * Extended debug metrics for detailed performance analysis
 * Requirements: 20.1, 20.2, 20.3, 20.4
 */
export interface DebugMetrics extends PerformanceMetrics {
    /** GPU time in milliseconds */
    gpuTimeMs?: number;
    /** CPU time in milliseconds */
    cpuTimeMs?: number;
    /** Idle time in milliseconds */
    idleTimeMs?: number;
    /** Shader compilation times by variant */
    shaderCompilationTimes?: Map<string, number>;
    /** Number of uniform updates per frame */
    uniformUpdateCount?: number;
    /** Buffer swap time in milliseconds */
    bufferSwapTimeMs?: number;
    /** Total frame time in milliseconds */
    totalFrameTimeMs: number;
    /** Number of draw calls */
    drawCalls?: number;
    /** Number of shader switches */
    shaderSwitches?: number;
}

export interface PerformanceWarning {
    severity: 'info' | 'warning' | 'critical';
    message: string;
    suggestions: string[];
}

export class PerformanceMonitor {
    private frameTimes: number[] = [];
    private readonly ROLLING_WINDOW = 60;
    private readonly WARNING_THRESHOLD_FPS = 60;
    private readonly CRITICAL_THRESHOLD_FPS = 30;
    private readonly TARGET_FRAME_TIME_MS = 13.3; // 75 FPS target

    private lastUpdateTime: number = performance.now();
    private currentQuality: string = 'high';
    private renderResolution: number = 1.0;

    // Debug metrics tracking
    private debugEnabled: boolean = false;
    private gpuTimeMs: number = 0;
    private cpuTimeMs: number = 0;
    private idleTimeMs: number = 0;
    private shaderCompilationTimes: Map<string, number> = new Map();
    private uniformUpdateCount: number = 0;
    private bufferSwapTimeMs: number = 0;
    private drawCalls: number = 0;
    private shaderSwitches: number = 0;

    /**
     * Update performance metrics with the latest frame time
     * 
     * @param deltaTime - Time taken to render the current frame in milliseconds
     * @returns Updated performance metrics
     */
    updateMetrics(deltaTime: number): PerformanceMetrics {
        // Store frame time in rolling window
        this.frameTimes.push(deltaTime);
        if (this.frameTimes.length > this.ROLLING_WINDOW) {
            this.frameTimes.shift();
        }

        // Calculate current FPS
        const currentFPS = deltaTime > 0 ? 1000 / deltaTime : 0;

        // Calculate rolling average FPS
        const rollingAverageFPS = this.calculateRollingAverageFPS();

        // Calculate frame time (average of recent frames)
        const frameTimeMs = this.frameTimes.length > 0
            ? this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length
            : deltaTime;

        this.lastUpdateTime = performance.now();

        return {
            currentFPS: Math.round(currentFPS),
            frameTimeMs: Math.round(frameTimeMs * 100) / 100,
            rollingAverageFPS: Math.round(rollingAverageFPS),
            quality: this.currentQuality,
            renderResolution: this.renderResolution,
        };
    }

    /**
     * Calculate rolling average FPS from stored frame times
     * 
     * Requirements: 10.3
     * Property 8: Rolling average FPS calculation
     * 
     * @returns Rolling average FPS over the last 60 frames
     */
    private calculateRollingAverageFPS(): number {
        if (this.frameTimes.length === 0) {
            return 0;
        }

        // Calculate average frame time
        const avgFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;

        // Convert to FPS: 1000ms / avgFrameTime
        return avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
    }

    /**
     * Get current performance warnings based on FPS thresholds
     * 
     * Requirements: 1.2, 10.4, 10.5
     * 
     * @returns Array of performance warnings
     */
    getWarnings(): PerformanceWarning[] {
        const warnings: PerformanceWarning[] = [];
        const rollingAvgFPS = this.calculateRollingAverageFPS();

        // Critical warning: FPS below 30
        if (rollingAvgFPS < this.CRITICAL_THRESHOLD_FPS && rollingAvgFPS > 0) {
            warnings.push({
                severity: 'critical',
                message: `Critical performance issue: ${Math.round(rollingAvgFPS)} FPS`,
                suggestions: [
                    'Disable gravitational lensing',
                    'Reduce ray tracing quality to Low',
                    'Disable bloom effects',
                    'Reduce render resolution',
                ],
            });
        }
        // Warning: FPS below 60
        else if (rollingAvgFPS < this.WARNING_THRESHOLD_FPS && rollingAvgFPS > 0) {
            warnings.push({
                severity: 'warning',
                message: `Performance warning: ${Math.round(rollingAvgFPS)} FPS`,
                suggestions: [
                    'Reduce ray tracing quality',
                    'Disable Doppler beaming',
                    'Consider disabling bloom',
                ],
            });
        }

        // Frame time budget warning
        const avgFrameTime = this.frameTimes.length > 0
            ? this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length
            : 0;

        if (avgFrameTime > this.TARGET_FRAME_TIME_MS) {
            const budgetUsage = (avgFrameTime / this.TARGET_FRAME_TIME_MS) * 100;
            warnings.push({
                severity: 'info',
                message: `Frame time budget exceeded: ${Math.round(budgetUsage)}%`,
                suggestions: [
                    'Target frame time: 13.3ms (75 FPS)',
                    `Current frame time: ${Math.round(avgFrameTime * 10) / 10}ms`,
                ],
            });
        }

        return warnings;
    }

    /**
     * Check if quality should be reduced based on performance
     * 
     * @returns true if quality should be reduced
     */
    shouldReduceQuality(): boolean {
        const rollingAvgFPS = this.calculateRollingAverageFPS();
        return rollingAvgFPS < this.WARNING_THRESHOLD_FPS && rollingAvgFPS > 0;
    }

    /**
     * Check if quality can be increased based on performance
     * 
     * @returns true if quality can be increased
     */
    shouldIncreaseQuality(): boolean {
        const rollingAvgFPS = this.calculateRollingAverageFPS();
        const avgFrameTime = this.frameTimes.length > 0
            ? this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length
            : 0;

        // Only increase quality if we have headroom (< 80% of frame budget)
        return rollingAvgFPS > 75 && avgFrameTime < (this.TARGET_FRAME_TIME_MS * 0.8);
    }

    /**
     * Set the current quality level
     * 
     * @param quality - Quality level string
     */
    setQuality(quality: string): void {
        this.currentQuality = quality;
    }

    /**
     * Set the current render resolution
     * 
     * @param resolution - Resolution as a percentage (0.5 to 1.0)
     */
    setRenderResolution(resolution: number): void {
        this.renderResolution = Math.max(0.5, Math.min(1.0, resolution));
    }

    /**
     * Reset the performance monitor state
     */
    reset(): void {
        this.frameTimes = [];
        this.lastUpdateTime = performance.now();
    }

    /**
     * Get the current frame time budget usage as a percentage
     * 
     * @returns Budget usage percentage (0-100+)
     */
    getFrameTimeBudgetUsage(): number {
        const avgFrameTime = this.frameTimes.length > 0
            ? this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length
            : 0;

        return (avgFrameTime / this.TARGET_FRAME_TIME_MS) * 100;
    }

    /**
     * Enable or disable debug metrics tracking
     * Requirements: 20.5
     * 
     * @param enabled - Whether to enable debug tracking
     */
    setDebugEnabled(enabled: boolean): void {
        this.debugEnabled = enabled;
        if (!enabled) {
            // Clear debug metrics when disabled
            this.gpuTimeMs = 0;
            this.cpuTimeMs = 0;
            this.idleTimeMs = 0;
            this.uniformUpdateCount = 0;
            this.bufferSwapTimeMs = 0;
            this.drawCalls = 0;
            this.shaderSwitches = 0;
        }
    }

    /**
     * Check if debug metrics are enabled
     */
    isDebugEnabled(): boolean {
        return this.debugEnabled;
    }

    /**
     * Record GPU time for current frame
     * Requirements: 20.2
     * 
     * @param timeMs - GPU time in milliseconds
     */
    recordGPUTime(timeMs: number): void {
        if (this.debugEnabled) {
            this.gpuTimeMs = timeMs;
        }
    }

    /**
     * Record CPU time for current frame
     * Requirements: 20.2
     * 
     * @param timeMs - CPU time in milliseconds
     */
    recordCPUTime(timeMs: number): void {
        if (this.debugEnabled) {
            this.cpuTimeMs = timeMs;
        }
    }

    /**
     * Record idle time for current frame
     * Requirements: 20.2
     * 
     * @param timeMs - Idle time in milliseconds
     */
    recordIdleTime(timeMs: number): void {
        if (this.debugEnabled) {
            this.idleTimeMs = timeMs;
        }
    }

    /**
     * Record shader compilation time
     * Requirements: 20.3
     * 
     * @param variant - Shader variant identifier
     * @param timeMs - Compilation time in milliseconds
     */
    recordShaderCompilation(variant: string, timeMs: number): void {
        if (this.debugEnabled) {
            this.shaderCompilationTimes.set(variant, timeMs);
        }
    }

    /**
     * Record uniform update count for current frame
     * Requirements: 20.4
     * 
     * @param count - Number of uniform updates
     */
    recordUniformUpdates(count: number): void {
        if (this.debugEnabled) {
            this.uniformUpdateCount = count;
        }
    }

    /**
     * Record buffer swap time
     * Requirements: 20.4
     * 
     * @param timeMs - Buffer swap time in milliseconds
     */
    recordBufferSwapTime(timeMs: number): void {
        if (this.debugEnabled) {
            this.bufferSwapTimeMs = timeMs;
        }
    }

    /**
     * Record draw call count for current frame
     * 
     * @param count - Number of draw calls
     */
    recordDrawCalls(count: number): void {
        if (this.debugEnabled) {
            this.drawCalls = count;
        }
    }

    /**
     * Record shader switch count for current frame
     * 
     * @param count - Number of shader switches
     */
    recordShaderSwitches(count: number): void {
        if (this.debugEnabled) {
            this.shaderSwitches = count;
        }
    }

    /**
     * Get debug metrics for detailed performance analysis
     * Requirements: 20.1, 20.2, 20.3, 20.4
     * 
     * @returns Debug metrics including frame time breakdown
     */
    getDebugMetrics(): DebugMetrics {
        const baseMetrics = this.updateMetrics(
            this.frameTimes.length > 0 ? this.frameTimes[this.frameTimes.length - 1] : 0
        );

        return {
            ...baseMetrics,
            totalFrameTimeMs: baseMetrics.frameTimeMs,
            gpuTimeMs: this.debugEnabled ? this.gpuTimeMs : undefined,
            cpuTimeMs: this.debugEnabled ? this.cpuTimeMs : undefined,
            idleTimeMs: this.debugEnabled ? this.idleTimeMs : undefined,
            shaderCompilationTimes: this.debugEnabled && this.shaderCompilationTimes.size > 0
                ? new Map(this.shaderCompilationTimes)
                : undefined,
            uniformUpdateCount: this.debugEnabled ? this.uniformUpdateCount : undefined,
            bufferSwapTimeMs: this.debugEnabled ? this.bufferSwapTimeMs : undefined,
            drawCalls: this.debugEnabled ? this.drawCalls : undefined,
            shaderSwitches: this.debugEnabled ? this.shaderSwitches : undefined,
        };
    }
}
