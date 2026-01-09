/**
 * Progressive Feature Loader
 * 
 * Manages progressive compilation of shader features with loading indicators
 * and graceful failure handling.
 * 
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 */

import type { FeatureToggles } from '@/types/features';
import { ShaderManager } from '@/shaders/manager';

/**
 * Compilation status for a feature
 */
export type CompilationStatus = 'pending' | 'compiling' | 'success' | 'failed';

/**
 * Feature compilation state
 */
export interface FeatureCompilationState {
    status: CompilationStatus;
    progress: number; // 0-1
    error?: string;
    compilationTimeMs?: number;
}

/**
 * Progressive loading state
 */
export interface ProgressiveLoadingState {
    features: Map<keyof FeatureToggles, FeatureCompilationState>;
    overallProgress: number; // 0-1
    isComplete: boolean;
    hasBasicRendering: boolean;
}

/**
 * Progressive Feature Loader
 * 
 * Manages progressive compilation of shader features with the following capabilities:
 * - Track compilation progress for each feature
 * - Provide loading indicators
 * - Handle compilation failures gracefully
 * - Ensure basic rendering starts within 1 second
 * 
 * Requirements:
 * - 18.1: Render basic black hole within 1 second
 * - 18.2: Progressively enable features as shaders compile
 * - 18.3: Display loading indicator for features being compiled
 * - 18.4: Remove loading indicators when all features loaded
 * - 18.5: Gracefully disable features on compilation failure
 */
export class ProgressiveFeatureLoader {
    private shaderManager: ShaderManager;
    private compilationState: Map<keyof FeatureToggles, FeatureCompilationState>;
    private compiledFeatures: Set<keyof FeatureToggles>;
    private failedFeatures: Set<keyof FeatureToggles>;
    private basicRenderingReady: boolean = false;
    private startTime: number = 0;

    constructor(shaderManager: ShaderManager) {
        this.shaderManager = shaderManager;
        this.compilationState = new Map();
        this.compiledFeatures = new Set();
        this.failedFeatures = new Set();
    }

    /**
     * Initialize progressive loading
     * Requirement 18.1: Ensure basic rendering starts within 1 second
     */
    async initialize(
        requestedFeatures: FeatureToggles,
        vertexSource: string,
        fragmentSource: string
    ): Promise<ProgressiveLoadingState> {
        this.startTime = performance.now();
        this.compilationState.clear();
        this.compiledFeatures.clear();
        this.failedFeatures.clear();
        this.basicRenderingReady = false;

        // Initialize compilation state for all features
        const featureNames: (keyof FeatureToggles)[] = [
            'gravitationalLensing',
            'accretionDisk',
            'dopplerBeaming',
            'backgroundStars',
            'photonSphereGlow',
            'bloom',
        ];

        for (const featureName of featureNames) {
            if (requestedFeatures[featureName] === true) {
                this.compilationState.set(featureName, {
                    status: 'pending',
                    progress: 0,
                });
            }
        }

        // Compile basic rendering first (Requirement 18.1)
        await this.compileBasicRendering(vertexSource, fragmentSource);

        // Then compile additional features progressively (Requirement 18.2)
        await this.compileFeatures(requestedFeatures, vertexSource, fragmentSource);

        return this.getState();
    }

    /**
     * Compile basic rendering (minimal features for initial display)
     * Requirement 18.1: Basic rendering within 1 second
     */
    private async compileBasicRendering(
        vertexSource: string,
        fragmentSource: string
    ): Promise<void> {
        const basicFeatures: FeatureToggles = {
            gravitationalLensing: false,
            rayTracingQuality: 'low',
            accretionDisk: false,
            dopplerBeaming: false,
            backgroundStars: false,
            photonSphereGlow: false,
            bloom: false,
        };

        try {
            const variant = this.shaderManager.compileShaderVariant(
                vertexSource,
                fragmentSource,
                basicFeatures
            );

            if (variant) {
                this.basicRenderingReady = true;
                const elapsedTime = performance.now() - this.startTime;

                if (elapsedTime > 1000) {
                    console.warn(`Basic rendering took ${elapsedTime.toFixed(0)}ms, exceeding 1 second target`);
                }
            } else {
                console.error('Failed to compile basic rendering shader');
            }
        } catch (error) {
            console.error('Error compiling basic rendering:', error);
        }
    }

