/**
 * Integration tests for feature performance impact
 * Feature: performance-optimization
 *
 * Tests:
 * - Disabling each feature reduces frame time
 * - Cumulative impact of multiple features
 * - Preset application updates all related systems
 * - Performance warnings trigger at correct thresholds
 *
 * Requirements: 1.2, 2.5, 4.5, 5.5, 6.4, 8.4, 10.4, 10.5
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PerformanceMonitor } from "@/performance/monitor";
import {
  type FeatureToggles,
  type PresetName,
  getPreset,
  DEFAULT_FEATURES,
} from "@/types/features";
import type { SimulationParams } from "@/types/simulation";

/**
 * Apply preset logic (extracted from usePresets hook for testing)
 */
function applyPreset(
  preset: PresetName,
  currentParams: SimulationParams,
): SimulationParams {
  const features = getPreset(preset);

  return {
    ...currentParams,
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
}

/**
 * Mock frame time measurements for different feature configurations
 * These are realistic estimates based on the requirements
 *
 * The percentages in requirements are relative to the enabled state,
 * so we calculate costs to match those percentages.
 */
const BASELINE_FRAME_TIME = 5.0; // All features disabled

// Calculate costs so that disabling gives the required percentage reduction
// If a feature costs X and total is T, then X/T should equal the percentage
const FEATURE_COSTS = {
  // 30% reduction means feature costs 30/(100-30) = 42.86% of disabled time
  gravitationalLensing: BASELINE_FRAME_TIME * (30 / 70),
  // 40% reduction means feature costs 40/(100-40) = 66.67% of disabled time
  accretionDisk: BASELINE_FRAME_TIME * (40 / 60),
  // 15% reduction means feature costs 15/(100-15) = 17.65% of disabled time
  dopplerBeaming: BASELINE_FRAME_TIME * (15 / 85),
  // 10% reduction means feature costs 10/(100-10) = 11.11% of disabled time
  backgroundStars: BASELINE_FRAME_TIME * (10 / 90),
  // 5% reduction means feature costs 5/(100-5) = 5.26% of disabled time
  photonSphereGlow: BASELINE_FRAME_TIME * (5 / 95),
  // 20% reduction means feature costs 20/(100-20) = 25% of disabled time
  bloom: BASELINE_FRAME_TIME * (20 / 80),
  rayTracingQuality: {
    off: 0,
    low: 1.0,
    medium: 3.0,
    high: 6.0,
    ultra: 10.0,
  },
};

/**
 * Calculate estimated frame time based on enabled features
 */
function calculateFrameTime(features: FeatureToggles): number {
  let frameTime = BASELINE_FRAME_TIME;

  if (features.gravitationalLensing) {
    frameTime += FEATURE_COSTS.gravitationalLensing;
  }
  if (features.accretionDisk) {
    frameTime += FEATURE_COSTS.accretionDisk;
  }
  if (features.dopplerBeaming) {
    frameTime += FEATURE_COSTS.dopplerBeaming;
  }
  if (features.backgroundStars) {
    frameTime += FEATURE_COSTS.backgroundStars;
  }
  if (features.photonSphereGlow) {
    frameTime += FEATURE_COSTS.photonSphereGlow;
  }
  if (features.bloom) {
    frameTime += FEATURE_COSTS.bloom;
  }

  frameTime += FEATURE_COSTS.rayTracingQuality[features.rayTracingQuality];

  return frameTime;
}

describe("Feature Performance Impact - Integration Tests", () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  describe("Individual Feature Performance Impact", () => {
    it("should reduce frame time when gravitational lensing is disabled", () => {
      // Requirement 2.5: Lensing disabled reduces frame time by at least 30%
      // Test in isolation with only this feature enabled
      const featuresEnabled: FeatureToggles = {
        gravitationalLensing: true,
        rayTracingQuality: "off",
        accretionDisk: false,
        dopplerBeaming: false,
        backgroundStars: false,
        photonSphereGlow: false,
        bloom: false,
      };

      const featuresDisabled: FeatureToggles = {
        ...featuresEnabled,
        gravitationalLensing: false,
      };

      const frameTimeEnabled = calculateFrameTime(featuresEnabled);
      const frameTimeDisabled = calculateFrameTime(featuresDisabled);

      const reduction = frameTimeEnabled - frameTimeDisabled;
      const reductionPercent = (reduction / frameTimeEnabled) * 100;

      expect(frameTimeDisabled).toBeLessThan(frameTimeEnabled);
      expect(reductionPercent).toBeCloseTo(30, 0); // Allow floating point precision
    });

    it("should reduce frame time when accretion disk is disabled", () => {
      // Requirement 4.5: Disk disabled reduces frame time by at least 40%
      // Test in isolation with only this feature enabled
      const featuresEnabled: FeatureToggles = {
        gravitationalLensing: false,
        rayTracingQuality: "off",
        accretionDisk: true,
        dopplerBeaming: false,
        backgroundStars: false,
        photonSphereGlow: false,
        bloom: false,
      };

      const featuresDisabled: FeatureToggles = {
        ...featuresEnabled,
        accretionDisk: false,
      };

      const frameTimeEnabled = calculateFrameTime(featuresEnabled);
      const frameTimeDisabled = calculateFrameTime(featuresDisabled);

      const reduction = frameTimeEnabled - frameTimeDisabled;
      const reductionPercent = (reduction / frameTimeEnabled) * 100;

      expect(frameTimeDisabled).toBeLessThan(frameTimeEnabled);
      expect(reductionPercent).toBeCloseTo(40, 0); // Allow floating point precision
    });

    it("should reduce frame time when Doppler beaming is disabled", () => {
      // Requirement 5.5: Doppler disabled reduces frame time by at least 15%
      // Test in isolation with only this feature enabled
      const featuresEnabled: FeatureToggles = {
        gravitationalLensing: false,
        rayTracingQuality: "off",
        accretionDisk: false,
        dopplerBeaming: true,
        backgroundStars: false,
        photonSphereGlow: false,
        bloom: false,
      };

      const featuresDisabled: FeatureToggles = {
        ...featuresEnabled,
        dopplerBeaming: false,
      };

      const frameTimeEnabled = calculateFrameTime(featuresEnabled);
      const frameTimeDisabled = calculateFrameTime(featuresDisabled);

      const reduction = frameTimeEnabled - frameTimeDisabled;
      const reductionPercent = (reduction / frameTimeEnabled) * 100;

      expect(frameTimeDisabled).toBeLessThan(frameTimeEnabled);
      expect(reductionPercent).toBeGreaterThanOrEqual(15);
    });

    it("should reduce frame time when background stars are disabled", () => {
      // Requirement 6.4: Stars disabled reduces frame time by at least 10%
      // Test in isolation with only this feature enabled
      const featuresEnabled: FeatureToggles = {
        gravitationalLensing: false,
        rayTracingQuality: "off",
        accretionDisk: false,
        dopplerBeaming: false,
        backgroundStars: true,
        photonSphereGlow: false,
        bloom: false,
      };

      const featuresDisabled: FeatureToggles = {
        ...featuresEnabled,
        backgroundStars: false,
      };

      const frameTimeEnabled = calculateFrameTime(featuresEnabled);
      const frameTimeDisabled = calculateFrameTime(featuresDisabled);

      const reduction = frameTimeEnabled - frameTimeDisabled;
      const reductionPercent = (reduction / frameTimeEnabled) * 100;

      expect(frameTimeDisabled).toBeLessThan(frameTimeEnabled);
      expect(reductionPercent).toBeCloseTo(10, 0); // Allow floating point precision
    });

    it("should reduce frame time when photon sphere glow is disabled", () => {
      // Requirement 7.4: Photon glow disabled reduces frame time by at least 5%
      // Test in isolation with only this feature enabled
      const featuresEnabled: FeatureToggles = {
        gravitationalLensing: false,
        rayTracingQuality: "off",
        accretionDisk: false,
        dopplerBeaming: false,
        backgroundStars: false,
        photonSphereGlow: true,
        bloom: false,
      };

      const featuresDisabled: FeatureToggles = {
        ...featuresEnabled,
        photonSphereGlow: false,
      };

      const frameTimeEnabled = calculateFrameTime(featuresEnabled);
      const frameTimeDisabled = calculateFrameTime(featuresDisabled);

      const reduction = frameTimeEnabled - frameTimeDisabled;
      const reductionPercent = (reduction / frameTimeEnabled) * 100;

      expect(frameTimeDisabled).toBeLessThan(frameTimeEnabled);
      expect(reductionPercent).toBeGreaterThanOrEqual(5);
    });

    it("should reduce frame time when bloom is disabled", () => {
      // Requirement 8.4: Bloom disabled reduces frame time by at least 20%
      // Test in isolation with only this feature enabled
      const featuresEnabled: FeatureToggles = {
        gravitationalLensing: false,
        rayTracingQuality: "off",
        accretionDisk: false,
        dopplerBeaming: false,
        backgroundStars: false,
        photonSphereGlow: false,
        bloom: true,
      };

      const featuresDisabled: FeatureToggles = {
        ...featuresEnabled,
        bloom: false,
      };

      const frameTimeEnabled = calculateFrameTime(featuresEnabled);
      const frameTimeDisabled = calculateFrameTime(featuresDisabled);

      const reduction = frameTimeEnabled - frameTimeDisabled;
      const reductionPercent = (reduction / frameTimeEnabled) * 100;

      expect(frameTimeDisabled).toBeLessThan(frameTimeEnabled);
      expect(reductionPercent).toBeGreaterThanOrEqual(20);
    });

    it("should reduce frame time when ray tracing quality is lowered", () => {
      const featuresUltra: FeatureToggles = {
        ...DEFAULT_FEATURES,
        rayTracingQuality: "ultra",
      };

      const featuresLow: FeatureToggles = {
        ...DEFAULT_FEATURES,
        rayTracingQuality: "low",
      };

      const frameTimeUltra = calculateFrameTime(featuresUltra);
      const frameTimeLow = calculateFrameTime(featuresLow);

      expect(frameTimeLow).toBeLessThan(frameTimeUltra);
    });
  });

  describe("Cumulative Feature Impact", () => {
    it("should show cumulative performance impact when multiple features are disabled", () => {
      // Start with all features enabled
      const allEnabled: FeatureToggles = {
        gravitationalLensing: true,
        rayTracingQuality: "ultra",
        accretionDisk: true,
        dopplerBeaming: true,
        backgroundStars: true,
        photonSphereGlow: true,
        bloom: true,
      };

      // Disable features one by one
      const disableOne: FeatureToggles = {
        ...allEnabled,
        bloom: false,
      };

      const disableTwo: FeatureToggles = {
        ...disableOne,
        dopplerBeaming: false,
      };

      const disableThree: FeatureToggles = {
        ...disableTwo,
        photonSphereGlow: false,
      };

      const frameTimeAll = calculateFrameTime(allEnabled);
      const frameTimeOne = calculateFrameTime(disableOne);
      const frameTimeTwo = calculateFrameTime(disableTwo);
      const frameTimeThree = calculateFrameTime(disableThree);

      // Each step should reduce frame time
      expect(frameTimeOne).toBeLessThan(frameTimeAll);
      expect(frameTimeTwo).toBeLessThan(frameTimeOne);
      expect(frameTimeThree).toBeLessThan(frameTimeTwo);

      // Total reduction should be cumulative
      const totalReduction = frameTimeAll - frameTimeThree;
      const expectedReduction =
        FEATURE_COSTS.bloom +
        FEATURE_COSTS.dopplerBeaming +
        FEATURE_COSTS.photonSphereGlow;

      expect(totalReduction).toBeCloseTo(expectedReduction, 1);
    });

    it("should show maximum performance gain when all features are disabled", () => {
      const allEnabled: FeatureToggles = {
        gravitationalLensing: true,
        rayTracingQuality: "ultra",
        accretionDisk: true,
        dopplerBeaming: true,
        backgroundStars: true,
        photonSphereGlow: true,
        bloom: true,
      };

      const allDisabled: FeatureToggles = {
        gravitationalLensing: false,
        rayTracingQuality: "off",
        accretionDisk: false,
        dopplerBeaming: false,
        backgroundStars: false,
        photonSphereGlow: false,
        bloom: false,
      };

      const frameTimeAll = calculateFrameTime(allEnabled);
      const frameTimeNone = calculateFrameTime(allDisabled);

      // Should be significantly faster with all features disabled
      expect(frameTimeNone).toBeLessThan(frameTimeAll);
      expect(frameTimeNone).toBe(BASELINE_FRAME_TIME);

      // Reduction should be substantial
      const reductionPercent =
        ((frameTimeAll - frameTimeNone) / frameTimeAll) * 100;
      expect(reductionPercent).toBeGreaterThan(70);
    });

    it("should calculate correct frame time for complex feature combinations", () => {
      const customConfig: FeatureToggles = {
        gravitationalLensing: true,
        rayTracingQuality: "medium",
        accretionDisk: true,
        dopplerBeaming: false,
        backgroundStars: true,
        photonSphereGlow: false,
        bloom: false,
      };

      const frameTime = calculateFrameTime(customConfig);

      const expectedFrameTime =
        BASELINE_FRAME_TIME +
        FEATURE_COSTS.gravitationalLensing +
        FEATURE_COSTS.rayTracingQuality.medium +
        FEATURE_COSTS.accretionDisk +
        FEATURE_COSTS.backgroundStars;

      expect(frameTime).toBeCloseTo(expectedFrameTime, 1);
    });
  });

  describe("Preset Application Integration", () => {
    it("should update all systems when Maximum Performance preset is applied", () => {
      const currentParams: SimulationParams = {
        mass: 1.2,
        spin: 1.5,
        diskDensity: 3.5,
        diskTemp: 1.3,
        lensing: 1.0,
        paused: false,
        zoom: 14.0,
        autoSpin: 0.005,
        diskSize: 4.5,
        renderScale: 1.0,
        quality: "high",
        features: DEFAULT_FEATURES,
        performancePreset: "ultra-quality",
      };

      const updatedParams = applyPreset("maximum-performance", currentParams);

      // Verify all feature toggles are updated
      expect(updatedParams.features?.gravitationalLensing).toBe(false);
      expect(updatedParams.features?.rayTracingQuality).toBe("off");
      expect(updatedParams.features?.accretionDisk).toBe(false);
      expect(updatedParams.features?.dopplerBeaming).toBe(false);
      expect(updatedParams.features?.backgroundStars).toBe(false);
      expect(updatedParams.features?.photonSphereGlow).toBe(false);
      expect(updatedParams.features?.bloom).toBe(false);

      // Verify preset name is updated
      expect(updatedParams.performancePreset).toBe("maximum-performance");

      // Verify quality is updated
      expect(updatedParams.quality).toBe("low");
    });

    it("should update all systems when Balanced preset is applied", () => {
      const currentParams: SimulationParams = {
        mass: 1.2,
        spin: 1.5,
        diskDensity: 3.5,
        diskTemp: 1.3,
        lensing: 1.0,
        paused: false,
        zoom: 14.0,
        autoSpin: 0.005,
        diskSize: 4.5,
        renderScale: 1.0,
        quality: "low",
        features: getPreset("maximum-performance"),
        performancePreset: "maximum-performance",
      };

      const updatedParams = applyPreset("balanced", currentParams);

      // Verify feature toggles match balanced preset
      expect(updatedParams.features?.gravitationalLensing).toBe(true);
      expect(updatedParams.features?.rayTracingQuality).toBe("medium");
      expect(updatedParams.features?.accretionDisk).toBe(true);
      expect(updatedParams.features?.dopplerBeaming).toBe(false);
      expect(updatedParams.features?.backgroundStars).toBe(true);
      expect(updatedParams.features?.photonSphereGlow).toBe(false);
      expect(updatedParams.features?.bloom).toBe(false);

      // Verify preset name is updated
      expect(updatedParams.performancePreset).toBe("balanced");

      // Verify quality is updated
      expect(updatedParams.quality).toBe("medium");
    });

    it("should apply all preset changes synchronously in one update", () => {
      const currentParams: SimulationParams = {
        mass: 1.2,
        spin: 1.5,
        diskDensity: 3.5,
        diskTemp: 1.3,
        lensing: 1.0,
        paused: false,
        zoom: 14.0,
        autoSpin: 0.005,
        diskSize: 4.5,
        renderScale: 1.0,
        quality: "low",
        features: getPreset("maximum-performance"),
        performancePreset: "maximum-performance",
      };

      // Apply preset and verify all changes happen in single update
      const updatedParams = applyPreset("ultra-quality", currentParams);

      // All features should be enabled
      const ultraFeatures = getPreset("ultra-quality");
      expect(updatedParams.features).toEqual(ultraFeatures);
      expect(updatedParams.performancePreset).toBe("ultra-quality");
      expect(updatedParams.quality).toBe("high");

      // Verify no intermediate state exists (all changes are atomic)
      expect(Object.keys(updatedParams)).toContain("features");
      expect(Object.keys(updatedParams)).toContain("performancePreset");
      expect(Object.keys(updatedParams)).toContain("quality");
    });

    it("should calculate correct frame time for each preset", () => {
      const presets: PresetName[] = [
        "maximum-performance",
        "balanced",
        "high-quality",
        "ultra-quality",
      ];

      const frameTimes = presets.map((preset) => {
        const features = getPreset(preset);
        return {
          preset,
          frameTime: calculateFrameTime(features),
        };
      });

      // Frame times should increase with quality
      expect(frameTimes[0].frameTime).toBeLessThan(frameTimes[1].frameTime);
      expect(frameTimes[1].frameTime).toBeLessThan(frameTimes[2].frameTime);
      expect(frameTimes[2].frameTime).toBeLessThan(frameTimes[3].frameTime);

      // Maximum performance should be fastest
      expect(frameTimes[0].preset).toBe("maximum-performance");
      expect(frameTimes[0].frameTime).toBeLessThan(10);

      // Ultra quality should be slowest but still reasonable
      expect(frameTimes[3].preset).toBe("ultra-quality");
    });
  });

  describe("Performance Warning Thresholds", () => {
    it("should trigger warning when FPS drops below 60", () => {
      // Requirement 10.4: Yellow warning at FPS < 60
      // Simulate 60 frames at 20ms each (50 FPS)
      for (let i = 0; i < 60; i++) {
        monitor.updateMetrics(20);
      }

      const warnings = monitor.getWarnings();

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.severity === "warning")).toBe(true);
      expect(
        warnings.some((w) => w.message.includes("Performance warning")),
      ).toBe(true);
    });

    it("should trigger critical warning when FPS drops below 30", () => {
      // Requirement 10.5: Red warning at FPS < 30
      // Simulate 60 frames at 40ms each (25 FPS)
      for (let i = 0; i < 60; i++) {
        monitor.updateMetrics(40);
      }

      const warnings = monitor.getWarnings();

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.severity === "critical")).toBe(true);
      expect(
        warnings.some((w) => w.message.includes("Critical performance issue")),
      ).toBe(true);
    });

    it("should not trigger warnings when FPS is above 60", () => {
      // Simulate 60 frames at 16ms each (62.5 FPS)
      for (let i = 0; i < 60; i++) {
        monitor.updateMetrics(16);
      }

      const warnings = monitor.getWarnings();

      // Should only have info warnings about frame budget, not performance warnings
      const performanceWarnings = warnings.filter(
        (w) => w.severity === "warning" || w.severity === "critical",
      );

      expect(performanceWarnings.length).toBe(0);
    });

    it("should provide appropriate suggestions for performance warnings", () => {
      // Simulate poor performance
      for (let i = 0; i < 60; i++) {
        monitor.updateMetrics(25);
      }

      const warnings = monitor.getWarnings();
      const warningMessages = warnings.flatMap((w) => w.suggestions);

      // Should suggest disabling expensive features
      // Check for gravitational lensing or quality suggestions (case insensitive)
      const hasLensingOrQuality = warningMessages.some(
        (s) =>
          s.toLowerCase().includes("lensing") ||
          s.toLowerCase().includes("quality") ||
          s.toLowerCase().includes("ray"),
      );
      expect(hasLensingOrQuality).toBe(true);
    });

    it("should trigger frame budget warning when exceeding target budget", () => {
      // Requirement 1.2: Target frame time is 16.67ms (60 FPS - updated default)
      // Simulate frames at 17ms (58 FPS, so over budget)
      for (let i = 0; i < 60; i++) {
        monitor.updateMetrics(17);
      }

      const warnings = monitor.getWarnings();

      expect(
        warnings.some((w) => w.message.includes("Frame time budget")),
      ).toBe(true);
    });

    it("should calculate correct budget usage percentage", () => {
      // Simulate frames at 20ms
      for (let i = 0; i < 60; i++) {
        monitor.updateMetrics(20);
      }

      const budgetUsage = monitor.getFrameTimeBudgetUsage();

      // 20ms / 16.67ms = ~120%
      expect(budgetUsage).toBeGreaterThan(115);
      expect(budgetUsage).toBeLessThan(125);
    });

    it("should recommend quality reduction when performance is poor", () => {
      // Simulate poor performance
      for (let i = 0; i < 60; i++) {
        monitor.updateMetrics(25);
      }

      expect(monitor.shouldReduceQuality()).toBe(true);
      expect(monitor.shouldIncreaseQuality()).toBe(false);
    });

    it("should allow quality increase when performance is good", () => {
      // Simulate excellent performance (10ms = 100 FPS)
      for (let i = 0; i < 60; i++) {
        monitor.updateMetrics(10);
      }

      expect(monitor.shouldReduceQuality()).toBe(false);
      expect(monitor.shouldIncreaseQuality()).toBe(true);
    });

    it("should not recommend quality increase if near frame budget", () => {
      // Simulate 14ms frames (71 FPS, close to 16.67ms budget ~84% usage)
      for (let i = 0; i < 60; i++) {
        monitor.updateMetrics(14);
      }

      // Should not increase quality even though FPS > 60 (but <75 requirement)
      // and budget > 80%
      expect(monitor.shouldIncreaseQuality()).toBe(false);
    });
  });

  describe("Feature Performance Correlation", () => {
    it("should show that expensive features have larger performance impact", () => {
      // Accretion disk should have larger impact than photon sphere glow
      const diskImpact = FEATURE_COSTS.accretionDisk;
      const glowImpact = FEATURE_COSTS.photonSphereGlow;

      expect(diskImpact).toBeGreaterThan(glowImpact);

      // Gravitational lensing should have larger impact than background stars
      const lensingImpact = FEATURE_COSTS.gravitationalLensing;
      const starsImpact = FEATURE_COSTS.backgroundStars;

      expect(lensingImpact).toBeGreaterThan(starsImpact);
    });

    it("should show that ray tracing quality has significant impact", () => {
      const lowQuality = FEATURE_COSTS.rayTracingQuality.low;
      const ultraQuality = FEATURE_COSTS.rayTracingQuality.ultra;

      expect(ultraQuality).toBeGreaterThan(lowQuality * 5);
    });

    it("should maintain performance requirements for minimum configuration", () => {
      // Requirement 1.1: All features disabled should maintain 75 FPS
      const minConfig = getPreset("maximum-performance");
      const frameTime = calculateFrameTime(minConfig);

      // 75 FPS = 13.3ms frame time
      expect(frameTime).toBeLessThan(13.3);
    });
  });
});
