/**
 * Memory Optimization Tests
 * 
 * Tests for conditional resource management and memory optimization utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
    MemoryOptimizationManager,
    createMemoryManager
} from '@/utils/memory-optimization';
import type { FeatureToggles } from '@/types/features';

describe('Memory Optimization', () => {
    let manager: MemoryOptimizationManager;

    beforeEach(() => {
        manager = createMemoryManager(null);
    });

    describe('MemoryOptimizationManager', () => {
        it('should create a manager instance', () => {
            expect(manager).toBeInstanceOf(MemoryOptimizationManager);
        });

        it('should track resource count', () => {
            expect(manager.getResourceCount()).toBe(0);
        });

        it('should calculate total memory usage', () => {
            const usage = manager.getTotalMemoryUsage();
            expect(usage).toBe(0);
        });

        it('should detect low memory conditions', () => {
            const isLow = manager.isLowMemory();
            expect(typeof isLow).toBe('boolean');
        });

        it('should recommend resolution scale', () => {
            const scale = manager.getRecommendedResolutionScale(1.0);
            expect(scale).toBeGreaterThan(0);
            expect(scale).toBeLessThanOrEqual(1.0);
        });

        it('should get memory usage by feature', () => {
            const usage = manager.getMemoryUsageByFeature();
            expect(usage).toBeInstanceOf(Map);
        });

        it('should check if resource exists', () => {
            const exists = manager.hasResource('test');
            expect(exists).toBe(false);
        });

        it('should cleanup all resources', () => {
            manager.cleanup();
            expect(manager.getResourceCount()).toBe(0);
        });
    });

    describe('Feature-based resource management', () => {
        it('should update resources when features change', () => {
            const previousFeatures: FeatureToggles = {
                gravitationalLensing: true,
                accretionDisk: true,
                dopplerBeaming: false,
                backgroundStars: true,
                photonSphereGlow: false,
                bloom: false,
                rayTracingQuality: 'medium'
            };

            const currentFeatures: FeatureToggles = {
                gravitationalLensing: false,
                accretionDisk: true,
                dopplerBeaming: false,
                backgroundStars: false,
                photonSphereGlow: false,
                bloom: false,
                rayTracingQuality: 'low'
            };

            manager.updateResourcesForFeatures(previousFeatures, currentFeatures);
            expect(manager.getResourceCount()).toBe(0);
        });
    });

    describe('GPU memory info', () => {
        it('should return memory info structure', () => {
            const info = manager.getGPUMemoryInfo();
            expect(info).toHaveProperty('available');
            expect(typeof info.available).toBe('boolean');
        });
    });

    describe('Property-Based Tests', () => {
        /**
         * Feature: performance-optimization, Property 18: Conditional resource allocation
         * Validates: Requirements 15.1
         * 
         * For any disabled feature, the associated GPU resources (textures, buffers) 
         * should not be allocated during initialization.
         */
        it('should not allocate resources for disabled features', () => {
            fc.assert(
                fc.property(
                    // Generate random feature toggles
                    fc.record({
                        gravitationalLensing: fc.boolean(),
                        accretionDisk: fc.boolean(),
                        dopplerBeaming: fc.boolean(),
                        backgroundStars: fc.boolean(),
                        photonSphereGlow: fc.boolean(),
                        bloom: fc.boolean(),
                        rayTracingQuality: fc.constantFrom('off', 'low', 'medium', 'high', 'ultra')
                    }),
                    // Generate random resource dimensions
                    fc.integer({ min: 1, max: 2048 }), // width
                    fc.integer({ min: 1, max: 2048 }), // height
                    (features: FeatureToggles, width: number, height: number) => {
                        const testManager = createMemoryManager(null);

                        // Test each boolean feature
                        const featureKeys: (keyof FeatureToggles)[] = [
                            'gravitationalLensing',
                            'accretionDisk',
                            'dopplerBeaming',
                            'backgroundStars',
                            'photonSphereGlow',
                            'bloom'
                        ];

                        for (const featureKey of featureKeys) {
                            const featureValue = features[featureKey];

                            // Skip rayTracingQuality as it's not a boolean
                            if (typeof featureValue !== 'boolean') continue;

                            const resourceId = `test-${featureKey}`;

                            // Try to allocate a texture for this feature
                            const texture = testManager.allocateTexture(
                                resourceId,
                                featureKey,
                                featureValue as boolean,
                                width,
                                height
                            );

                            // Property: If feature is disabled, resource should NOT be allocated
                            if (!featureValue) {
                                expect(texture).toBeNull();
                                expect(testManager.hasResource(resourceId)).toBe(false);
                            }
                            // If feature is enabled, we can't test allocation without WebGL context
                            // but we can verify the manager doesn't have the resource when disabled
                        }

                        // Test buffer allocation as well
                        const bufferData = new Float32Array(100);
                        for (const featureKey of featureKeys) {
                            const featureValue = features[featureKey];

                            if (typeof featureValue !== 'boolean') continue;

                            const resourceId = `buffer-${featureKey}`;

                            // Try to allocate a buffer for this feature
                            const buffer = testManager.allocateBuffer(
                                resourceId,
                                featureKey,
                                featureValue as boolean,
                                bufferData
                            );

                            // Property: If feature is disabled, resource should NOT be allocated
                            if (!featureValue) {
                                expect(buffer).toBeNull();
                                expect(testManager.hasResource(resourceId)).toBe(false);
                            }
                        }

                        testManager.cleanup();
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
