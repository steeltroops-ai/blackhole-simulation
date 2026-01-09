/**
 * Memory Optimization Utilities
 * 
 * Provides conditional resource allocation, cleanup, and memory monitoring
 * for WebGL resources based on enabled features.
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import type { FeatureToggles } from '@/types/features';

/**
 * GPU memory information (if available)
 */
export interface GPUMemoryInfo {
    /** Total GPU memory in MB */
    totalMemoryMB?: number;
    /** Used GPU memory in MB */
    usedMemoryMB?: number;
    /** Available GPU memory in MB */
    availableMemoryMB?: number;
    /** Whether memory info is available */
    available: boolean;
}

/**
 * WebGL resource that can be allocated and cleaned up
 */
export interface WebGLResource {
    /** Resource type identifier */
    type: 'texture' | 'buffer' | 'framebuffer' | 'renderbuffer';
    /** WebGL resource object */
    resource: WebGLTexture | WebGLBuffer | WebGLFramebuffer | WebGLRenderbuffer | null;
    /** Feature this resource is associated with */
    feature: keyof FeatureToggles | 'core';
    /** Estimated memory usage in bytes */
    estimatedSizeBytes: number;
}

/**
 * Memory optimization manager for WebGL resources
 * 
 * Handles conditional resource allocation based on enabled features,
 * resource cleanup when features are disabled, and memory monitoring.
 */
export class MemoryOptimizationManager {
    private resources: Map<string, WebGLResource> = new Map();
    private gl: WebGLRenderingContext | null = null;
    private memoryExtension: any = null;

    constructor(gl: WebGLRenderingContext | null = null) {
        this.gl = gl;
        if (gl) {
            this.initializeMemoryExtension(gl);
        }
    }

    /**
     * Initialize WebGL memory extension if available
     * 
     * @param gl - WebGL rendering context
     */
    private initializeMemoryExtension(gl: WebGLRenderingContext): void {
        // Try to get memory info extension (vendor-specific)
        this.memoryExtension =
            gl.getExtension('WEBGL_memory_info') ||
            gl.getExtension('MOZ_memory_info') ||
            gl.getExtension('WEBKIT_memory_info');
    }

    /**
     * Set the WebGL context
     * 
     * @param gl - WebGL rendering context
     */
    setContext(gl: WebGLRenderingContext): void {
        this.gl = gl;
        this.initializeMemoryExtension(gl);
    }

    /**
     * Allocate a texture resource conditionally based on feature state
     * 
     * Requirement 15.1: Allocate textures only for enabled features
     * 
     * @param id - Unique identifier for the resource
     * @param feature - Feature this resource belongs to
     * @param enabled - Whether the feature is enabled
     * @param width - Texture width
     * @param height - Texture height
     * @param format - Texture format
     * @returns The allocated texture or null if feature is disabled
     */
    allocateTexture(
        id: string,
        feature: keyof FeatureToggles | 'core',
        enabled: boolean,
        width: number,
        height: number,
        format?: number
    ): WebGLTexture | null {
        if (!this.gl) return null;

        // Requirement 15.1: Only allocate if feature is enabled
        if (!enabled && feature !== 'core') {
            return null;
        }

        // Clean up existing resource if it exists
        this.releaseResource(id);

        const texture = this.gl.createTexture();
        if (!texture) return null;

        const textureFormat = format !== undefined ? format : this.gl.RGBA;

        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            textureFormat,
            width,
            height,
            0,
            textureFormat,
            this.gl.UNSIGNED_BYTE,
            null
        );

        // Estimate memory usage (4 bytes per pixel for RGBA)
        const bytesPerPixel = textureFormat === this.gl.RGBA ? 4 :
            textureFormat === this.gl.RGB ? 3 : 1;
        const estimatedSize = width * height * bytesPerPixel;

        // Store resource info
        this.resources.set(id, {
            type: 'texture',
            resource: texture,
            feature,
            estimatedSizeBytes: estimatedSize
        });

