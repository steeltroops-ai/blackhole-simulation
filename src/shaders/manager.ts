/**
 * Shader Manager with Conditional Compilation
 * 
 * This module provides shader variant management with preprocessor directives
 * for conditional feature compilation. It caches compiled shader variants to
 * avoid recompilation when toggling features.
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import type { FeatureToggles } from '@/types/features';
import { createShader, createProgram } from '@/utils/webgl-utils';

/**
 * Represents a compiled shader variant with specific feature configuration
 */
export interface ShaderVariant {
    /** Feature configuration for this variant */
    features: FeatureToggles;
    /** Compiled vertex shader */
    vertexShader: WebGLShader;
    /** Compiled fragment shader */
    fragmentShader: WebGLShader;
    /** Linked shader program */
    program: WebGLProgram;
    /** Time taken to compile this variant in milliseconds */
    compilationTimeMs: number;
}

/**
 * Shader Manager class for managing shader variants with conditional compilation
 * 
 * Requirements:
 * - 13.1: Use shader preprocessor directives to exclude disabled features
 * - 13.2: Compile simplified shader without geodesic calculations when lensing disabled
 * - 13.3: Compile shader without volumetric rendering when disk disabled
 * - 13.4: Complete shader recompilation within 100ms
 * - 13.5: Cache compiled shader variants to avoid recompilation
 */
export class ShaderManager {
    private variantCache: Map<string, ShaderVariant> = new Map();
    private gl: WebGLRenderingContext;

    constructor(gl: WebGLRenderingContext) {
        this.gl = gl;
    }

    /**
     * Generate a unique cache key for a feature combination
     * Requirements: 13.5
     * 
     * @param features - Feature toggles configuration
     * @returns Unique string key for caching
     */
    private generateCacheKey(features: FeatureToggles): string {
        // Create a deterministic key from feature values
        return JSON.stringify({
            lensing: features.gravitationalLensing,
            quality: features.rayTracingQuality,
            disk: features.accretionDisk,
            doppler: features.dopplerBeaming,
            stars: features.backgroundStars,
            photon: features.photonSphereGlow,
            bloom: features.bloom,
        });
    }

    /**
     * Get a cached shader variant if it exists
     * Requirements: 13.5
     * 
     * @param features - Feature toggles configuration
     * @returns Cached shader variant or null if not found
     */
    getCachedVariant(features: FeatureToggles): ShaderVariant | null {
        const key = this.generateCacheKey(features);
        return this.variantCache.get(key) || null;
    }

    /**
     * Generate shader source code with preprocessor directives
     * Requirements: 13.1, 13.2, 13.3
     * 
     * @param baseSource - Base shader source code
     * @param features - Feature toggles configuration
     * @returns Modified shader source with preprocessor directives
     */
    generateShaderSource(baseSource: string, features: FeatureToggles): string {
        // Generate preprocessor defines based on enabled features
        const defines: string[] = [];

        // Gravitational lensing (Requirement 13.2)
        if (features.gravitationalLensing) {
            defines.push('#define ENABLE_LENSING 1');
        } else {
            defines.push('#define ENABLE_LENSING 0');
        }

        // Accretion disk (Requirement 13.3)
        if (features.accretionDisk) {
            defines.push('#define ENABLE_DISK 1');
        } else {
            defines.push('#define ENABLE_DISK 0');
        }

        // Doppler beaming
        if (features.dopplerBeaming) {
            defines.push('#define ENABLE_DOPPLER 1');
        } else {
            defines.push('#define ENABLE_DOPPLER 0');
        }

        // Background stars
        if (features.backgroundStars) {
            defines.push('#define ENABLE_STARS 1');
        } else {
            defines.push('#define ENABLE_STARS 0');
        }

        // Photon sphere glow
        if (features.photonSphereGlow) {
            defines.push('#define ENABLE_PHOTON_GLOW 1');
        } else {
            defines.push('#define ENABLE_PHOTON_GLOW 0');
        }

        // Bloom post-processing
        if (features.bloom) {
            defines.push('#define ENABLE_BLOOM 1');
        } else {
            defines.push('#define ENABLE_BLOOM 0');
        }

        // Ray tracing quality
        defines.push(`#define RAY_QUALITY_${features.rayTracingQuality.toUpperCase()} 1`);

        // Insert defines after the precision statement
        const lines = baseSource.split('\n');
        const precisionIndex = lines.findIndex(line => line.trim().startsWith('precision'));

        if (precisionIndex !== -1) {
            // Insert defines after precision statement
            lines.splice(precisionIndex + 1, 0, '', ...defines, '');
        } else {
            // If no precision statement, insert at the beginning
            lines.unshift(...defines, '');
        }

        return lines.join('\n');
    }

    /**
     * Compile a shader variant with specific feature configuration
     * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
     * 
     * @param vertexSource - Vertex shader source code
     * @param fragmentSource - Fragment shader source code
     * @param features - Feature toggles configuration
     * @returns Compiled shader variant or null if compilation failed
     * @throws Error if compilation takes longer than 100ms (Requirement 13.4)
     */
    compileShaderVariant(
        vertexSource: string,
        fragmentSource: string,
        features: FeatureToggles
    ): ShaderVariant | null {
        const startTime = performance.now();

        // Check cache first (Requirement 13.5)
        const cached = this.getCachedVariant(features);
        if (cached) {
            return cached;
        }

        // Generate shader source with preprocessor directives (Requirement 13.1)
        const modifiedFragmentSource = this.generateShaderSource(fragmentSource, features);
        const modifiedVertexSource = this.generateShaderSource(vertexSource, features);

        // Compile shaders
        const vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, modifiedVertexSource);
        if (!vertexShader) {
            console.error('Failed to compile vertex shader');
            return null;
        }

        const fragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, modifiedFragmentSource);
        if (!fragmentShader) {
            console.error('Failed to compile fragment shader');
            this.gl.deleteShader(vertexShader);
            return null;
        }

        // Link program
        const program = createProgram(this.gl, vertexShader, fragmentShader);
        if (!program) {
            console.error('Failed to link shader program');
            this.gl.deleteShader(vertexShader);
            this.gl.deleteShader(fragmentShader);
            return null;
        }

        const endTime = performance.now();
        const compilationTimeMs = endTime - startTime;

        // Check compilation time (Requirement 13.4)
        if (compilationTimeMs > 100) {
            console.warn(`Shader compilation took ${compilationTimeMs.toFixed(2)}ms, exceeding 100ms target`);
        }

        // Create variant object
        const variant: ShaderVariant = {
            features: { ...features },
            vertexShader,
            fragmentShader,
            program,
            compilationTimeMs,
        };

        // Cache the variant (Requirement 13.5)
        const key = this.generateCacheKey(features);
        this.variantCache.set(key, variant);

        return variant;
    }

    /**
     * Clear all cached shader variants
     * Useful for cleanup or when resetting the application
     */
    clearCache(): void {
        // Delete all WebGL resources
        for (const variant of this.variantCache.values()) {
            this.gl.deleteProgram(variant.program);
            this.gl.deleteShader(variant.vertexShader);
            this.gl.deleteShader(variant.fragmentShader);
        }

        this.variantCache.clear();
    }

    /**
     * Get the number of cached variants
     */
    getCacheSize(): number {
        return this.variantCache.size;
    }

    /**
     * Get all cached variants (for debugging/testing)
     */
    getAllCachedVariants(): ShaderVariant[] {
        return Array.from(this.variantCache.values());
    }
}
