import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import {
    isWithinDiskBoundaries,
    calculateDiskThickness,
    calculateDiskTemperature,
    getDiskInnerEdge,
    getDiskOuterEdge,
    verifyDiskThicknessRatio,
    verifyTemperatureProfile,
} from '@/physics/accretion-disk';
import { calculateISCO } from '@/physics/kerr-metric';

/**
 * Feature: blackhole-enhancement, Property 36: Disk inner edge at ISCO
 * Validates: Requirements 11.1
 * 
 * For any black hole configuration, the accretion disk rendering should only
 * contribute color for radii greater than or equal to the ISCO radius.
 */
describe('Property 36: Disk inner edge at ISCO', () => {
    test('disk inner edge equals ISCO radius', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 10, noNaN: true }), // mass
                fc.double({ min: -1, max: 1, noNaN: true }), // spin
                (mass, spin) => {
                    const isco = calculateISCO(mass, spin, true);
                    const diskInnerEdge = getDiskInnerEdge(mass, spin);

                    // Disk inner edge should equal ISCO
                    expect(diskInnerEdge).toBeCloseTo(isco, 10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('positions below ISCO are outside disk boundaries', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 10, noNaN: true }), // mass
                fc.double({ min: -1, max: 1, noNaN: true }), // spin
                fc.double({ min: 0.1, max: 0.99, noNaN: true }), // radius multiplier (< 1)
                (mass, spin, radiusMultiplier) => {
                    const isco = calculateISCO(mass, spin, true);
                    const schwarzschildRadius = mass * 1.0;
                    const radius = isco * radiusMultiplier; // Below ISCO

                    const withinBoundaries = isWithinDiskBoundaries(radius, isco, schwarzschildRadius);

                    // Should be outside disk boundaries
                    expect(withinBoundaries).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('positions at or above ISCO are within disk boundaries (if below outer edge)', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 10, noNaN: true }), // mass
                fc.double({ min: -1, max: 1, noNaN: true }), // spin
                fc.double({ min: 1.0, max: 50, noNaN: true }), // radius multiplier (>= 1, but < 100)
                (mass, spin, radiusMultiplier) => {
                    const isco = calculateISCO(mass, spin, true);
                    const schwarzschildRadius = mass * 1.0;
                    const diskOuterEdge = schwarzschildRadius * 100.0;
                    const radius = isco * radiusMultiplier;

                    // Only test if radius is below outer edge
                    if (radius <= diskOuterEdge) {
                        const withinBoundaries = isWithinDiskBoundaries(radius, isco, schwarzschildRadius);

                        // Should be within disk boundaries
                        expect(withinBoundaries).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * Feature: blackhole-enhancement, Property 37: Disk outer edge limit
 * Validates: Requirements 11.2
 * 
 * For any black hole configuration, the accretion disk rendering should only
 * contribute color for radii less than or equal to the outer radius
 * (approximately 100 Schwarzschild radii).
 */
describe('Property 37: Disk outer edge limit', () => {
    test('disk outer edge equals 100 Schwarzschild radii', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 10, noNaN: true }), // mass
                (mass) => {
                    const schwarzschildRadius = mass * 1.0;
                    const diskOuterEdge = getDiskOuterEdge(schwarzschildRadius);

                    // Disk outer edge should equal 100 * Schwarzschild radius
                    expect(diskOuterEdge).toBeCloseTo(schwarzschildRadius * 100.0, 10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('positions above outer edge are outside disk boundaries', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 10, noNaN: true }), // mass
                fc.double({ min: -1, max: 1, noNaN: true }), // spin
                fc.double({ min: 1.01, max: 2, noNaN: true }), // multiplier (> 1)
                (mass, spin, multiplier) => {
                    const isco = calculateISCO(mass, spin, true);
                    const schwarzschildRadius = mass * 1.0;
                    const diskOuterEdge = schwarzschildRadius * 100.0;
                    const radius = diskOuterEdge * multiplier; // Above outer edge

                    const withinBoundaries = isWithinDiskBoundaries(radius, isco, schwarzschildRadius);

                    // Should be outside disk boundaries
                    expect(withinBoundaries).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('positions at or below outer edge are within disk boundaries (if above ISCO)', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 10, noNaN: true }), // mass
                fc.double({ min: -1, max: 1, noNaN: true }), // spin
                fc.double({ min: 0.5, max: 1.0, noNaN: true }), // multiplier (<= 1)
                (mass, spin, multiplier) => {
                    const isco = calculateISCO(mass, spin, true);
                    const schwarzschildRadius = mass * 1.0;
                    const diskOuterEdge = schwarzschildRadius * 100.0;
                    const radius = diskOuterEdge * multiplier;

                    // Only test if radius is above ISCO
                    if (radius >= isco) {
                        const withinBoundaries = isWithinDiskBoundaries(radius, isco, schwarzschildRadius);

                        // Should be within disk boundaries
                        expect(withinBoundaries).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * Feature: blackhole-enhancement, Property 38: Disk thickness ratio
 * Validates: Requirements 11.3
 * 
 * For any radius in the accretion disk, the disk thickness h should satisfy
 * 0.01 ≤ h/r ≤ 0.1.
 */
describe('Property 38: Disk thickness ratio', () => {
    test('disk thickness ratio is within valid range [0.01, 0.1]', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 1, max: 1000, noNaN: true }), // radius
                fc.double({ min: 0.01, max: 0.1, noNaN: true }), // thickness ratio
                (radius, thicknessRatio) => {
                    const thickness = calculateDiskThickness(radius, thicknessRatio);
                    const isValid = verifyDiskThicknessRatio(radius, thickness);

                    // Thickness ratio should be valid
                    expect(isValid).toBe(true);

                    // Verify the actual ratio
                    const actualRatio = thickness / radius;
                    expect(actualRatio).toBeGreaterThanOrEqual(0.01 - 1e-10);
                    expect(actualRatio).toBeLessThanOrEqual(0.1 + 1e-10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('disk thickness scales proportionally with radius', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 1, max: 100, noNaN: true }), // radius1
                fc.double({ min: 1.1, max: 2, noNaN: true }), // scale factor (> 1)
                fc.double({ min: 0.01, max: 0.1, noNaN: true }), // thickness ratio
                (radius1, scaleFactor, thicknessRatio) => {
                    const radius2 = radius1 * scaleFactor;

                    const thickness1 = calculateDiskThickness(radius1, thicknessRatio);
                    const thickness2 = calculateDiskThickness(radius2, thicknessRatio);

                    // Thickness should scale proportionally with radius
                    const ratio1 = thickness1 / radius1;
                    const ratio2 = thickness2 / radius2;

                    expect(ratio1).toBeCloseTo(ratio2, 10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('thickness ratio is clamped to valid range even with invalid input', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 1, max: 100, noNaN: true }), // radius
                fc.double({ min: -1, max: 2, noNaN: true }), // invalid thickness ratio
                (radius, invalidRatio) => {
                    const thickness = calculateDiskThickness(radius, invalidRatio);
                    const isValid = verifyDiskThicknessRatio(radius, thickness);

                    // Even with invalid input, result should be valid
                    expect(isValid).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('default thickness ratio is 0.05', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 1, max: 100, noNaN: true }), // radius
                (radius) => {
                    const thickness = calculateDiskThickness(radius); // No ratio specified
                    const ratio = thickness / radius;

                    // Default ratio should be 0.05
                    expect(ratio).toBeCloseTo(0.05, 10);
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * Feature: blackhole-enhancement, Property 39: Temperature increases near ISCO
 * Validates: Requirements 11.5
 * 
 * For any two radii r1 and r2 where r1 < r2 and both are near the ISCO,
 * the temperature at r1 should be greater than or equal to the temperature at r2.
 */
describe('Property 39: Temperature increases near ISCO', () => {
    test('temperature at smaller radius is greater than or equal to temperature at larger radius', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 10, noNaN: true }), // mass
                fc.double({ min: -1, max: 1, noNaN: true }), // spin
                fc.double({ min: 1.0, max: 5, noNaN: true }), // radius1 multiplier
                fc.double({ min: 0.1, max: 1, noNaN: true }), // additional offset for radius2
                (mass, spin, radius1Multiplier, offset) => {
                    const isco = calculateISCO(mass, spin, true);
                    const schwarzschildRadius = mass * 1.0;
                    const diskOuterEdge = schwarzschildRadius * 100.0;

                    const radius1 = isco * radius1Multiplier;
                    const radius2 = radius1 + isco * offset; // radius2 > radius1

                    // Only test if both radii are within disk
                    if (radius1 >= isco && radius2 <= diskOuterEdge) {
                        const temp1 = calculateDiskTemperature(radius1, isco, diskOuterEdge);
                        const temp2 = calculateDiskTemperature(radius2, isco, diskOuterEdge);

                        // Temperature should increase toward ISCO (smaller radius)
                        const isValid = verifyTemperatureProfile(radius1, radius2, temp1, temp2);
                        expect(isValid).toBe(true);

                        // Explicitly check: temp1 >= temp2
                        expect(temp1).toBeGreaterThanOrEqual(temp2 - 1e-6);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    test('temperature is within expected range [3000K, 20000K] before multiplier', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 10, noNaN: true }), // mass
                fc.double({ min: -1, max: 1, noNaN: true }), // spin
                fc.double({ min: 1.0, max: 50, noNaN: true }), // radius multiplier
                (mass, spin, radiusMultiplier) => {
                    const isco = calculateISCO(mass, spin, true);
                    const schwarzschildRadius = mass * 1.0;
                    const diskOuterEdge = schwarzschildRadius * 100.0;
                    const radius = isco * radiusMultiplier;

                    // Only test if radius is within disk
                    if (radius >= isco && radius <= diskOuterEdge) {
                        const temp = calculateDiskTemperature(radius, isco, diskOuterEdge, 1.0);

                        // Temperature should be within base range
                        expect(temp).toBeGreaterThanOrEqual(3000 - 1e-6);
                        expect(temp).toBeLessThanOrEqual(20000 + 1e-6);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    test('temperature at ISCO is maximum (approximately 20000K)', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 10, noNaN: true }), // mass
                fc.double({ min: -1, max: 1, noNaN: true }), // spin
                (mass, spin) => {
                    const isco = calculateISCO(mass, spin, true);
                    const schwarzschildRadius = mass * 1.0;
                    const diskOuterEdge = schwarzschildRadius * 100.0;

                    const tempAtISCO = calculateDiskTemperature(isco, isco, diskOuterEdge, 1.0);

                    // Temperature at ISCO should be close to maximum (20000K)
                    expect(tempAtISCO).toBeCloseTo(20000, 0);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('temperature at outer edge is minimum (approximately 3000K)', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 10, noNaN: true }), // mass
                fc.double({ min: -1, max: 1, noNaN: true }), // spin
                (mass, spin) => {
                    const isco = calculateISCO(mass, spin, true);
                    const schwarzschildRadius = mass * 1.0;
                    const diskOuterEdge = schwarzschildRadius * 100.0;

                    const tempAtOuter = calculateDiskTemperature(diskOuterEdge, isco, diskOuterEdge, 1.0);

                    // Temperature at outer edge should be close to minimum (3000K)
                    expect(tempAtOuter).toBeCloseTo(3000, 0);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('temperature multiplier scales temperature proportionally', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 10, noNaN: true }), // mass
                fc.double({ min: -1, max: 1, noNaN: true }), // spin
                fc.double({ min: 1.0, max: 10, noNaN: true }), // radius multiplier
                fc.double({ min: 0.5, max: 3, noNaN: true }), // temp multiplier
                (mass, spin, radiusMultiplier, tempMultiplier) => {
                    const isco = calculateISCO(mass, spin, true);
                    const schwarzschildRadius = mass * 1.0;
                    const diskOuterEdge = schwarzschildRadius * 100.0;
                    const radius = isco * radiusMultiplier;

                    // Only test if radius is within disk
                    if (radius >= isco && radius <= diskOuterEdge) {
                        const tempBase = calculateDiskTemperature(radius, isco, diskOuterEdge, 1.0);
                        const tempScaled = calculateDiskTemperature(radius, isco, diskOuterEdge, tempMultiplier);

                        // Scaled temperature should equal base temperature * multiplier
                        expect(tempScaled).toBeCloseTo(tempBase * tempMultiplier, 6);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
