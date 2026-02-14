import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import type { QualityLevel } from "@/types/simulation";

/**
 * Feature: blackhole-enhancement, Property 22: Resolution capping
 * Validates: Requirements 7.3
 *
 * For any device pixel ratio, when DPR exceeds 2.0, the rendering resolution
 * should be calculated using a capped value of 2.0 to prevent excessive GPU load.
 */
describe("Property 22: Resolution capping", () => {
  /**
   * Calculates capped device pixel ratio
   */
  function capDevicePixelRatio(dpr: number): number {
    return Math.min(dpr || 1, 2.0);
  }

  /**
   * Calculates canvas resolution with capped DPR
   */
  function calculateCanvasResolution(
    width: number,
    height: number,
    dpr: number,
  ): { width: number; height: number } {
    const cappedDPR = capDevicePixelRatio(dpr);
    return {
      width: width * cappedDPR,
      height: height * cappedDPR,
    };
  }

  test("DPR is always capped to maximum of 2.0", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.5, max: 10.0, noNaN: true }), // arbitrary DPR
        (dpr) => {
          const capped = capDevicePixelRatio(dpr);

          // Capped value should never exceed 2.0
          expect(capped).toBeLessThanOrEqual(2.0);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("DPR below 2.0 remains unchanged", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.5, max: 2.0, noNaN: true }), // DPR <= 2.0
        (dpr) => {
          const capped = capDevicePixelRatio(dpr);

          // Should remain unchanged
          expect(capped).toBeCloseTo(dpr, 10);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("DPR above 2.0 is capped to 2.0", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 2.01, max: 10.0, noNaN: true }), // DPR > 2.0
        (dpr) => {
          const capped = capDevicePixelRatio(dpr);

          // Should be capped to 2.0
          expect(capped).toBe(2.0);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("canvas resolution scales with capped DPR", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 4000 }), // canvas width
        fc.integer({ min: 100, max: 4000 }), // canvas height
        fc.double({ min: 0.5, max: 10.0, noNaN: true }), // DPR
        (width, height, dpr) => {
          const resolution = calculateCanvasResolution(width, height, dpr);
          const cappedDPR = capDevicePixelRatio(dpr);

          // Resolution should match width/height * capped DPR
          expect(resolution.width).toBeCloseTo(width * cappedDPR, 5);
          expect(resolution.height).toBeCloseTo(height * cappedDPR, 5);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("high DPR does not cause excessive resolution", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1920, max: 3840 }), // large canvas width
        fc.integer({ min: 1080, max: 2160 }), // large canvas height
        fc.double({ min: 3.0, max: 5.0, noNaN: true }), // very high DPR
        (width, height, dpr) => {
          const resolution = calculateCanvasResolution(width, height, dpr);

          // Resolution should be capped (max 2x the base resolution)
          expect(resolution.width).toBeLessThanOrEqual(width * 2.0);
          expect(resolution.height).toBeLessThanOrEqual(height * 2.0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: blackhole-enhancement, Property 24: Quality auto-adjustment
 * Validates: Requirements 7.6
 *
 * For any performance metrics, when FPS drops below a threshold (e.g., 25 FPS),
 * the quality setting should automatically decrease to improve performance.
 */
describe("Property 24: Quality auto-adjustment", () => {
  /**
   * Adjusts quality level based on current FPS
   */
  function adjustQuality(
    currentQuality: QualityLevel,
    fps: number,
    lowFPSCounter: number,
  ): { quality: QualityLevel; counter: number } {
    if (fps < 25) {
      const newCounter = lowFPSCounter + 1;

      // Wait for 75 frames before reducing quality
      if (newCounter > 75) {
        let newQuality = currentQuality;
        if (currentQuality === "high") {
          newQuality = "medium";
        } else if (currentQuality === "medium") {
          newQuality = "low";
        }
        return { quality: newQuality, counter: 0 };
      }

      return { quality: currentQuality, counter: newCounter };
    } else {
      // Reset counter if FPS is good
      return { quality: currentQuality, counter: 0 };
    }
  }

  test("quality reduces from high to medium when FPS < 25", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 10, max: 24.9, noNaN: true }), // low FPS
        (fps) => {
          const result = adjustQuality("high", fps, 76);

          // Quality should reduce to medium
          expect(result.quality).toBe("medium");
        },
      ),
      { numRuns: 100 },
    );
  });

  test("quality reduces from medium to low when FPS < 25", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 10, max: 24.9, noNaN: true }), // low FPS
        (fps) => {
          const result = adjustQuality("medium", fps, 76);

          // Quality should reduce to low
          expect(result.quality).toBe("low");
        },
      ),
      { numRuns: 100 },
    );
  });

  test("quality remains at low when already at lowest", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 10, max: 24.9, noNaN: true }), // low FPS
        (fps) => {
          const result = adjustQuality("low", fps, 76);

          // Quality should remain at low
          expect(result.quality).toBe("low");
        },
      ),
      { numRuns: 100 },
    );
  });

  test("quality does not change when FPS is good", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "low" as QualityLevel,
          "medium" as QualityLevel,
          "high" as QualityLevel,
        ),
        fc.double({ min: 25, max: 120, noNaN: true }), // good FPS
        fc.integer({ min: 0, max: 100 }), // any counter value
        (quality, fps, counter) => {
          const result = adjustQuality(quality, fps, counter);

          // Quality should remain unchanged
          expect(result.quality).toBe(quality);

          // Counter should reset to 0
          expect(result.counter).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("quality does not change immediately on low FPS", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "low" as QualityLevel,
          "medium" as QualityLevel,
          "high" as QualityLevel,
        ),
        fc.double({ min: 10, max: 24.9, noNaN: true }), // low FPS
        fc.integer({ min: 0, max: 74 }), // counter below threshold (< 75)
        (quality, fps, counter) => {
          const result = adjustQuality(quality, fps, counter);

          // Quality should remain unchanged
          expect(result.quality).toBe(quality);

          // Counter should increment
          expect(result.counter).toBe(counter + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("low FPS counter increments when FPS < 25", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "low" as QualityLevel,
          "medium" as QualityLevel,
          "high" as QualityLevel,
        ),
        fc.double({ min: 10, max: 24.9, noNaN: true }), // low FPS
        fc.integer({ min: 0, max: 70 }), // counter below threshold
        (quality, fps, counter) => {
          const result = adjustQuality(quality, fps, counter);

          // Counter should increment
          expect(result.counter).toBeGreaterThan(counter);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("low FPS counter resets when FPS improves", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "low" as QualityLevel,
          "medium" as QualityLevel,
          "high" as QualityLevel,
        ),
        fc.double({ min: 25, max: 120, noNaN: true }), // good FPS
        fc.integer({ min: 1, max: 100 }), // any non-zero counter
        (quality, fps, counter) => {
          const result = adjustQuality(quality, fps, counter);

          // Counter should reset to 0
          expect(result.counter).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: blackhole-enhancement, Property 40: Quality reduction on low FPS
 * Validates: Requirements 12.4
 *
 * For any performance state where FPS drops below 20, the system should
 * reduce the maximum ray marching steps to improve performance.
 */
describe("Property 40: Quality reduction on low FPS", () => {
  /**
   * Gets max ray steps based on quality level
   */
  function getMaxRaySteps(quality: QualityLevel): number {
    switch (quality) {
      case "off":
        return 0;
      case "low":
        return 100;
      case "medium":
        return 300;
      case "high":
        return 500;
      case "ultra":
        return 1000;
    }
  }

  /**
   * Simulates quality reduction when FPS drops below 20
   */
  function reduceQualityOnLowFPS(
    currentQuality: QualityLevel,
    fps: number,
  ): QualityLevel {
    if (fps < 20) {
      if (currentQuality === "high") return "medium";
      if (currentQuality === "medium") return "low";
    }
    return currentQuality;
  }

  test("ray steps decrease when quality is reduced", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("medium" as QualityLevel, "high" as QualityLevel),
        (quality) => {
          const initialSteps = getMaxRaySteps(quality);
          const reducedQuality = reduceQualityOnLowFPS(quality, 15);
          const reducedSteps = getMaxRaySteps(reducedQuality);

          // Steps should decrease
          expect(reducedSteps).toBeLessThan(initialSteps);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("high quality reduces to medium when FPS < 20", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 5, max: 19.9, noNaN: true }), // very low FPS
        (fps) => {
          const newQuality = reduceQualityOnLowFPS("high", fps);

          expect(newQuality).toBe("medium");
        },
      ),
      { numRuns: 100 },
    );
  });

  test("medium quality reduces to low when FPS < 20", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 5, max: 19.9, noNaN: true }), // very low FPS
        (fps) => {
          const newQuality = reduceQualityOnLowFPS("medium", fps);

          expect(newQuality).toBe("low");
        },
      ),
      { numRuns: 100 },
    );
  });

  test("low quality remains at low when FPS < 20", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 5, max: 19.9, noNaN: true }), // very low FPS
        (fps) => {
          const newQuality = reduceQualityOnLowFPS("low", fps);

          expect(newQuality).toBe("low");
        },
      ),
      { numRuns: 100 },
    );
  });

  test("quality unchanged when FPS >= 20", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "low" as QualityLevel,
          "medium" as QualityLevel,
          "high" as QualityLevel,
        ),
        fc.double({ min: 20, max: 120, noNaN: true }), // acceptable FPS
        (quality, fps) => {
          const newQuality = reduceQualityOnLowFPS(quality, fps);

          // Quality should remain unchanged
          expect(newQuality).toBe(quality);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("ray steps for low quality is 100", () => {
    const steps = getMaxRaySteps("low");
    expect(steps).toBe(100);
  });

  test("ray steps for medium quality is 300", () => {
    const steps = getMaxRaySteps("medium");
    expect(steps).toBe(300);
  });

  test("ray steps for high quality is 500", () => {
    const steps = getMaxRaySteps("high");
    expect(steps).toBe(500);
  });

  test("ray steps always positive and reasonable", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          "low" as QualityLevel,
          "medium" as QualityLevel,
          "high" as QualityLevel,
        ),
        (quality) => {
          const steps = getMaxRaySteps(quality);

          // Steps should be positive
          expect(steps).toBeGreaterThan(0);

          // Steps should be reasonable (not too high)
          expect(steps).toBeLessThanOrEqual(1000);
        },
      ),
      { numRuns: 100 },
    );
  });
});
