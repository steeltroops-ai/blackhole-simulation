import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateEventHorizon,
  calculatePhotonSphere,
  calculateISCO,
  calculateTimeDilation,
} from "@/physics/kerr-metric";

/**
 * Feature: blackhole-enhancement, Property 1: Event horizon calculation correctness
 * Validates: Requirements 1.2
 *
 * For any valid mass and spin parameters, the calculated event horizon radius should:
 * 1. Always be positive
 * 2. Be less than or equal to the Schwarzschild radius (non-rotating case)
 * 3. Satisfy the Kerr metric formula
 */
describe("Property 1: Event horizon calculation correctness", () => {
  test("event horizon is always positive and less than or equal to Schwarzschild radius", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 10.0, noNaN: true }), // mass
        fc.double({ min: -1.0, max: 1.0, noNaN: true }), // spin
        (mass, spin) => {
          const rh = calculateEventHorizon(mass, spin);
          const rs = 2.0 * mass; // Schwarzschild radius = 2M in geometric units

          // Event horizon should be positive
          expect(rh).toBeGreaterThan(0);

          // Event horizon should be less than or equal to Schwarzschild radius
          // (equality holds for non-rotating black hole)
          expect(rh).toBeLessThanOrEqual(rs + 1e-10); // Add small tolerance for floating point
        },
      ),
      { numRuns: 100 },
    );
  });

  test("event horizon equals Schwarzschild radius for zero spin", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 10.0, noNaN: true }), // mass
        (mass) => {
          const rh = calculateEventHorizon(mass, 0);
          const rs = 2.0 * mass; // Schwarzschild radius = 2M in geometric units

          // For zero spin, event horizon should equal Schwarzschild radius
          expect(rh).toBeCloseTo(rs, 8);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("event horizon decreases with increasing spin magnitude", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 10.0, noNaN: true }), // mass
        fc.double({ min: 0.0, max: 0.9, noNaN: true }), // spin1
        (mass, spin1) => {
          const spin2 = spin1 + 0.1; // slightly higher spin
          const rh1 = calculateEventHorizon(mass, spin1);
          const rh2 = calculateEventHorizon(mass, spin2);

          // Higher spin should result in smaller event horizon
          expect(rh2).toBeLessThanOrEqual(rh1 + 1e-10); // Add small tolerance
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: blackhole-enhancement, Property 2: Photon sphere ordering
 * Validates: Requirements 1.3
 *
 * For any black hole configuration, the photon sphere radius should always be:
 * 1. Greater than the event horizon radius
 * 2. Less than the ISCO radius
 */
describe("Property 2: Photon sphere ordering", () => {
  test("photon sphere is always between event horizon and ISCO for moderate spin", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 10.0, noNaN: true }), // mass
        fc.double({ min: 0.0, max: 0.9, noNaN: true }), // spin (exclude extreme values near 1.0)
        (mass, spin) => {
          const rh = calculateEventHorizon(mass, spin);
          const rPhoton = calculatePhotonSphere(mass, spin);
          const rIscoPrograde = calculateISCO(mass, spin, true);

          // Photon sphere should be greater than event horizon
          expect(rPhoton).toBeGreaterThan(rh);

          // Photon sphere should be less than ISCO (prograde)
          // For moderate spin values, photon sphere is between event horizon and ISCO
          // At extreme spin (near 1.0), ISCO approaches event horizon and can be inside photon sphere
          expect(rPhoton).toBeLessThan(rIscoPrograde);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("photon sphere is approximately 1.5x Schwarzschild radius for zero spin", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 10.0, noNaN: true }), // mass
        (mass) => {
          const rs = 2.0 * mass; // Schwarzschild radius = 2M
          const rPhoton = calculatePhotonSphere(mass, 0);

          // For zero spin, photon sphere should be 1.5 * Schwarzschild radius
          expect(rPhoton).toBeCloseTo(1.5 * rs, 8);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: blackhole-enhancement, Property 3: ISCO spin dependency
 * Validates: Requirements 1.4
 *
 * For any mass and spin value, the prograde ISCO radius should be less than
 * or equal to the retrograde ISCO radius for the same black hole.
 */
describe("Property 3: ISCO spin dependency", () => {
  test("prograde ISCO is always less than or equal to retrograde ISCO", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 10.0, noNaN: true }), // mass
        fc.double({ min: -1.0, max: 1.0, noNaN: true }), // spin
        (mass, spin) => {
          const rIscoPrograde = calculateISCO(mass, spin, true);
          const rIscoRetrograde = calculateISCO(mass, spin, false);

          // Prograde ISCO should be closer to black hole (smaller radius)
          expect(rIscoPrograde).toBeLessThanOrEqual(rIscoRetrograde + 1e-10);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("ISCO equals 6M for zero spin regardless of orbit direction", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 10.0, noNaN: true }), // mass
        (mass) => {
          const rIscoPrograde = calculateISCO(mass, 0, true);
          const rIscoRetrograde = calculateISCO(mass, 0, false);
          const expected = mass * 6.0; // ISCO = 6M for non-rotating black hole

          // Both should equal 6M for non-rotating black hole
          expect(rIscoPrograde).toBeCloseTo(expected, 8);
          expect(rIscoRetrograde).toBeCloseTo(expected, 8);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("ISCO is always greater than or equal to event horizon", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 10.0, noNaN: true }), // mass
        fc.double({ min: -0.99, max: 0.99, noNaN: true }), // spin (exclude extreme ±1.0)
        fc.boolean(), // prograde
        (mass, spin, prograde) => {
          const rh = calculateEventHorizon(mass, spin);
          const rIsco = calculateISCO(mass, spin, prograde);

          // ISCO should always be at or outside the event horizon
          // At extreme spin (|a|=1), ISCO can equal event horizon for prograde orbits
          expect(rIsco).toBeGreaterThan(rh);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: blackhole-enhancement, Property 4: Time dilation bounds
 * Validates: Requirements 1.5
 *
 * For any radius greater than the Schwarzschild radius, the time dilation factor should be:
 * 1. Between 0 and 1
 * 2. Approaching 0 as radius approaches the event horizon
 * 3. Approaching 1 as radius approaches infinity
 */
describe("Property 4: Time dilation bounds", () => {
  test("time dilation factor is always between 0 and 1 for valid radii", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 10.0, noNaN: true }), // mass
        fc.double({ min: 1.1, max: 100.0, noNaN: true }), // radius multiplier (> 1 to be outside event horizon)
        (mass, radiusMultiplier) => {
          const rs = 2.0 * mass; // Schwarzschild radius = 2M
          const radius = rs * radiusMultiplier;
          const factor = calculateTimeDilation(radius, mass);

          // Time dilation factor should be in [0, 1]
          expect(factor).toBeGreaterThanOrEqual(0);
          expect(factor).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("time dilation approaches 0 near event horizon", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 10.0, noNaN: true }), // mass
        (mass) => {
          const rs = 2.0 * mass; // Schwarzschild radius = 2M
          // Test at radius just slightly above event horizon
          const radius = rs * 1.001;
          const factor = calculateTimeDilation(radius, mass);

          // Should be very close to 0
          expect(factor).toBeLessThan(0.05);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("time dilation approaches 1 at large distances", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 10.0, noNaN: true }), // mass
        (mass) => {
          const rs = 2.0 * mass; // Schwarzschild radius = 2M
          // Test at radius far from black hole
          const radius = rs * 1000;
          const factor = calculateTimeDilation(radius, mass);

          // Should be very close to 1
          expect(factor).toBeGreaterThan(0.999);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("time dilation is 0 at or inside event horizon", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 10.0, noNaN: true }), // mass
        fc.double({ min: 0.1, max: 1.0, noNaN: true }), // radius multiplier (< 1 to be inside event horizon)
        (mass, radiusMultiplier) => {
          const rs = 2.0 * mass; // Schwarzschild radius = 2M
          const radius = rs * radiusMultiplier;
          const factor = calculateTimeDilation(radius, mass);

          // Time effectively stops at or inside event horizon
          expect(factor).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("time dilation increases monotonically with radius", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 10.0, noNaN: true }), // mass
        fc.double({ min: 1.1, max: 50.0, noNaN: true }), // radius1 multiplier
        (mass, r1Mult) => {
          const rs = 2.0 * mass; // Schwarzschild radius = 2M
          const r2Mult = r1Mult + 1.0; // r2 > r1
          const radius1 = rs * r1Mult;
          const radius2 = rs * r2Mult;

          const factor1 = calculateTimeDilation(radius1, mass);
          const factor2 = calculateTimeDilation(radius2, mass);

          // Time dilation should increase with radius (time flows faster farther away)
          expect(factor2).toBeGreaterThanOrEqual(factor1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