    /**
     * Compile features progressively
     * Requirements: 18.2, 18.3, 18.5
     */
    private async compileFeatures(
        requestedFeatures: FeatureToggles,
        vertexSource: string,
        fragmentSource: string
    ): Promise<void> {
        const featureNames: (keyof FeatureToggles)[] = [
            'gravitationalLensing',
            'accretionDisk',
            'dopplerBeaming',
            'backgroundStars',
            'photonSphereGlow',
            'bloom',
        ];

        // Compile each feature individually
        for (const featureName of featureNames) {
            if (requestedFeatures[featureName] !== true) {
                continue;
            }

            // Update status to compiling (Requirement 18.3)
            this.updateFeatureState(featureName, {
                status: 'compiling',
                progress: 0.5,
            });

            try {
                // Create feature configuration with only this feature enabled
                const featureConfig: FeatureToggles = {
                    ...requestedFeatures,
                    [featureName]: true,
                };

                const startTime = performance.now();
                const variant = this.shaderManager.compileShaderVariant(
                    vertexSource,
                    fragmentSource,
                    featureConfig
                );
                const compilationTime = performance.now() - startTime;

                if (variant) {
                    // Requirement 18.2: Feature enabled after successful compilation
                    this.compiledFeatures.add(featureName);
                    this.updateFeatureState(featureName, {
                        status: 'success',
                        progress: 1.0,
                        compilationTimeMs: compilationTime,
                    });
                } else {
                    // Requirement 18.5: Gracefully disable on compilation failure
                    this.failedFeatures.add(featureName);
                    this.updateFeatureState(featureName, {
                        status: 'failed',
                        progress: 1.0,
                        error: 'Shader compilation failed',
                    });
                    console.warn(`Feature ${featureName} disabled due to compilation failure`);
                }
            } catch (error) {
                // Requirement 18.5: Handle errors gracefully
                this.failedFeatures.add(featureName);
                this.updateFeatureState(featureName, {
                    status: 'failed',
                    progress: 1.0,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
                console.error(`Error compiling feature ${featureName}:`, error);
            }
        }
    }

    /**
     * Update feature compilation state
     */
    private updateFeatureState(
        featureName: keyof FeatureToggles,
        update: Partial<FeatureCompilationState>
    ): void {
        const current = this.compilationState.get(featureName) || {
            status: 'pending' as CompilationStatus,
            progress: 0,
        };

        this.compilationState.set(featureName, {
            ...current,
            ...update,
        });
    }

    /**
     * Get current loading state
     * Requirement 18.3: Provide loading indicators
     */
    getState(): ProgressiveLoadingState {
        const features = new Map(this.compilationState);
        const totalFeatures = features.size;
        const completedFeatures = Array.from(features.values()).filter(
            state => state.status === 'success' || state.status === 'failed'
        ).length;

        const overallProgress = totalFeatures > 0 ? completedFeatures / totalFeatures : 1.0;
        const isComplete = completedFeatures === totalFeatures;

        return {
            features,
            overallProgress,
            isComplete,
            hasBasicRendering: this.basicRenderingReady,
        };
    }

    /**
     * Get features that are enabled based on successful compilation
     * Requirement 18.2: Enable features only after successful compilation
     */
    getEnabledFeatures(requestedFeatures: FeatureToggles): FeatureToggles {
        return {
            gravitationalLensing: requestedFeatures.gravitationalLensing &&
                this.compiledFeatures.has('gravitationalLensing') &&
                !this.failedFeatures.has('gravitationalLensing'),
            rayTracingQuality: requestedFeatures.rayTracingQuality,
            accretionDisk: requestedFeatures.accretionDisk &&
                this.compiledFeatures.has('accretionDisk') &&
                !this.failedFeatures.has('accretionDisk'),
            dopplerBeaming: requestedFeatures.dopplerBeaming &&
                this.compiledFeatures.has('dopplerBeaming') &&
                !this.failedFeatures.has('dopplerBeaming'),
            backgroundStars: requestedFeatures.backgroundStars &&
                this.compiledFeatures.has('backgroundStars') &&
                !this.failedFeatures.has('backgroundStars'),
            photonSphereGlow: requestedFeatures.photonSphereGlow &&
                this.compiledFeatures.has('photonSphereGlow') &&
                !this.failedFeatures.has('photonSphereGlow'),
            bloom: requestedFeatures.bloom &&
                this.compiledFeatures.has('bloom') &&
                !this.failedFeatures.has('bloom'),
        };
    }

    /**
     * Check if a specific feature is compiled
     */
    isFeatureCompiled(featureName: keyof FeatureToggles): boolean {
        return this.compiledFeatures.has(featureName);
    }

    /**
     * Check if a specific feature failed to compile
     */
    isFeatureFailed(featureName: keyof FeatureToggles): boolean {
        return this.failedFeatures.has(featureName);
    }

    /**
     * Check if basic rendering is ready
     * Requirement 18.1
     */
    isBasicRenderingReady(): boolean {
        return this.basicRenderingReady;
    }

    /**
     * Get compilation time for basic rendering
     */
    getBasicRenderingTime(): number {
        return this.basicRenderingReady ? performance.now() - this.startTime : 0;
    }

    /**
     * Reset loader state
     */
    reset(): void {
        this.compilationState.clear();
        this.compiledFeatures.clear();
        this.failedFeatures.clear();
        this.basicRenderingReady = false;
        this.startTime = 0;
    }
}
