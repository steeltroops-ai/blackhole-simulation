/**
 * usePresets Hook
 * Manages performance preset application and feature toggle synchronization
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { useCallback } from "react";
import {
  getPreset,
  matchesPreset,
  type PresetName,
  type FeatureToggles,
} from "@/types/features";
import type { SimulationParams } from "@/types/simulation";

interface UsePresetsReturn {
  applyPreset: (
    preset: PresetName,
    currentParams: SimulationParams,
  ) => SimulationParams;
  detectPreset: (features: FeatureToggles) => PresetName;
}

/**
 * Hook for managing performance presets
 *
 * Provides functions to apply presets and detect current preset from features
 */
export const usePresets = (): UsePresetsReturn => {
  /**
   * Apply a performance preset to simulation parameters
   *
   * Requirements: 9.6 - All settings updated in same state update cycle
   *
   * @param preset - The preset to apply
   * @param currentParams - Current simulation parameters
   * @returns Updated simulation parameters with preset applied
   */
  const applyPreset = useCallback(
    (preset: PresetName, currentParams: SimulationParams): SimulationParams => {
      // Get the feature configuration for this preset
      const features = getPreset(preset);

      // Return updated params with all settings changed synchronously
      // This ensures Property 7: Preset application synchronicity
      return {
        ...currentParams,
        features,
        performancePreset: preset,
      };
    },
    [],
  );

  /**
   * Detect which preset matches the current feature configuration
   *
   * @param features - Current feature toggles
   * @returns The matching preset name or 'custom'
   */
  const detectPreset = useCallback((features: FeatureToggles): PresetName => {
    return matchesPreset(features);
  }, []);

  return {
    applyPreset,
    detectPreset,
  };
};
