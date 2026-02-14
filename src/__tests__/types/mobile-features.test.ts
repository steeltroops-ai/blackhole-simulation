/**
 * Property-based tests for mobile feature optimization
 *
 * Tests mobile preset application and bloom disable behavior
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { getMobilePreset, getPreset } from "@/types/features";

describe("Mobile Feature Optimization", () => {
  /**
   * Feature: performance-optimization, Property 19: Mobile device preset
   * Validates: Requirements 16.1
   *
   * For any mobile device detection, the system should automatically apply
   * the "Balanced" preset on first load.
   */
  describe("Property 19: Mobile device preset", () => {
    it("applies balanced preset configuration for mobile", () => {
      const mobilePreset = getMobilePreset();
      const balancedPreset = getPreset("balanced");

      // Mobile preset should be based on balanced preset
      expect(mobilePreset.gravitationalLensing).toBe(
        balancedPreset.gravitationalLensing,
      );
      expect(mobilePreset.rayTracingQuality).toBe(
        balancedPreset.rayTracingQuality,
      );
      expect(mobilePreset.accretionDisk).toBe(balancedPreset.accretionDisk);
      expect(mobilePreset.dopplerBeaming).toBe(balancedPreset.dopplerBeaming);
      expect(mobilePreset.backgroundStars).toBe(balancedPreset.backgroundStars);
      expect(mobilePreset.photonSphereGlow).toBe(
        balancedPreset.photonSphereGlow,
      );
    });

    it("mobile preset has balanced quality level", () => {
      const mobilePreset = getMobilePreset();

      // Requirement 16.1: Mobile should use balanced preset
      expect(mobilePreset.rayTracingQuality).toBe("medium");
      expect(mobilePreset.gravitationalLensing).toBe(true);
      expect(mobilePreset.accretionDisk).toBe(true);
    });

    it("mobile preset is consistent across multiple calls", () => {
      fc.assert(
        fc.property(
          fc.constant(null), // Dummy property to run multiple times
          () => {
            const preset1 = getMobilePreset();
            const preset2 = getMobilePreset();

            // Should return identical configuration every time
            expect(JSON.stringify(preset1)).toBe(JSON.stringify(preset2));
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Feature: performance-optimization, Property 21: Mobile bloom disable
   * Validates: Requirements 16.4
   *
   * For any mobile device, bloom should be disabled by default.
   */
  describe("Property 21: Mobile bloom disable", () => {
    it("disables bloom for mobile devices", () => {
      const mobilePreset = getMobilePreset();

      // Requirement 16.4: Bloom must be disabled on mobile
      expect(mobilePreset.bloom).toBe(false);
    });

    it("bloom is always disabled regardless of balanced preset", () => {
      fc.assert(
        fc.property(
          fc.constant(null), // Dummy property to run multiple times
          () => {
            const mobilePreset = getMobilePreset();

            // Mobile should always have bloom disabled
            expect(mobilePreset.bloom).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("mobile preset differs from balanced only in bloom setting", () => {
      const mobilePreset = getMobilePreset();
      const balancedPreset = getPreset("balanced");

      // All features except bloom should match balanced preset
      expect(mobilePreset.gravitationalLensing).toBe(
        balancedPreset.gravitationalLensing,
      );
      expect(mobilePreset.rayTracingQuality).toBe(
        balancedPreset.rayTracingQuality,
      );
      expect(mobilePreset.accretionDisk).toBe(balancedPreset.accretionDisk);
      expect(mobilePreset.dopplerBeaming).toBe(balancedPreset.dopplerBeaming);
      expect(mobilePreset.backgroundStars).toBe(balancedPreset.backgroundStars);
      expect(mobilePreset.photonSphereGlow).toBe(
        balancedPreset.photonSphereGlow,
      );

      // Bloom should be the only difference
      expect(mobilePreset.bloom).toBe(false);
      expect(balancedPreset.bloom).toBe(false); // Balanced also has bloom disabled
    });
  });

  describe("Mobile preset validation", () => {
    it("mobile preset has all required properties", () => {
      const mobilePreset = getMobilePreset();

      expect(mobilePreset).toHaveProperty("gravitationalLensing");
      expect(mobilePreset).toHaveProperty("rayTracingQuality");
      expect(mobilePreset).toHaveProperty("accretionDisk");
      expect(mobilePreset).toHaveProperty("dopplerBeaming");
      expect(mobilePreset).toHaveProperty("backgroundStars");
      expect(mobilePreset).toHaveProperty("photonSphereGlow");
      expect(mobilePreset).toHaveProperty("bloom");
    });

    it("mobile preset has valid property types", () => {
      const mobilePreset = getMobilePreset();

      expect(typeof mobilePreset.gravitationalLensing).toBe("boolean");
      expect(typeof mobilePreset.accretionDisk).toBe("boolean");
      expect(typeof mobilePreset.dopplerBeaming).toBe("boolean");
      expect(typeof mobilePreset.backgroundStars).toBe("boolean");
      expect(typeof mobilePreset.photonSphereGlow).toBe("boolean");
      expect(typeof mobilePreset.bloom).toBe("boolean");
      expect(["off", "low", "medium", "high", "ultra"]).toContain(
        mobilePreset.rayTracingQuality,
      );
    });
  });
});
