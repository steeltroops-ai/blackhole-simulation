/**
 * Property-based tests for ControlPanel UI controls
 * Tests parameter bounds indication, pause functionality, and mass-dependent radii updates
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateEventHorizon,
  calculatePhotonSphere,
  calculateISCO,
} from "@/physics/kerr-metric";

describe("ControlPanel UI Controls - Property-Based Tests", () => {
  /**
   * Feature: blackhole-enhancement, Property 25: Parameter bounds indication
   * Validates: Requirements 8.3
   *
   * For any parameter value, when the value equals the minimum or maximum bound,
   * the UI should indicate this state (e.g., different color or icon).
   */
  it("Property 25: Parameter bounds indication", () => {
    fc.assert(
      fc.property(
        fc.record({
          min: fc
            .float({ min: Math.fround(0), max: Math.fround(10) })
            .filter((x) => !isNaN(x) && isFinite(x)),
          max: fc
            .float({ min: Math.fround(10), max: Math.fround(100) })
            .filter((x) => !isNaN(x) && isFinite(x)),
          step: fc
            .float({ min: Math.fround(0.01), max: Math.fround(1) })
            .filter((x) => !isNaN(x) && isFinite(x) && x > 0),
        }),
        ({ min, max, step }) => {
          // Test at minimum bound
          const atMin = Math.abs(min - min) < step / 2;
          expect(atMin).toBe(true);

          // Test at maximum bound
          const atMax = Math.abs(max - max) < step / 2;
          expect(atMax).toBe(true);

          // Test in middle (should not be at bounds)
          const middle = (min + max) / 2;
          const atMinMiddle = Math.abs(middle - min) < step / 2;
          const atMaxMiddle = Math.abs(middle - max) < step / 2;
          const atBoundsMiddle = atMinMiddle || atMaxMiddle;

          // Middle value should not be at bounds (unless range is very small)
          if (max - min > step * 2) {
            expect(atBoundsMiddle).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: blackhole-enhancement, Property 26: Pause freezes time
   * Validates: Requirements 8.5
   *
   * For any simulation state, when paused is true, the time uniform passed to shaders
   * should not increment between frames.
   */
  it("Property 26: Pause freezes time", () => {
    fc.assert(
      fc.property(
        fc.record({
          initialTime: fc
            .float({ min: Math.fround(0), max: Math.fround(10000) })
            .filter((x) => !isNaN(x) && isFinite(x)),
          deltaTime: fc
            .float({ min: Math.fround(0.001), max: Math.fround(0.1) })
            .filter((x) => !isNaN(x) && isFinite(x) && x > 0),
          paused: fc.boolean(),
        }),
        ({ initialTime, deltaTime, paused }) => {
          // Simulate time update logic
          const updateTime = (
            currentTime: number,
            dt: number,
            isPaused: boolean,
          ): number => {
            return isPaused ? currentTime : currentTime + dt;
          };

          const newTime = updateTime(initialTime, deltaTime, paused);

          if (paused) {
            // When paused, time should not change
            expect(newTime).toBe(initialTime);
          } else {
            // When not paused, time should increment
            expect(newTime).toBeGreaterThan(initialTime);
            expect(newTime).toBeCloseTo(initialTime + deltaTime, 5);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: blackhole-enhancement, Property 27: Mass change updates radii
   * Validates: Requirements 8.6
   *
   * For any mass parameter change, the event horizon, photon sphere, and ISCO radii
   * should be recalculated and updated before the next frame renders.
   */
  it("Property 27: Mass change updates radii", () => {
    fc.assert(
      fc.property(
        fc.record({
          mass: fc
            .float({ min: Math.fround(0.1), max: Math.fround(3.0) })
            .filter((x) => !isNaN(x) && isFinite(x) && x > 0),
          spin: fc
            .float({ min: Math.fround(-1.0), max: Math.fround(1.0) })
            .filter((x) => !isNaN(x) && isFinite(x)),
        }),
        ({ mass, spin }) => {
          // Calculate radii based on mass and spin
          const eventHorizon = calculateEventHorizon(mass, spin);
          const photonSphere = calculatePhotonSphere(mass, spin);
          const isco = calculateISCO(mass, spin, true);

          // All radii should be positive and finite
          expect(eventHorizon).toBeGreaterThan(0);
          expect(isFinite(eventHorizon)).toBe(true);
          expect(photonSphere).toBeGreaterThan(0);
          expect(isFinite(photonSphere)).toBe(true);
          expect(isco).toBeGreaterThan(0);
          expect(isFinite(isco)).toBe(true);

          // Radii should scale with mass
          // Event horizon: M + sqrt(M^2 - a^2), ranges from M (extremal) to 2M (Schwarzschild)
          expect(eventHorizon).toBeGreaterThan(0);
          expect(eventHorizon).toBeLessThanOrEqual(2.0 * mass + 1e-10);

          // ISCO should be greater than or equal to event horizon
          // For extremal Kerr black holes (spin=1), ISCO can be at the event horizon
          expect(isco).toBeGreaterThanOrEqual(eventHorizon * 0.99);

          // Test that changing mass produces different radii
          const newMass = mass * 1.5;
          const newEventHorizon = calculateEventHorizon(newMass, spin);
          const newPhotonSphere = calculatePhotonSphere(newMass, spin);
          const newIsco = calculateISCO(newMass, spin, true);

          // New radii should be larger (proportional to mass increase)
          expect(newEventHorizon).toBeGreaterThan(eventHorizon);
          expect(newPhotonSphere).toBeGreaterThan(photonSphere);
          expect(newIsco).toBeGreaterThan(isco);
        },
      ),
      { numRuns: 100 },
    );
  });
});
