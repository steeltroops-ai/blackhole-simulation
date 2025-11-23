import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { temperatureToColor, applyDopplerShift } from '@/physics/color-temperature';

/**
 * Feature: blackhole-enhancement, Property 9: Temperature to color mapping validity
 * Validates: Requirements 3.1
 * 
 * For any temperature value in Kelvin, the temperature-to-color function should return
 * an RGB tuple where all components are in the range [0, 1] and follow blackbody
 * radiation spectrum principles (red for low temp, blue for high temp).
 */
describe('Property 9: Temperature to color mapping validity', () => {
    test('all RGB components are in valid range [0, 1]', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 1000, max: 100000, noNaN: true }), // temperature in Kelvin
                (tempK) => {
                    const [r, g, b] = temperatureToColor(tempK);

                    // All components should be in [0, 1]
                    expect(r).toBeGreaterThanOrEqual(0);
                    expect(r).toBeLessThanOrEqual(1);
                    expect(g).toBeGreaterThanOrEqual(0);
                    expect(g).toBeLessThanOrEqual(1);
                    expect(b).toBeGreaterThanOrEqual(0);
                    expect(b).toBeLessThanOrEqual(1);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('low temperatures produce red-dominant colors', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 1000, max: 3000, noNaN: true }), // low temperature
                (tempK) => {
                    const [r, g, b] = temperatureToColor(tempK);

                    // For low temperatures, red should be dominant
                    // Red should be greater than or equal to blue
                    expect(r).toBeGreaterThanOrEqual(b);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('high temperatures produce blue-dominant colors', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 10000, max: 40000, noNaN: true }), // high temperature
                (tempK) => {
                    const [r, g, b] = temperatureToColor(tempK);

                    // For high temperatures, blue should be dominant or equal
                    // Blue should be greater than or equal to red
                    expect(b).toBeGreaterThanOrEqual(r);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('temperature increases correlate with blue component increase', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 5000, max: 15000, noNaN: true }), // temp1
                (temp1) => {
                    const temp2 = temp1 + 1000; // higher temperature
                    const [r1, g1, b1] = temperatureToColor(temp1);
                    const [r2, g2, b2] = temperatureToColor(temp2);

                    // As temperature increases, blue component should generally increase
                    // (or stay the same if already at maximum)
                    expect(b2).toBeGreaterThanOrEqual(b1 - 0.1); // Allow small tolerance
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * Feature: blackhole-enhancement, Property 10: Doppler color shift direction
 * Validates: Requirements 3.6
 * 
 * For any velocity and viewing angle, when material approaches the observer
 * (positive radial velocity), the Doppler shift should move colors toward blue,
 * and when receding (negative radial velocity), should move toward red.
 */
describe('Property 10: Doppler color shift direction', () => {
    test('approaching material shifts toward blue', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0, max: 1, noNaN: true }), // r
                fc.double({ min: 0, max: 1, noNaN: true }), // g
                fc.double({ min: 0, max: 1, noNaN: true }), // b
                fc.double({ min: 0.1, max: 0.9, noNaN: true }), // positive velocity (approaching)
                fc.double({ min: 0, max: Math.PI / 4, noNaN: true }), // angle toward observer
                (r, g, b, velocity, angle) => {
                    const originalColor: [number, number, number] = [r, g, b];
                    const [rShifted, gShifted, bShifted] = applyDopplerShift(originalColor, velocity, angle);

                    // For approaching material, blue component should increase (or stay at max)
                    // and red component should decrease (or stay at min)
                    expect(bShifted).toBeGreaterThanOrEqual(b - 0.01); // Allow small tolerance
                    expect(rShifted).toBeLessThanOrEqual(r + 0.01); // Allow small tolerance
                }
            ),
            { numRuns: 100 }
        );
    });

    test('receding material shifts toward red', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0, max: 1, noNaN: true }), // r
                fc.double({ min: 0, max: 1, noNaN: true }), // g
                fc.double({ min: 0, max: 1, noNaN: true }), // b
                fc.double({ min: -0.9, max: -0.1, noNaN: true }), // negative velocity (receding)
                fc.double({ min: 0, max: Math.PI / 4, noNaN: true }), // angle
                (r, g, b, velocity, angle) => {
                    const originalColor: [number, number, number] = [r, g, b];
                    const [rShifted, gShifted, bShifted] = applyDopplerShift(originalColor, velocity, angle);

                    // For receding material, red component should increase (or stay at max)
                    // and blue component should decrease (or stay at min)
                    expect(rShifted).toBeGreaterThanOrEqual(r - 0.01); // Allow small tolerance
                    expect(bShifted).toBeLessThanOrEqual(b + 0.01); // Allow small tolerance
                }
            ),
            { numRuns: 100 }
        );
    });

    test('zero velocity produces no shift', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0, max: 1, noNaN: true }), // r
                fc.double({ min: 0, max: 1, noNaN: true }), // g
                fc.double({ min: 0, max: 1, noNaN: true }), // b
                fc.double({ min: 0, max: Math.PI, noNaN: true }), // angle (any)
                (r, g, b, angle) => {
                    const originalColor: [number, number, number] = [r, g, b];
                    const [rShifted, gShifted, bShifted] = applyDopplerShift(originalColor, 0, angle);

                    // Zero velocity should produce no shift
                    expect(rShifted).toBeCloseTo(r, 10);
                    expect(gShifted).toBeCloseTo(g, 10);
                    expect(bShifted).toBeCloseTo(b, 10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('perpendicular motion produces no radial shift', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0, max: 1, noNaN: true }), // r
                fc.double({ min: 0, max: 1, noNaN: true }), // g
                fc.double({ min: 0, max: 1, noNaN: true }), // b
                fc.double({ min: -0.9, max: 0.9, noNaN: true }), // velocity (any)
                (r, g, b, velocity) => {
                    const originalColor: [number, number, number] = [r, g, b];
                    // Angle = π/2 means perpendicular motion (no radial component)
                    const [rShifted, gShifted, bShifted] = applyDopplerShift(originalColor, velocity, Math.PI / 2);

                    // Perpendicular motion should produce no shift
                    expect(rShifted).toBeCloseTo(r, 10);
                    expect(gShifted).toBeCloseTo(g, 10);
                    expect(bShifted).toBeCloseTo(b, 10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('output colors remain in valid range [0, 1]', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0, max: 1, noNaN: true }), // r
                fc.double({ min: 0, max: 1, noNaN: true }), // g
                fc.double({ min: 0, max: 1, noNaN: true }), // b
                fc.double({ min: -0.99, max: 0.99, noNaN: true }), // velocity
                fc.double({ min: 0, max: Math.PI, noNaN: true }), // angle
                (r, g, b, velocity, angle) => {
                    const originalColor: [number, number, number] = [r, g, b];
                    const [rShifted, gShifted, bShifted] = applyDopplerShift(originalColor, velocity, angle);

                    // All output components should remain in [0, 1]
                    expect(rShifted).toBeGreaterThanOrEqual(0);
                    expect(rShifted).toBeLessThanOrEqual(1);
                    expect(gShifted).toBeGreaterThanOrEqual(0);
                    expect(gShifted).toBeLessThanOrEqual(1);
                    expect(bShifted).toBeGreaterThanOrEqual(0);
                    expect(bShifted).toBeLessThanOrEqual(1);
                }
            ),
            { numRuns: 100 }
        );
    });
});
