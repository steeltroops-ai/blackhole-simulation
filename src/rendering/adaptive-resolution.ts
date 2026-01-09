/**
 * Adaptive Resolution Controller
 * 
 * Automatically adjusts render resolution based on FPS to maintain target performance.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 * 
 * ## Integration Guide
 * 
 * To integrate adaptive resolution into the application:
 * 
 * 1. Use the `useAdaptiveResolution` hook in your component:
 * ```typescript
 * const { resolutionScale } = useAdaptiveResolution(metrics.fps, {
 *   enabled: params.adaptiveResolution ?? true,
 *   onResolutionChange: (scale) => {
 *     // Update canvas resolution
 *     if (canvasRef.current) {
 *       const dpr = Math.min(window.devicePixelRatio || 1, 2.0) * scale;
 *       canvasRef.current.width = window.innerWidth * dpr;
 *       canvasRef.current.height = window.innerHeight * dpr;
 *     }
 *   }
 * });
 * ```
 * 
 * 2. Pass the resolution scale to the WebGL canvas component
 * 
 * 3. Add a UI toggle for enabling/disabling adaptive resolution
 */

export interface ResolutionConfig {
    /** Whether adaptive resolution is enabled */
    enabled: boolean;
    /** Minimum resolution scale (0.5 = 50%) */
    minScale: number;
    /** Maximum resolution scale (1.0 = 100%) */
    maxScale: number;
    /** Target FPS to maintain */
    targetFPS: number;
    /** Resolution adjustment step size (0.1 = 10%) */
    adjustmentStep: number;
}

/**
 * Default configuration for adaptive resolution
 */
export const DEFAULT_RESOLUTION_CONFIG: ResolutionConfig = {
    enabled: true,
    minScale: 0.5,
    maxScale: 1.0,
    targetFPS: 60,
    adjustmentStep: 0.1,
};

/**
 * Adaptive Resolution Controller
 * 
 * Monitors FPS and automatically adjusts render resolution to maintain target performance.
 * 
 * - Decreases resolution by 10% when FPS < 60 for more than 2 seconds
 * - Increases resolution by 10% when FPS > 75 for more than 5 seconds
 * - Clamps resolution between 50% and 100%
 * - Applies smooth interpolation for resolution changes
 */
export class AdaptiveResolutionController {
    private currentScale: number = 1.0;
    private lowFPSTimer: number = 0;
    private highFPSTimer: number = 0;
    private config: ResolutionConfig;
    private targetScale: number = 1.0;
    private interpolationSpeed: number = 0.1; // Smooth interpolation factor

    constructor(config: Partial<ResolutionConfig> = {}) {
        this.config = { ...DEFAULT_RESOLUTION_CONFIG, ...config };
        this.currentScale = this.config.maxScale;
        this.targetScale = this.config.maxScale;
    }

    /**
     * Update the controller with current FPS and delta time
     * 
     * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
     * 
     * @param currentFPS - Current frames per second
     * @param deltaTime - Time since last frame in seconds
     * @returns Current resolution scale (0.5 to 1.0)
     */
    update(currentFPS: number, deltaTime: number): number {
        // If adaptive resolution is disabled, always return max scale
        // Requirement 11.4: When disabled, maintain 100% native resolution
        if (!this.config.enabled) {
            this.currentScale = this.config.maxScale;
            this.targetScale = this.config.maxScale;
            this.lowFPSTimer = 0;
            this.highFPSTimer = 0;
            return this.currentScale;
        }

        // Track low FPS duration
        // Requirement 11.1: Decrease resolution when FPS < 60 for more than 2 seconds
        if (currentFPS < 60) {
            this.lowFPSTimer += deltaTime;
            this.highFPSTimer = 0; // Reset high FPS timer

            // If FPS has been low for more than 2 seconds, reduce resolution
            if (this.lowFPSTimer > 2.0) {
                this.targetScale = Math.max(
                    this.config.minScale,
                    this.targetScale - this.config.adjustmentStep
                );
                this.lowFPSTimer = 0; // Reset timer after adjustment
            }
        }
        // Track high FPS duration
        // Requirement 11.2: Increase resolution when FPS > 75 for more than 5 seconds
        else if (currentFPS > 75) {
            this.highFPSTimer += deltaTime;
            this.lowFPSTimer = 0; // Reset low FPS timer

            // If FPS has been high for more than 5 seconds, increase resolution
            if (this.highFPSTimer > 5.0) {
                this.targetScale = Math.min(
                    this.config.maxScale,
                    this.targetScale + this.config.adjustmentStep
                );
                this.highFPSTimer = 0; // Reset timer after adjustment
            }
        }
        // FPS is between 60 and 75 - reset timers but don't adjust
        else {
            this.lowFPSTimer = 0;
            this.highFPSTimer = 0;
        }

        // Requirement 11.3: Clamp resolution between minScale and maxScale
        this.targetScale = Math.max(
            this.config.minScale,
            Math.min(this.config.maxScale, this.targetScale)
        );

        // Requirement 11.5: Apply smooth interpolation for resolution changes
        // Smoothly interpolate current scale towards target scale
        if (Math.abs(this.currentScale - this.targetScale) > 0.001) {
            this.currentScale += (this.targetScale - this.currentScale) * this.interpolationSpeed;
        } else {
            this.currentScale = this.targetScale;
        }

        // Final clamping to ensure we stay within bounds
        this.currentScale = Math.max(
            this.config.minScale,
            Math.min(this.config.maxScale, this.currentScale)
        );

        return this.currentScale;
    }

    /**
     * Enable or disable adaptive resolution
     * 
     * @param enabled - Whether adaptive resolution should be enabled
     */
    setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;

        // If disabling, reset to max scale immediately
        if (!enabled) {
            this.currentScale = this.config.maxScale;
            this.targetScale = this.config.maxScale;
            this.lowFPSTimer = 0;
            this.highFPSTimer = 0;
        }
    }

    /**
     * Reset the controller to initial state
     */
    reset(): void {
        this.currentScale = this.config.maxScale;
        this.targetScale = this.config.maxScale;
        this.lowFPSTimer = 0;
        this.highFPSTimer = 0;
    }

    /**
     * Get the current resolution scale
     * 
     * @returns Current resolution scale (0.5 to 1.0)
     */
    getCurrentScale(): number {
        return this.currentScale;
    }

    /**
     * Get the target resolution scale
     * 
     * @returns Target resolution scale (0.5 to 1.0)
     */
    getTargetScale(): number {
        return this.targetScale;
    }

    /**
     * Update configuration
     * 
     * @param config - Partial configuration to update
     */
    updateConfig(config: Partial<ResolutionConfig>): void {
        this.config = { ...this.config, ...config };

        // Ensure current scale is within new bounds
        this.currentScale = Math.max(
            this.config.minScale,
            Math.min(this.config.maxScale, this.currentScale)
        );
        this.targetScale = Math.max(
            this.config.minScale,
            Math.min(this.config.maxScale, this.targetScale)
        );
    }

    /**
     * Get current configuration
     * 
     * @returns Current resolution configuration
     */
    getConfig(): ResolutionConfig {
        return { ...this.config };
    }
}
