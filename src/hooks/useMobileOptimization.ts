/**
 * useMobileOptimization Hook
 *
 * Manages mobile-specific performance optimizations including:
 * - Automatic balanced preset application
 * - Ray step capping at 100
 * - Bloom disabled by default
 *
 * Requirements: 16.1, 16.3, 16.4
 */

import { useMemo } from "react";
import { isMobileDevice, getMobileRayStepCap } from "@/utils/device-detection";
import { type FeatureToggles, DEFAULT_FEATURES } from "@/types/features";

interface MobileOptimizationConfig {
  isMobile: boolean;
  getMobileFeatures: () => FeatureToggles;
  applyMobileRayStepCap: (requestedSteps: number) => number;
}

/**
 * Hook for managing mobile-specific optimizations
 *
 * @returns Mobile optimization configuration and utilities
 */
export const useMobileOptimization = (): MobileOptimizationConfig => {
  // Detect if device is mobile (memoized to avoid repeated checks)
  const isMobile = useMemo(() => isMobileDevice(), []);

  /**
   * Get mobile-optimized feature configuration
   *
   * Requirements:
   * - 16.1: Apply "Balanced" preset on mobile
   * - 16.4: Disable bloom by default on mobile
   *
   * @returns Feature toggles optimized for mobile
   */
  const getMobileFeatures = (): FeatureToggles => {
    // Use the global default configuration as the source of truth
    const baseFeatures = { ...DEFAULT_FEATURES };

    if (!isMobile) {
      return baseFeatures;
    }

    // Apply mobile-specific overrides on top of the default config
    // Requirements: 16.3 (Ray step cap handled elsewhere), 16.4 (No Bloom)
    return {
      ...baseFeatures,
      bloom: false,
      // Downgrade ray tracing quality if it's set to 'ultra' which is too heavy for mobile
      rayTracingQuality:
        baseFeatures.rayTracingQuality === "ultra"
          ? "high"
          : baseFeatures.rayTracingQuality,
    };
  };

  /**
   * Apply mobile ray step cap
   *
   * Requirements: 16.3 - Cap at 100 steps on mobile
   *
   * @param requestedSteps - The requested number of ray steps
   * @returns Capped ray steps for mobile devices
   */
  const applyMobileRayStepCap = (requestedSteps: number): number => {
    return getMobileRayStepCap(requestedSteps, isMobile);
  };

  // Log mobile detection on mount (for debugging)
  // useEffect(() => {
  //   if (isMobile) {
  //     console.log("Mobile device detected - applying mobile optimizations");
  //   }
  // }, [isMobile]);

  return {
    isMobile,
    getMobileFeatures,
    applyMobileRayStepCap,
  };
};
