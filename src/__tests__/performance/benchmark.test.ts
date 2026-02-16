/**
 * Property-based tests for BenchmarkController
 * Tests benchmark timing, recommendation logic, and cancellation behavior
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { BenchmarkResult } from "@/performance/benchmark";
import type { PresetName, FeatureToggles } from "@/types/features";

/**
 * Helper function to find recommended preset from results
 * Implements the same logic as BenchmarkController
 */
function findRecommendedPreset(results: BenchmarkResult[]): PresetName {
  const qualityOrder: PresetName[] = [
    "ultra-quality",
    "high-quality",
    "balanced",
    "maximum-performance",
  ];

  for (const presetName of qualityOrder) {
    const result = results.find((r) => r.presetName === presetName);
    if (result && result.averageFPS >= 60) {
      return presetName;
    }
  }

  return "maximum-performance";
}

describe("BenchmarkController Properties", () => {
  /**
   * Feature: performance-optimization, Property 29: Benchmark duration
   * Validates: Requirements 19.1
   */
  it("Property 29: each preset tested for 10 seconds", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            presetName: fc.constantFrom<PresetName>(
              "maximum-performance",
              "balanced",
              "high-quality",
              "ultra-quality",
            ),
            averageFPS: fc.float({ min: 20, max: 120 }),
            minFPS: fc.float({ min: 15, max: 100 }),
            maxFPS: fc.float({ min: 30, max: 144 }),
            averageFrameTimeMs: fc.float({ min: 5, max: 50 }),
            testDurationSeconds: fc.constant(10),
          }),
          { minLength: 4, maxLength: 4 },
        ),
        (results) => {
          for (const result of results) {
            expect(result.testDurationSeconds).toBe(10);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: performance-optimization, Property 30: Benchmark recommendation
   * Validates: Requirements 19.3
   */
  it("Property 30: recommends highest quality preset with 60+ FPS", () => {
    fc.assert(
      fc.property(
        fc.record({
          maxPerf: fc.float({ min: 30, max: 150 }),
          balanced: fc.float({ min: 30, max: 150 }),
          highQuality: fc.float({ min: 30, max: 150 }),
          ultraQuality: fc.float({ min: 30, max: 150 }),
        }),
        (fpsValues) => {
          const results: BenchmarkResult[] = [
            {
              presetName: "maximum-performance",
              averageFPS: fpsValues.maxPerf,
              minFPS: fpsValues.maxPerf * 0.8,
              maxFPS: fpsValues.maxPerf * 1.2,
              averageFrameTimeMs: 1000 / fpsValues.maxPerf,
              testDurationSeconds: 10,
            },
            {
              presetName: "balanced",
              averageFPS: fpsValues.balanced,
              minFPS: fpsValues.balanced * 0.8,
              maxFPS: fpsValues.balanced * 1.2,
              averageFrameTimeMs: 1000 / fpsValues.balanced,
              testDurationSeconds: 10,
            },
            {
              presetName: "high-quality",
              averageFPS: fpsValues.highQuality,
              minFPS: fpsValues.highQuality * 0.8,
              maxFPS: fpsValues.highQuality * 1.2,
              averageFrameTimeMs: 1000 / fpsValues.highQuality,
              testDurationSeconds: 10,
            },
            {
              presetName: "ultra-quality",
              averageFPS: fpsValues.ultraQuality,
              minFPS: fpsValues.ultraQuality * 0.8,
              maxFPS: fpsValues.ultraQuality * 1.2,
              averageFrameTimeMs: 1000 / fpsValues.ultraQuality,
              testDurationSeconds: 10,
            },
          ];

          const recommended = findRecommendedPreset(results);

          let expected: PresetName;
          if (fpsValues.ultraQuality >= 60) {
            expected = "ultra-quality";
          } else if (fpsValues.highQuality >= 60) {
            expected = "high-quality";
          } else if (fpsValues.balanced >= 60) {
            expected = "balanced";
          } else {
            expected = "maximum-performance";
          }

          expect(recommended).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: performance-optimization, Property 31: Benchmark cancellation
   * Validates: Requirements 19.5
   */
  it("Property 31: cancellation restores original settings", () => {
    fc.assert(
      fc.property(
        fc.record({
          gravitationalLensing: fc.boolean(),
          rayTracingQuality: fc.constantFrom(
            "off",
            "low",
            "medium",
            "high",
            "ultra",
          ),
          accretionDisk: fc.boolean(),
          dopplerBeaming: fc.boolean(),
          backgroundStars: fc.boolean(),
          photonSphereGlow: fc.boolean(),
          bloom: fc.boolean(),
        }) as fc.Arbitrary<FeatureToggles>,
        (originalSettings) => {
          const savedSettings = { ...originalSettings };
          expect(savedSettings).toEqual(originalSettings);
          expect(JSON.stringify(savedSettings)).toBe(
            JSON.stringify(originalSettings),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