        return texture;
    }

    /**
     * Allocate a buffer resource conditionally based on feature state
     * 
     * Requirement 15.1: Allocate buffers only for enabled features
     * 
     * @param id - Unique identifier for the resource
     * @param feature - Feature this resource belongs to
     * @param enabled - Whether the feature is enabled
     * @param data - Buffer data
     * @param usage - Buffer usage hint
     * @returns The allocated buffer or null if feature is disabled
     */
    allocateBuffer(
        id: string,
        feature: keyof FeatureToggles | 'core',
        enabled: boolean,
        data: ArrayBuffer | ArrayBufferView,
        usage?: number
    ): WebGLBuffer | null {
        if (!this.gl) return null;

        // Requirement 15.1: Only allocate if feature is enabled
        if (!enabled && feature !== 'core') {
            return null;
        }

        // Clean up existing resource if it exists
        this.releaseResource(id);

        const buffer = this.gl.createBuffer();
        if (!buffer) return null;

        const bufferUsage = usage !== undefined ? usage : this.gl.STATIC_DRAW;

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, bufferUsage);

        // Store resource info
        this.resources.set(id, {
            type: 'buffer',
            resource: buffer,
            feature,
            estimatedSizeBytes: 'byteLength' in data ? data.byteLength : (data as ArrayBuffer).byteLength
        });

        return buffer;
    }

    /**
     * Release a specific resource
     * 
     * Requirement 15.2: Release GPU memory when features are disabled
     * 
     * @param id - Resource identifier
     */
    releaseResource(id: string): void {
        if (!this.gl) return;

        const resource = this.resources.get(id);
        if (!resource || !resource.resource) return;

        // Delete the WebGL resource
        switch (resource.type) {
            case 'texture':
                this.gl.deleteTexture(resource.resource as WebGLTexture);
                break;
            case 'buffer':
                this.gl.deleteBuffer(resource.resource as WebGLBuffer);
                break;
            case 'framebuffer':
                this.gl.deleteFramebuffer(resource.resource as WebGLFramebuffer);
                break;
            case 'renderbuffer':
                this.gl.deleteRenderbuffer(resource.resource as WebGLRenderbuffer);
                break;
        }

        this.resources.delete(id);
    }

    /**
     * Release all resources associated with a feature
     * 
     * Requirement 15.2: Cleanup resources when features are disabled
     * 
     * @param feature - Feature to release resources for
     */
    releaseFeatureResources(feature: keyof FeatureToggles): void {
        const resourcesToRelease: string[] = [];

        // Find all resources for this feature
        for (const [id, resource] of this.resources.entries()) {
            if (resource.feature === feature) {
                resourcesToRelease.push(id);
            }
        }

        // Release them
        for (const id of resourcesToRelease) {
            this.releaseResource(id);
        }
    }

    /**
     * Update resource allocation based on feature toggles
     * 
     * Requirement 15.2: Release resources when features are disabled
     * 
     * @param previousFeatures - Previous feature state
     * @param currentFeatures - Current feature state
     */
    updateResourcesForFeatures(
        previousFeatures: FeatureToggles,
        currentFeatures: FeatureToggles
    ): void {
        // Check each feature and release resources if disabled
        const featureKeys: (keyof FeatureToggles)[] = [
            'gravitationalLensing',
            'accretionDisk',
            'dopplerBeaming',
            'backgroundStars',
            'photonSphereGlow',
            'bloom'
        ];

        for (const feature of featureKeys) {
            // Skip rayTracingQuality as it's not a boolean
            if (feature === 'rayTracingQuality') continue;

            // If feature was enabled but is now disabled, release its resources
            if (previousFeatures[feature] && !currentFeatures[feature]) {
                this.releaseFeatureResources(feature);
            }
        }
    }

    /**
     * Get GPU memory information if available
     * 
     * Requirement 15.3: Monitor GPU memory usage
     * Requirement 15.5: Display current GPU memory usage in telemetry
     * 
     * @returns GPU memory information
     */
    getGPUMemoryInfo(): GPUMemoryInfo {
        if (!this.gl || !this.memoryExtension) {
            return { available: false };
        }

        try {
            // Try to get memory info from extension
            const totalMemory = this.gl.getParameter(this.memoryExtension.TOTAL_MEMORY_MB);
            const usedMemory = this.gl.getParameter(this.memoryExtension.USED_MEMORY_MB);

            if (typeof totalMemory === 'number' && typeof usedMemory === 'number') {
                return {
                    totalMemoryMB: totalMemory,
                    usedMemoryMB: usedMemory,
                    availableMemoryMB: totalMemory - usedMemory,
                    available: true
                };
            }
        } catch (e) {
            // Extension might not be fully supported
        }

        return { available: false };
    }

    /**
     * Detect if system is in low memory state
     * 
     * Requirement 15.3: Detect low memory conditions
     * 
     * @returns True if low memory is detected
     */
    isLowMemory(): boolean {
        const memoryInfo = this.getGPUMemoryInfo();

        if (!memoryInfo.available) {
            // If we can't get memory info, check resource count as fallback
            return this.resources.size > 50; // Arbitrary threshold
        }

        // Consider low memory if less than 100MB available or usage > 90%
        if (memoryInfo.availableMemoryMB !== undefined && memoryInfo.availableMemoryMB < 100) {
            return true;
        }

        if (memoryInfo.totalMemoryMB && memoryInfo.usedMemoryMB) {
            const usagePercent = (memoryInfo.usedMemoryMB / memoryInfo.totalMemoryMB) * 100;
            return usagePercent > 90;
        }

        return false;
    }

    /**
     * Reduce texture resolution in response to low memory
     * 
     * Requirement 15.3: Reduce texture resolution when memory is low
     * 
     * @param currentScale - Current resolution scale
     * @returns Recommended resolution scale
     */
    getRecommendedResolutionScale(currentScale: number): number {
        if (this.isLowMemory()) {
            // Reduce by 25% when low memory is detected
            return Math.max(0.5, currentScale * 0.75);
        }
        return currentScale;
    }

    /**
     * Get total estimated memory usage
     * 
     * @returns Total estimated memory usage in bytes
     */
    getTotalMemoryUsage(): number {
        let total = 0;
        for (const resource of this.resources.values()) {
            total += resource.estimatedSizeBytes;
        }
        return total;
    }

    /**
     * Get memory usage by feature
     * 
     * @returns Map of feature to memory usage in bytes
     */
    getMemoryUsageByFeature(): Map<keyof FeatureToggles | 'core', number> {
        const usage = new Map<keyof FeatureToggles | 'core', number>();

        for (const resource of this.resources.values()) {
            const current = usage.get(resource.feature) || 0;
            usage.set(resource.feature, current + resource.estimatedSizeBytes);
        }

        return usage;
    }

    /**
     * Clean up all resources
     * 
     * Requirement 15.4: Prevent memory leaks
     */
    cleanup(): void {
        const resourceIds = Array.from(this.resources.keys());
        for (const id of resourceIds) {
            this.releaseResource(id);
        }
        this.resources.clear();
    }

    /**
     * Get resource count
     * 
     * @returns Number of allocated resources
     */
    getResourceCount(): number {
        return this.resources.size;
    }

    /**
     * Check if a resource exists
     * 
     * @param id - Resource identifier
     * @returns True if resource exists
     */
    hasResource(id: string): boolean {
        return this.resources.has(id);
    }
}

/**
 * Create a memory optimization manager instance
 * 
 * @param gl - WebGL rendering context
 * @returns Memory optimization manager
 */
export function createMemoryManager(gl: WebGLRenderingContext | null = null): MemoryOptimizationManager {
    return new MemoryOptimizationManager(gl);
}
