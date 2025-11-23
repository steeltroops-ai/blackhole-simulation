import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import {
    solarMassToKg,
    kgToSolarMass,
    schwarzschildRadiiToMeters,
    metersToSchwarzschildRadii,
    schwarzschildRadiiToKm,
    kmToSchwarzschildRadii,
    msToSpeedOfLight,
    speedOfLightToMs,
    kelvinToKelvin,
    formatMass,
    formatDistance,
    formatTemperature,
    formatVelocity,
} from '@/utils/unit-conversion';

/**
 * Feature: blackhole-enhancement, Property 41: Unit conversion round trip
 * Validates: Requirements 13.5
 * 
 * For any value in simulation units, converting to physical units and back to simulation units
 * should return the original value (within floating-point precision).
 */
describe('Property 41: Unit conversion round trip', () => {
    test('mass conversion round trip: solar masses -> kg -> solar masses', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 1000.0, noNaN: true, noDefaultInfinity: true }), // mass in solar masses
                (massInSolarMasses) => {
                    const massInKg = solarMassToKg(massInSolarMasses);
                    const roundTrip = kgToSolarMass(massInKg);

                    // Should return to original value within floating-point precision
                    expect(roundTrip).toBeCloseTo(massInSolarMasses, 10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('distance conversion round trip: Schwarzschild radii -> meters -> Schwarzschild radii', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 1000.0, noNaN: true, noDefaultInfinity: true }), // distance in Rs
                fc.double({ min: 0.1, max: 100.0, noNaN: true, noDefaultInfinity: true }), // mass in solar masses
                (distanceInRs, massInSolarMasses) => {
                    const distanceInMeters = schwarzschildRadiiToMeters(distanceInRs, massInSolarMasses);
                    const roundTrip = metersToSchwarzschildRadii(distanceInMeters, massInSolarMasses);

                    // Should return to original value within floating-point precision
                    expect(roundTrip).toBeCloseTo(distanceInRs, 10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('distance conversion round trip: Schwarzschild radii -> km -> Schwarzschild radii', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 1000.0, noNaN: true, noDefaultInfinity: true }), // distance in Rs
                fc.double({ min: 0.1, max: 100.0, noNaN: true, noDefaultInfinity: true }), // mass in solar masses
                (distanceInRs, massInSolarMasses) => {
                    const distanceInKm = schwarzschildRadiiToKm(distanceInRs, massInSolarMasses);
                    const roundTrip = kmToSchwarzschildRadii(distanceInKm, massInSolarMasses);

                    // Should return to original value within floating-point precision
                    expect(roundTrip).toBeCloseTo(distanceInRs, 10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('velocity conversion round trip: fraction of c -> m/s -> fraction of c', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.0, max: 0.999, noNaN: true, noDefaultInfinity: true }), // velocity as fraction of c
                (velocityInC) => {
                    const velocityInMs = speedOfLightToMs(velocityInC);
                    const roundTrip = msToSpeedOfLight(velocityInMs);

                    // Should return to original value within floating-point precision
                    expect(roundTrip).toBeCloseTo(velocityInC, 10);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('temperature conversion round trip (identity function)', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 1000.0, max: 100000.0, noNaN: true, noDefaultInfinity: true }), // temperature in K
                (tempK) => {
                    const roundTrip = kelvinToKelvin(tempK);

                    // Should be exactly the same (identity function)
                    expect(roundTrip).toBe(tempK);
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * Additional unit tests for dimensional consistency
 */
describe('Unit conversion dimensional consistency', () => {
    test('mass conversions maintain positive values', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 1000.0, noNaN: true, noDefaultInfinity: true }),
                (massInSolarMasses) => {
                    const massInKg = solarMassToKg(massInSolarMasses);
                    expect(massInKg).toBeGreaterThan(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('distance conversions maintain positive values', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 1000.0, noNaN: true, noDefaultInfinity: true }),
                fc.double({ min: 0.1, max: 100.0, noNaN: true, noDefaultInfinity: true }),
                (distanceInRs, massInSolarMasses) => {
                    const distanceInMeters = schwarzschildRadiiToMeters(distanceInRs, massInSolarMasses);
                    const distanceInKm = schwarzschildRadiiToKm(distanceInRs, massInSolarMasses);

                    expect(distanceInMeters).toBeGreaterThan(0);
                    expect(distanceInKm).toBeGreaterThan(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('velocity conversions maintain non-negative values', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.0, max: 0.999, noNaN: true, noDefaultInfinity: true }),
                (velocityInC) => {
                    const velocityInMs = speedOfLightToMs(velocityInC);
                    expect(velocityInMs).toBeGreaterThanOrEqual(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    test('km to meters conversion is consistent (1 km = 1000 m)', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.1, max: 1000.0, noNaN: true, noDefaultInfinity: true }),
                fc.double({ min: 0.1, max: 100.0, noNaN: true, noDefaultInfinity: true }),
                (distanceInRs, massInSolarMasses) => {
                    const distanceInMeters = schwarzschildRadiiToMeters(distanceInRs, massInSolarMasses);
                    const distanceInKm = schwarzschildRadiiToKm(distanceInRs, massInSolarMasses);

                    // 1 km should equal 1000 m
                    expect(distanceInKm * 1000).toBeCloseTo(distanceInMeters, 5);
                }
            ),
            { numRuns: 100 }
        );
    });
});

/**
 * Unit tests for formatting functions
 */
describe('Unit formatting functions', () => {
    test('formatMass includes M☉ symbol', () => {
        const formatted = formatMass(5.5);
        expect(formatted).toContain('M☉');
        expect(formatted).toContain('5.50');
    });

    test('formatDistance uses Rs for small distances', () => {
        const formatted = formatDistance(10.5, 1.0);
        expect(formatted).toContain('Rs');
        expect(formatted).toContain('10.50');
    });

    test('formatDistance uses km for large distances', () => {
        const formatted = formatDistance(1500, 1.0);
        expect(formatted).toContain('km');
        expect(formatted).not.toContain('Rs');
    });

    test('formatTemperature includes K symbol', () => {
        const formatted = formatTemperature(10000);
        expect(formatted).toContain('K');
        expect(formatted).toContain('10000');
    });

    test('formatVelocity includes c symbol', () => {
        const formatted = formatVelocity(0.5);
        expect(formatted).toContain('c');
        expect(formatted).toContain('0.500');
    });

    test('formatting functions handle edge cases', () => {
        expect(formatMass(0.1, 1)).toContain('0.1');
        expect(formatDistance(0.1, 1.0, 3)).toContain('0.100');
        expect(formatTemperature(0, 0)).toContain('0');
        expect(formatVelocity(0, 2)).toContain('0.00');
    });
});
