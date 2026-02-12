import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { calculateInitialZoom } from "@/hooks/useCamera";

/**
 * Feature: ui-redesign, Property 1: Black hole visibility across viewports
 * Validates: Requirements 1.1, 1.2, 1.3
 */
describe("Camera Initial Zoom Dynamics", () => {
  test("should provide valid zoom for any dimension", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 3.0 }), // mass
        fc.integer({ min: 320, max: 3840 }), // width
        fc.integer({ min: 240, max: 2160 }), // height
        (mass, width, height) => {
          const zoom = calculateInitialZoom(mass, width, height);
          expect(zoom).toBeGreaterThanOrEqual(2.5);
          expect(zoom).toBeLessThanOrEqual(50.0);
        },
      ),
    );
  });
});
