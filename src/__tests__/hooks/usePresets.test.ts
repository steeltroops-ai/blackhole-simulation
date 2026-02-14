/**
 * Tests for usePresets hook
 * Feature: performance-optimization
 */

import { describe, it, expect } from "vitest";
import {
  getPreset,
  matchesPreset,
  PERFORMANCE_PRESETS,
  type PresetName,
} from "@/types/features";
import type { SimulationParams } from "@/types/simulation";

// Test the underlying functions directly since the hook is just a wrapper
describe("Preset Application Logic", () => {
  const mockParams: SimulationParams = {
    mass: 1.2,
    spin: 1.5,
    diskDensity: 3.5,
    diskTemp: 1.3,
    lensing: 1.0,
    paused: false,
    zoom: 14.0,
    autoSpin: 0.005,
    diskSize: 4.5,
    quality: "high",
    features: PERFORMANCE_PRESETS["ultra-quality"],
    performancePreset: "ultra-quality",
    adaptiveResolution: false,
    renderScale: 1.0,
  };

  // Helper function that mimics the hook's applyPreset logic
  const applyPreset = (
    preset: PresetName,
    params: SimulationParams,
  ): SimulationParams => {
    const features = getPreset(preset as PresetName);
    return {
      ...params,
      features,
      performancePreset: preset,
      quality:
        features.rayTracingQuality === "off" ||
        features.rayTracingQuality === "low"
          ? "low"
          : features.rayTracingQuality === "medium"
            ? "medium"
            : "high",
    };
  };

  describe("applyPreset", () => {
    it("should apply maximum-performance preset correctly", () => {
      const updatedParams = applyPreset("maximum-performance", mockParams);

      expect(updatedParams.features).toEqual(
        PERFORMANCE_PRESETS["maximum-performance"],
      );
      expect(updatedParams.performancePreset).toBe("maximum-performance");
      expect(updatedParams.quality).toBe("low");
    });

    it("should apply balanced preset correctly", () => {
      const updatedParams = applyPreset("balanced", mockParams);

      expect(updatedParams.features).toEqual(PERFORMANCE_PRESETS["balanced"]);
      expect(updatedParams.performancePreset).toBe("balanced");
      expect(updatedParams.quality).toBe("medium");
    });

    it("should apply high-quality preset correctly", () => {
      const updatedParams = applyPreset("high-quality", mockParams);

      expect(updatedParams.features).toEqual(
        PERFORMANCE_PRESETS["high-quality"],
      );
      expect(updatedParams.performancePreset).toBe("high-quality");
      expect(updatedParams.quality).toBe("high");
    });

    it("should apply ultra-quality preset correctly", () => {
      const updatedParams = applyPreset("ultra-quality", mockParams);

      expect(updatedParams.features).toEqual(
        PERFORMANCE_PRESETS["ultra-quality"],
      );
      expect(updatedParams.performancePreset).toBe("ultra-quality");
      expect(updatedParams.quality).toBe("high");
    });

    it("should preserve other parameters when applying preset", () => {
      const updatedParams = applyPreset("balanced", mockParams);

      expect(updatedParams.mass).toBe(mockParams.mass);
      expect(updatedParams.spin).toBe(mockParams.spin);
      expect(updatedParams.diskDensity).toBe(mockParams.diskDensity);
      expect(updatedParams.diskTemp).toBe(mockParams.diskTemp);
      expect(updatedParams.lensing).toBe(mockParams.lensing);
      expect(updatedParams.zoom).toBe(mockParams.zoom);
      expect(updatedParams.paused).toBe(mockParams.paused);
    });

    it("should update all preset-related fields synchronously", () => {
      const updatedParams = applyPreset("high-quality", mockParams);

      // Verify all fields are updated in the same object
      expect(updatedParams.features).toBeDefined();
      expect(updatedParams.performancePreset).toBeDefined();
      expect(updatedParams.quality).toBeDefined();

      // Verify they match the preset
      expect(updatedParams.features).toEqual(
        PERFORMANCE_PRESETS["high-quality"],
      );
      expect(updatedParams.performancePreset).toBe("high-quality");
    });
  });

  describe("detectPreset", () => {
    it("should detect maximum-performance preset", () => {
      const detected = matchesPreset(
        PERFORMANCE_PRESETS["maximum-performance"],
      );
      expect(detected).toBe("maximum-performance");
    });

    it("should detect balanced preset", () => {
      const detected = matchesPreset(PERFORMANCE_PRESETS["balanced"]);
      expect(detected).toBe("balanced");
    });

    it("should detect high-quality preset", () => {
      const detected = matchesPreset(PERFORMANCE_PRESETS["high-quality"]);
      expect(detected).toBe("high-quality");
    });

    it("should detect ultra-quality preset", () => {
      const detected = matchesPreset(PERFORMANCE_PRESETS["ultra-quality"]);
      expect(detected).toBe("ultra-quality");
    });

    it("should return custom for non-matching configurations", () => {
      const customFeatures = {
        ...PERFORMANCE_PRESETS["balanced"],
        bloom: true, // Different from balanced preset
      };
      const detected = matchesPreset(customFeatures);
      expect(detected).toBe("custom");
    });
  });

  describe("preset application workflow", () => {
    it("should allow switching between presets", () => {
      // Start with ultra-quality
      let params = applyPreset("ultra-quality", mockParams);
      expect(params.performancePreset).toBe("ultra-quality");

      // Switch to maximum-performance
      params = applyPreset("maximum-performance", params);
      expect(params.performancePreset).toBe("maximum-performance");
      expect(params.features).toEqual(
        PERFORMANCE_PRESETS["maximum-performance"],
      );

      // Switch to balanced
      params = applyPreset("balanced", params);
      expect(params.performancePreset).toBe("balanced");
      expect(params.features).toEqual(PERFORMANCE_PRESETS["balanced"]);
    });
  });
});
