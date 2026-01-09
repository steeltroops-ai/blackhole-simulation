/**
 * Property-based tests for Adaptive Resolution Controller
 * 
 * Tests adaptive resolution scaling based on FPS thresholds
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { AdaptiveResolutionController } from '@/rendering/adaptive-resolution';

describe('AdaptiveResolutionController', () => {
    let controller: AdaptiveResolutionController;

    beforeEach(() => {
        controller = new AdaptiveResolutionController();
    });

    /**
     * Feature: performance-optimization, Property 9: Adaptive resolution decrease trigger
     * Validates: Requirements 11.1
     * 
     * For any performance state where FPS remains below 60 for more than 2 seconds,
     * the render resolution should decrease by 10%.
     */
    it('should decrease resolution by 10% when FPS < 60 for more than 2 seconds', () => {
        fc.assert(
            fc.property(
                // Generate FPS values below 60 (20-59)
                fc.integer({ min: 20, max: 59 }),
                // Generate time steps that will accumulate to > 2 seconds
                fc.array(fc.float({ min: Math.fround(0.1), max: Math.fround(0.5) }), { minLength: 5, maxLength: 10 }),
                (lowFPS, timeSteps) => {
                    // Reset controller to known state
                    controller.reset();
                    controller.setEnabled(true);

                    const initialScale = controller.getCurrentScale();
                    expect(initialScale).toBe(1.0);

                    let totalTime = 0;
                    let finalScale = initialScale;

                    // Simulate frames with low FPS until we exceed 2 seconds
                    for (const deltaTime of timeSteps) {
                        finalScale = controller.update(lowFPS, deltaTime);
                        totalTime += deltaTime;

                        // Once we've exceeded 2 seconds, resolution should have decreased
                        if (totalTime > 2.0) {
                            break;
                        }
                    }

                    // If we accumulated more than 2 seconds, resolution should have decreased
                    if (totalTime > 2.0) {
                        // The target scale should be reduced by 10% (0.1)
                        const targetScale = controller.getTargetScale();
                        expect(targetScale).toBeLessThanOrEqual(initialScale - 0.1 + 0.001); // Small epsilon for floating point

                        // Final scale should be moving towards the reduced target
                        // (may not be exactly at target due to interpolation)
                        expect(finalScale).toBeLessThan(initialScale);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: performance-optimization, Property 10: Adaptive resolution increase trigger
     * Validates: Requirements 11.2
     * 
     * For any performance state where FPS remains above 75 for more than 5 seconds,
     * the render resolution should increase by 10%.
     */
    it('should increase resolution by 10% when FPS > 75 for more than 5 seconds', () => {
        fc.assert(
            fc.property(
                // Generate FPS values above 75 (76-120)
                fc.integer({ min: 76, max: 120 }),
                // Generate time steps that will accumulate to > 5 seconds
                fc.array(fc.float({ min: Math.fround(0.1), max: Math.fround(0.5) }), { minLength: 11, maxLength: 20 }),
                (highFPS, timeSteps) => {
                    // Reset controller and start at a reduced resolution
                    controller.reset();
                    controller.setEnabled(true);

                    // First reduce resolution to 0.7 so we have room to increase
                    controller.update(30, 0.5);
                    controller.update(30, 0.5);
                    controller.update(30, 0.5);
                    controller.update(30, 0.5);
                    controller.update(30, 0.5);

                    // Wait for interpolation to settle
                    for (let i = 0; i < 20; i++) {
                        controller.update(65, 0.1); // Neutral FPS
                    }

                    const initialScale = controller.getTargetScale();

                    // Only test if we're below max scale
                    if (initialScale < 1.0) {
                        let totalTime = 0;
                        let finalScale = initialScale;

                        // Simulate frames with high FPS until we exceed 5 seconds
                        for (const deltaTime of timeSteps) {
                            finalScale = controller.update(highFPS, deltaTime);
                            totalTime += deltaTime;

                            // Once we've exceeded 5 seconds, resolution should have increased
                            if (totalTime > 5.0) {
                                break;
                            }
                        }

                        // If we accumulated more than 5 seconds, resolution should have increased
                        if (totalTime > 5.0) {
                            // The target scale should be increased by 10% (0.1)
                            const targetScale = controller.getTargetScale();
                            expect(targetScale).toBeGreaterThanOrEqual(initialScale + 0.1 - 0.001); // Small epsilon

                            // Final scale should be moving towards the increased target
                            expect(finalScale).toBeGreaterThan(initialScale - 0.001);
                        }
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: performance-optimization, Property 11: Resolution clamping
     * Validates: Requirements 11.3
     * 
     * For any resolution adjustment, the resulting resolution scale should be
     * clamped between 0.5 (50%) and 1.0 (100%).
     */
    it('should clamp resolution between 0.5 and 1.0', () => {
        fc.assert(
            fc.property(
                // Generate random FPS values
                fc.integer({ min: 10, max: 150 }),
                // Generate random time deltas
                fc.float({ min: Math.fround(0.01), max: Math.fround(1.0) }),
                // Generate number of iterations
                fc.integer({ min: 1, max: 100 }),
                (fps, deltaTime, iterations) => {
                    controller.reset();
                    controller.setEnabled(true);

                    // Run multiple updates
                    for (let i = 0; i < iterations; i++) {
                        const scale = controller.update(fps, deltaTime);

                        // Resolution should always be clamped between 0.5 and 1.0
                        expect(scale).toBeGreaterThanOrEqual(0.5);
                        expect(scale).toBeLessThanOrEqual(1.0);

                        // Target scale should also be clamped
                        const targetScale = controller.getTargetScale();
                        expect(targetScale).toBeGreaterThanOrEqual(0.5);
                        expect(targetScale).toBeLessThanOrEqual(1.0);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: performance-optimization, Property 12: Adaptive resolution disable
     * Validates: Requirements 11.4
     * 
     * For any state where adaptive resolution is disabled, the resolution scale
     * should remain at 1.0 regardless of FPS changes.
     */
    it('should maintain 1.0 resolution when disabled regardless of FPS', () => {
        fc.assert(
            fc.property(
                // Generate random FPS values (including very low ones)
                fc.integer({ min: 10, max: 150 }),
                // Generate random time deltas
                fc.float({ min: Math.fround(0.01), max: Math.fround(2.0) }),
                // Generate number of iterations
                fc.integer({ min: 1, max: 50 }),
                (fps, deltaTime, iterations) => {
                    controller.reset();
                    controller.setEnabled(false); // Disable adaptive resolution

                    // Run multiple updates with various FPS values
                    for (let i = 0; i < iterations; i++) {
                        const scale = controller.update(fps, deltaTime);

                        // Resolution should always be 1.0 when disabled
                        expect(scale).toBe(1.0);

                        // Target scale should also be 1.0
                        const targetScale = controller.getTargetScale();
                        expect(targetScale).toBe(1.0);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    // Additional unit tests for edge cases and specific behaviors

    it('should start at 1.0 resolution scale', () => {
        expect(controller.getCurrentScale()).toBe(1.0);
        expect(controller.getTargetScale()).toBe(1.0);
    });

    it('should reset to 1.0 when reset() is called', () => {
        // Reduce resolution first
        controller.update(30, 3.0);
        expect(controller.getTargetScale()).toBeLessThan(1.0);

        // Reset
        controller.reset();
        expect(controller.getCurrentScale()).toBe(1.0);
        expect(controller.getTargetScale()).toBe(1.0);
    });

    it('should reset to 1.0 when disabled', () => {
        // Reduce resolution first
        controller.update(30, 3.0);

        // Disable
        controller.setEnabled(false);
        expect(controller.getCurrentScale()).toBe(1.0);
        expect(controller.getTargetScale()).toBe(1.0);
    });

    it('should not change resolution when FPS is between 60 and 75', () => {
        controller.reset();
        const initialScale = controller.getCurrentScale();

        // Run updates with FPS in the neutral zone
        for (let i = 0; i < 100; i++) {
            controller.update(65, 0.1);
        }

        // Scale should remain at initial value
        expect(controller.getTargetScale()).toBe(initialScale);
    });

    it('should apply smooth interpolation', () => {
        controller.reset();

        // Trigger a resolution decrease
        controller.update(30, 3.0);

        const targetScale = controller.getTargetScale();
        const currentScale = controller.getCurrentScale();

        // Current scale should not immediately jump to target
        // (unless we're at the very end of interpolation)
        if (Math.abs(targetScale - currentScale) > 0.001) {
            expect(currentScale).toBeGreaterThan(targetScale);
        }
    });

    it('should respect custom configuration', () => {
        const customController = new AdaptiveResolutionController({
            minScale: 0.6,
            maxScale: 0.9,
            adjustmentStep: 0.05,
        });

        // Start at max scale (0.9)
        expect(customController.getCurrentScale()).toBe(0.9);

        // Trigger decrease
        customController.update(30, 3.0);

        // Should decrease by 0.05
        expect(customController.getTargetScale()).toBeCloseTo(0.85, 2);

        // Keep decreasing until we hit min
        for (let i = 0; i < 20; i++) {
            customController.update(30, 3.0);
        }

        // Should not go below 0.6
        expect(customController.getTargetScale()).toBeGreaterThanOrEqual(0.6);
        expect(customController.getCurrentScale()).toBeGreaterThanOrEqual(0.6);
    });
});
