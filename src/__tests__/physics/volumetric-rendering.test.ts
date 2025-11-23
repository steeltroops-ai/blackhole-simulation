import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import {
    calculateExponentialDensityFalloff,
    shouldTerminateOnSaturation,
    calculateSmoothEdgeFading,
    calculateViewAngleOpacity,
    calculatePathLengthFactor,
    alphaBlend,
    verifyAlphaBlendingFormula,
} from '@/physics/volumetric-rendering';

/**
 * Feature: blackhole-enhancement, Property 42: Exponential density falloff
 * Validates: Requirements 14.1
 * 
 * For any position in the accretion disk, the density should decrease exponentially
 * with distance from the disk midplane according to exp(-k|y|/h) where h is disk thickness.
 */
describe('Property 42: Exponential density falloff', () => {
    test('density decreases exponentially with distance from midplane', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 10, noNaN: true }), // disk thickness
                fc.double({ min: 0, max: 5, noNaN: true }), // distance1
                fc.double({ min: 0.1, max: 1, noNaN: true }), // additional distance
                (diskThickness, distance1, additionalDistance) => {
                    const distance2 = distance1 + additionalDistance; // distance2 > distance1

                    const density1 = calculateExponentialDensityFalloff(distance1, diskThickness);
                    const density2 = calculateExponentialDensityFalloff(distance2, diskThickness);

                    // Density at greater distance should be less than or equal to density at smaller distance
                    expect(density2).toBeLessThanOrEqual(density1 + 1e-10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('density at midplane (y=0) is maximum (1.0)', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 10, noNaN: true }), // disk thickness
                (diskThickness) => {
                    const densityAtMidplane = calculateExponentialDensityFalloff(0, diskThickness);

                    // Density at midplane should be 1.0 (maximum)
                    expect(densityAtMidplane).toBeCloseTo(1.0, 10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('density is always in valid range [0, 1]', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0, max: 20, noNaN: true }), // vertical distance
                fc.double({ min: 0.1, max: 10, noNaN: true }), // disk thickness
                (verticalDistance, diskThickness) => {
                    const density = calculateExponentialDensityFalloff(verticalDistance, diskThickness);

                    // Density should be in valid range
                    expect(density).toBeGreaterThanOrEqual(0);
                    expect(density).toBeLessThanOrEqual(1);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('density follows exponential formula exp(-k|y|/h)', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0, max: 5, noNaN: true }), // vertical distance
                fc.double({ min: 0.1, max: 10, noNaN: true }), // disk thickness
                fc.double({ min: 1, max: 5, noNaN: true }), // falloff rate
                (verticalDistance, diskThickness, falloffRate) => {
                    const density = calculateExponentialDensityFalloff(verticalDistance, diskThickness, falloffRate);

                    // Calculate expected density using formula
                    const normalizedDistance = Math.abs(verticalDistance) / diskThickness;
                    const expectedDensity = Math.exp(-falloffRate * normalizedDistance);

                    // Density should match formula
                    expect(density).toBeCloseTo(expectedDensity, 10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('density is symmetric around midplane', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 5, noNaN: true }), // distance
                fc.double({ min: 0.1, max: 10, noNaN: true }), // disk thickness
                (distance, diskThickness) => {
                    const densityPositive = calculateExponentialDensityFalloff(distance, diskThickness);
                    const densityNegative = calculateExponentialDensityFalloff(-distance, diskThickness);

                    // Density should be same for +y and -y
                    expect(densityPositive).toBeCloseTo(densityNegative, 10);
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * Feature: blackhole-enhancement, Property 43: Early termination on saturation
 * Validates: Requirements 14.2
 * 
 * For any ray marching process, when accumulated density exceeds a saturation
 * threshold (e.g., 0.98), the ray marching should terminate early.
 */
describe('Property 43: Early termination on saturation', () => {
    test('terminates when density reaches saturation threshold', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.98, max: 1.5, noNaN: true }), // density >= threshold
                (density) => {
                    const shouldTerminate = shouldTerminateOnSaturation(density, 0.98);

                    // Should terminate when density >= threshold
                    expect(shouldTerminate).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('does not terminate when density below saturation threshold', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0, max: 0.97, noNaN: true }), // density < threshold
                (density) => {
                    const shouldTerminate = shouldTerminateOnSaturation(density, 0.98);

                    // Should not terminate when density < threshold
                    expect(shouldTerminate).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('threshold is configurable', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.5, max: 0.99, noNaN: true }), // custom threshold
                fc.double({ min: 0, max: 1, noNaN: true }), // density
                (threshold, density) => {
                    const shouldTerminate = shouldTerminateOnSaturation(density, threshold);

                    // Should terminate if and only if density >= threshold
                    expect(shouldTerminate).toBe(density >= threshold);
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * Feature: blackhole-enhancement, Property 44: Smooth edge fading
 * Validates: Requirements 14.3
 * 
 * For any radius near the disk inner or outer edge, the density should smoothly
 * fade to zero using a smoothstep or similar function to prevent discontinuities.
 */
describe('Property 44: Smooth edge fading', () => {
    test('inner edge fades in smoothly from edge', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 1, max: 100, noNaN: true }), // edge radius
                fc.double({ min: 0.1, max: 10, noNaN: true }), // fade width
                fc.double({ min: 0, max: 1, noNaN: true }), // position within fade (0=at edge, 1=past fade)
                (edgeRadius, fadeWidth, positionFactor) => {
                    const radius1 = edgeRadius + positionFactor * fadeWidth;
                    const radius2 = edgeRadius + (positionFactor + 0.1) * fadeWidth;

                    const fade1 = calculateSmoothEdgeFading(radius1, edgeRadius, fadeWidth, true);
                    const fade2 = calculateSmoothEdgeFading(radius2, edgeRadius, fadeWidth, true);

                    // Fade should increase or stay same as radius increases (moving away from edge)
                    expect(fade2).toBeGreaterThanOrEqual(fade1 - 1e-10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('outer edge fades out smoothly toward edge', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 10, max: 100, noNaN: true }), // edge radius
                fc.double({ min: 0.1, max: 10, noNaN: true }), // fade width
                fc.double({ min: 0, max: 0.9, noNaN: true }), // position within fade
                (edgeRadius, fadeWidth, positionFactor) => {
                    // radius1 is farther from edge (inside disk), radius2 is closer to edge
                    const radius1 = edgeRadius - (positionFactor + 0.1) * fadeWidth;
                    const radius2 = edgeRadius - positionFactor * fadeWidth;

                    const fade1 = calculateSmoothEdgeFading(radius1, edgeRadius, fadeWidth, false);
                    const fade2 = calculateSmoothEdgeFading(radius2, edgeRadius, fadeWidth, false);

                    // radius1 < radius2 (radius1 is farther from edge)
                    // fade1 should be >= fade2 (fade decreases as we approach the edge)
                    expect(fade1).toBeGreaterThanOrEqual(fade2 - 1e-10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('fade values are always in valid range [0, 1]', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 1, max: 100, noNaN: true }), // radius
                fc.double({ min: 1, max: 100, noNaN: true }), // edge radius
                fc.double({ min: 0.1, max: 10, noNaN: true }), // fade width
                fc.boolean(), // is inner edge
                (radius, edgeRadius, fadeWidth, isInnerEdge) => {
                    const fade = calculateSmoothEdgeFading(radius, edgeRadius, fadeWidth, isInnerEdge);

                    // Fade should be in valid range
                    expect(fade).toBeGreaterThanOrEqual(0);
                    expect(fade).toBeLessThanOrEqual(1);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('fade is continuous (no discontinuities)', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 10, max: 100, noNaN: true }), // edge radius
                fc.double({ min: 1, max: 10, noNaN: true }), // fade width
                fc.double({ min: 0, max: 2, noNaN: true }), // offset from edge
                fc.boolean(), // is inner edge
                (edgeRadius, fadeWidth, offset, isInnerEdge) => {
                    const radius1 = isInnerEdge ? edgeRadius + offset : edgeRadius - offset;
                    const radius2 = isInnerEdge ? edgeRadius + offset + 0.01 : edgeRadius - offset - 0.01;

                    const fade1 = calculateSmoothEdgeFading(radius1, edgeRadius, fadeWidth, isInnerEdge);
                    const fade2 = calculateSmoothEdgeFading(radius2, edgeRadius, fadeWidth, isInnerEdge);

                    // Small change in radius should produce small change in fade (continuity)
                    const fadeDiff = Math.abs(fade2 - fade1);
                    expect(fadeDiff).toBeLessThan(0.1); // Reasonable bound for continuity
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * Feature: blackhole-enhancement, Property 45: Opacity includes viewing angle
 * Validates: Requirements 14.4
 * 
 * For any disk position and viewing direction, the calculated opacity should
 * include a factor based on the viewing angle (e.g., more opaque when viewed edge-on).
 */
describe('Property 45: Opacity includes viewing angle', () => {
    test('opacity is higher when viewing edge-on (viewAngle close to 0)', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0, max: 0.3, noNaN: true }), // edge-on angle
                fc.double({ min: 0.7, max: 1, noNaN: true }), // face-on angle
                (edgeOnAngle, faceOnAngle) => {
                    const opacityEdgeOn = calculateViewAngleOpacity(edgeOnAngle);
                    const opacityFaceOn = calculateViewAngleOpacity(faceOnAngle);

                    // Edge-on should have higher opacity than face-on
                    expect(opacityEdgeOn).toBeGreaterThanOrEqual(opacityFaceOn - 1e-10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('opacity is always in valid range [0, 1]', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0, max: 1, noNaN: true }), // view angle
                (viewAngle) => {
                    const opacity = calculateViewAngleOpacity(viewAngle);

                    // Opacity should be in valid range
                    expect(opacity).toBeGreaterThanOrEqual(0);
                    expect(opacity).toBeLessThanOrEqual(1);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('path length factor increases when viewing edge-on', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0, max: 0.3, noNaN: true }), // edge-on angle
                fc.double({ min: 0.7, max: 1, noNaN: true }), // face-on angle
                (edgeOnAngle, faceOnAngle) => {
                    const pathLengthEdgeOn = calculatePathLengthFactor(edgeOnAngle);
                    const pathLengthFaceOn = calculatePathLengthFactor(faceOnAngle);

                    // Edge-on should have longer path length than face-on
                    expect(pathLengthEdgeOn).toBeGreaterThanOrEqual(pathLengthFaceOn - 1e-10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('path length factor is bounded [1, 3]', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0, max: 1, noNaN: true }), // view angle
                (viewAngle) => {
                    const pathLength = calculatePathLengthFactor(viewAngle);

                    // Path length should be in valid range
                    expect(pathLength).toBeGreaterThanOrEqual(1 - 1e-10);
                    expect(pathLength).toBeLessThanOrEqual(3 + 1e-10);
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * Feature: blackhole-enhancement, Property 46: Alpha blending formula
 * Validates: Requirements 14.5
 * 
 * For any two colors being composited, the result should follow the alpha blending
 * formula: C_result = C_new × α + C_old × (1 - α).
 */
describe('Property 46: Alpha blending formula', () => {
    test('alpha blending follows correct formula', () => {
        fc.assert(
            fc.property(
                fc.tuple(
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true })
                ), // new color
                fc.tuple(
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true })
                ), // old color
                fc.double({ min: 0, max: 1, noNaN: true }), // alpha
                (newColor, oldColor, alpha) => {
                    const result = alphaBlend(newColor, oldColor, alpha);

                    // Verify formula: C_result = C_new × α + C_old × (1 - α)
                    const expectedR = newColor[0] * alpha + oldColor[0] * (1 - alpha);
                    const expectedG = newColor[1] * alpha + oldColor[1] * (1 - alpha);
                    const expectedB = newColor[2] * alpha + oldColor[2] * (1 - alpha);

                    expect(result[0]).toBeCloseTo(expectedR, 10);
                    expect(result[1]).toBeCloseTo(expectedG, 10);
                    expect(result[2]).toBeCloseTo(expectedB, 10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('alpha=0 returns old color', () => {
        fc.assert(
            fc.property(
                fc.tuple(
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true })
                ), // new color
                fc.tuple(
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true })
                ), // old color
                (newColor, oldColor) => {
                    const result = alphaBlend(newColor, oldColor, 0);

                    // With alpha=0, result should equal old color
                    expect(result[0]).toBeCloseTo(oldColor[0], 10);
                    expect(result[1]).toBeCloseTo(oldColor[1], 10);
                    expect(result[2]).toBeCloseTo(oldColor[2], 10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('alpha=1 returns new color', () => {
        fc.assert(
            fc.property(
                fc.tuple(
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true })
                ), // new color
                fc.tuple(
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true })
                ), // old color
                (newColor, oldColor) => {
                    const result = alphaBlend(newColor, oldColor, 1);

                    // With alpha=1, result should equal new color
                    expect(result[0]).toBeCloseTo(newColor[0], 10);
                    expect(result[1]).toBeCloseTo(newColor[1], 10);
                    expect(result[2]).toBeCloseTo(newColor[2], 10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('blended color components are always in valid range [0, 1]', () => {
        fc.assert(
            fc.property(
                fc.tuple(
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true })
                ), // new color
                fc.tuple(
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true })
                ), // old color
                fc.double({ min: 0, max: 1, noNaN: true }), // alpha
                (newColor, oldColor, alpha) => {
                    const result = alphaBlend(newColor, oldColor, alpha);

                    // All components should be in valid range
                    expect(result[0]).toBeGreaterThanOrEqual(0);
                    expect(result[0]).toBeLessThanOrEqual(1);
                    expect(result[1]).toBeGreaterThanOrEqual(0);
                    expect(result[1]).toBeLessThanOrEqual(1);
                    expect(result[2]).toBeGreaterThanOrEqual(0);
                    expect(result[2]).toBeLessThanOrEqual(1);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('verify alpha blending formula function works correctly', () => {
        fc.assert(
            fc.property(
                fc.tuple(
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true })
                ), // new color
                fc.tuple(
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true }),
                    fc.double({ min: 0, max: 1, noNaN: true })
                ), // old color
                fc.double({ min: 0, max: 1, noNaN: true }), // alpha
                (newColor, oldColor, alpha) => {
                    const result = alphaBlend(newColor, oldColor, alpha);
                    const isValid = verifyAlphaBlendingFormula(newColor, oldColor, alpha, result);

                    // Verification function should confirm correct blending
                    expect(isValid).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });
});
