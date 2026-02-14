/**
 * Hook for adaptive resolution management
 *
 * Integrates AdaptiveResolutionController with React state and animation loop
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { useRef, useEffect, useState } from "react";
import {
  AdaptiveResolutionController,
  DEFAULT_RESOLUTION_CONFIG,
} from "@/rendering/adaptive-resolution";
import type { ResolutionConfig } from "@/rendering/adaptive-resolution";

interface UseAdaptiveResolutionOptions {
  /** Whether adaptive resolution is enabled */
  enabled?: boolean;
  /** Custom resolution configuration */
  config?: Partial<ResolutionConfig>;
  /** Callback when resolution changes */
  onResolutionChange?: (scale: number) => void;
}

/**
 * Hook for managing adaptive resolution based on FPS
 *
 * @param currentFPS - Current frames per second
 * @param options - Configuration options
 * @returns Current resolution scale and controller methods
 */
export function useAdaptiveResolution(
  currentFPS: number,
  options: UseAdaptiveResolutionOptions = {},
) {
  const { enabled = true, config = {}, onResolutionChange } = options;

  // Create controller instance
  const controllerRef = useRef<AdaptiveResolutionController | null>(null);
  const lastUpdateTime = useRef<number>(0);
  const [resolutionScale, setResolutionScale] = useState(1.0);

  // Initialize controller
  useEffect(() => {
    const fullConfig = { ...DEFAULT_RESOLUTION_CONFIG, ...config, enabled };
    controllerRef.current = new AdaptiveResolutionController(fullConfig);
    lastUpdateTime.current = performance.now();

    return () => {
      controllerRef.current = null;
    };
  }, [config, enabled]);

  // Update resolution based on FPS
  useEffect(() => {
    if (!controllerRef.current) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - lastUpdateTime.current) / 1000; // Convert to seconds
    lastUpdateTime.current = currentTime;

    // Update controller with current FPS
    const newScale = controllerRef.current.update(currentFPS, deltaTime);

    // Only update state if scale changed significantly
    if (Math.abs(newScale - resolutionScale) > 0.001) {
      setResolutionScale(newScale);

      // Notify parent component
      if (onResolutionChange) {
        onResolutionChange(newScale);
      }
    }
  }, [currentFPS, resolutionScale, onResolutionChange]);

  // Methods to control the adaptive resolution
  const setEnabled = (enabled: boolean) => {
    if (controllerRef.current) {
      controllerRef.current.setEnabled(enabled);
      if (!enabled) {
        setResolutionScale(1.0);
      }
    }
  };

  const reset = () => {
    if (controllerRef.current) {
      controllerRef.current.reset();
      setResolutionScale(1.0);
    }
  };

  const updateConfig = (newConfig: Partial<ResolutionConfig>) => {
    if (controllerRef.current) {
      controllerRef.current.updateConfig(newConfig);
    }
  };

  return {
    resolutionScale,
    setEnabled,
    reset,
    updateConfig,
  };
}
