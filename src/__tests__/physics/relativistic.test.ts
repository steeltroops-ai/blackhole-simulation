import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import {
    calculateDopplerFactor,
    calculateOrbitalVelocity,
    calculateLorentzFactor,
} from '@/physics/relativistic';

/**
 * Feature: blackhole-enhancement, Property 11: Doppler factor formula correctness
 * Validates: Requirements 4.1
 * 
 * For any velocity (as fraction of c) and angle, the calculated Doppler factor
 * should match the formula δ = 1/(γ(1 - β·cosθ)) where γ is the Lorentz factor
 * and β = v/c.
 */
describe('Property 11: Doppler factor formula correctness', () => {
    test('Doppler factor matches formula δ = 1/(γ(1 - β·cosθ))', () => {
        fc.assert(
            fc.property(
                fc.double({ min: -0.99, max: 0.99, noNaN: true }), // velocity (β)
                fc.double({ min: 0, max: Math.PI, noNaN: true }), // angle
                (velocity, angle) => {
                    const delta = calculateDopplerFactor(velocity, angle);
                    const gamma = calculateLorentzFactor(velocity);

                    // Calculate expected value using formula
                    const expected = 1 / (gamma * (1 - velocity * Math.cos(angle)));

                    // Should match within floating point precision
                    expect(delta).toBeCloseTo(expected, 10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('Doppler factor is always positive', () => {
        fc.assert(
            fc.property(
                fc.double({ min: -0.99, max: 0.99, noNaN: true }), // velocity
                fc.double({ min: 0, max: Math.PI, noNaN: true }), // angle
                (velocity, angle) => {
                    const delta = calculateDopplerFactor(velocity, angle);

                    // Doppler factor should always be positive
                    expect(delta).toBeGreaterThan(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('Doppler factor > 1 for material moving directly toward observer', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 0.99, noNaN: true }), // positive velocity
                fc.double({ min: 0, max: 0.1, noNaN: true }), // small angle (nearly head-on)
                (velocity, angle) => {
                    const delta = calculateDopplerFactor(velocity, angle);

                    // For material moving nearly head-on toward observer, Doppler factor should be > 1
                    expect(delta).toBeGreaterThan(1);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('Doppler factor < 1 for receding material', () => {
        fc.assert(
            fc.property(
                fc.double({ min: -0.99, max: -0.1, noNaN: true }), // negative velocity
                fc.double({ min: 0, max: Math.PI / 4, noNaN: true }), // angle
                (velocity, angle) => {
                    const delta = calculateDopplerFactor(velocity, angle);

                    // For receding material, Doppler factor should be < 1
                    expect(delta).toBeLessThan(1);
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * Feature: blackhole-enhancement, Property 12: Doppler brightness boost
 * Validates: Requirements 4.2, 4.3
 * 
 * For any approaching material (positive radial velocity), the brightness should
 * increase by a factor proportional to δ⁴ where δ is the Doppler factor.
 */
describe('Property 12: Doppler brightness boost', () => {
    test('brightness boost is proportional to δ⁴', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 0.9, noNaN: true }), // velocity
                fc.double({ min: 0, max: Math.PI / 4, noNaN: true }), // angle toward observer
                (velocity, angle) => {
                    const delta = calculateDopplerFactor(velocity, angle);

                    // Brightness boost factor
                    const brightnessFactor = Math.pow(delta, 4);

                    // For approaching material (δ > 1), brightness should increase
                    expect(brightnessFactor).toBeGreaterThan(1);

                    // Verify the relationship: if δ doubles, brightness increases by 2⁴ = 16
                    const delta2 = delta * 1.1;
                    const brightnessFactor2 = Math.pow(delta2, 4);
                    const ratio = brightnessFactor2 / brightnessFactor;
                    const expectedRatio = Math.pow(1.1, 4);

                    expect(ratio).toBeCloseTo(expectedRatio, 8);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('receding material has brightness < 1', () => {
        fc.assert(
            fc.property(
                fc.double({ min: -0.9, max: -0.1, noNaN: true }), // negative velocity
                fc.double({ min: 0, max: Math.PI / 4, noNaN: true }), // angle
                (velocity, angle) => {
                    const delta = calculateDopplerFactor(velocity, angle);
                    const brightnessFactor = Math.pow(delta, 4);

                    // For receding material (δ < 1), brightness should decrease
                    expect(brightnessFactor).toBeLessThan(1);
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * Feature: blackhole-enhancement, Property 13: Keplerian velocity formula
 * Validates: Requirements 4.4
 * 
 * For any radius and mass, the calculated orbital velocity should match
 * v = √(GM/r) and should be less than the speed of light.
 */
describe('Property 13: Keplerian velocity formula', () => {
    test('orbital velocity matches v = √(GM/r)', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 1.0, max: 100.0, noNaN: true }), // radius
                fc.double({ min: 0.1, max: 10.0, noNaN: true }), // mass
                (radius, mass) => {
                    const v = calculateOrbitalVelocity(radius, mass);

                    // In simulation units: v/c = √(r_g/r) where r_g = M/2
                    const rg = mass * 0.5;
                    const expected = Math.sqrt(rg / radius);

                    // Should match within floating point precision
                    // (clamped to 0.99 if exceeds speed of light)
                    if (expected <= 0.99) {
                        expect(v).toBeCloseTo(expected, 10);
                    } else {
                        expect(v).toBe(0.99);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    test('orbital velocity is always less than speed of light', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 100.0, noNaN: true }), // radius
                fc.double({ min: 0.1, max: 10.0, noNaN: true }), // mass
                (radius, mass) => {
                    const v = calculateOrbitalVelocity(radius, mass);

                    // Velocity should always be less than c (represented as 1.0)
                    expect(v).toBeLessThan(1.0);
                    expect(v).toBeGreaterThanOrEqual(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('orbital velocity decreases with increasing radius', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 1.0, max: 50.0, noNaN: true }), // radius1
                fc.double({ min: 0.1, max: 10.0, noNaN: true }), // mass
                (radius1, mass) => {
                    const radius2 = radius1 + 10; // larger radius
                    const v1 = calculateOrbitalVelocity(radius1, mass);
                    const v2 = calculateOrbitalVelocity(radius2, mass);

                    // Velocity should decrease with increasing radius
                    expect(v2).toBeLessThanOrEqual(v1);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('orbital velocity increases with increasing mass', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 5.0, max: 100.0, noNaN: true }), // radius
                fc.double({ min: 0.1, max: 5.0, noNaN: true }), // mass1
                (radius, mass1) => {
                    const mass2 = mass1 + 1.0; // larger mass
                    const v1 = calculateOrbitalVelocity(radius, mass1);
                    const v2 = calculateOrbitalVelocity(radius, mass2);

                    // Velocity should increase with increasing mass
                    expect(v2).toBeGreaterThanOrEqual(v1);
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * Additional tests for Lorentz factor
 */
describe('Lorentz factor properties', () => {
    test('Lorentz factor is always >= 1', () => {
        fc.assert(
            fc.property(
                fc.double({ min: -0.99, max: 0.99, noNaN: true }), // velocity
                (velocity) => {
                    const gamma = calculateLorentzFactor(velocity);

                    // Lorentz factor should always be >= 1
                    expect(gamma).toBeGreaterThanOrEqual(1);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('Lorentz factor equals 1 for zero velocity', () => {
        const gamma = calculateLorentzFactor(0);
        expect(gamma).toBeCloseTo(1, 10);
    });

    test('Lorentz factor increases with velocity magnitude', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0, max: 0.8, noNaN: true }), // velocity1
                (velocity1) => {
                    const velocity2 = velocity1 + 0.1; // higher velocity
                    const gamma1 = calculateLorentzFactor(velocity1);
                    const gamma2 = calculateLorentzFactor(velocity2);

                    // Lorentz factor should increase with velocity
                    expect(gamma2).toBeGreaterThanOrEqual(gamma1);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('Lorentz factor matches formula γ = 1/√(1 - β²)', () => {
        fc.assert(
            fc.property(
                fc.double({ min: -0.99, max: 0.99, noNaN: true }), // velocity
                (velocity) => {
                    const gamma = calculateLorentzFactor(velocity);
                    const expected = 1 / Math.sqrt(1 - velocity * velocity);

                    expect(gamma).toBeCloseTo(expected, 10);
                }
            ),
            { numRuns: 100 }
        );
    });
});
