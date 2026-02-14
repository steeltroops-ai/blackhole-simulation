/**
 * Feature toggle definitions for performance optimization.
 */
import { SIMULATION_CONFIG } from "@/configs/simulation.config";
import { PERFORMANCE_CONFIG } from "@/configs/performance.config";

/**
 * Lensing quality levels:
 * - off: Analytic Hologram (LOD 0, no ray marching)
 * - low/medium: Geometric Approximation (LOD 1, limited steps)
 * - high/ultra: Relativistic Simulation (LOD 2, full GR)
 */
export type RayTracingQuality = "off" | "low" | "medium" | "high" | "ultra";

export interface FeatureToggles {
  gravitationalLensing: boolean;
  rayTracingQuality: RayTracingQuality;
  accretionDisk: boolean;
  dopplerBeaming: boolean;
  backgroundStars: boolean;
  photonSphereGlow: boolean;
  bloom: boolean;
  relativisticJets: boolean;
  gravitationalRedshift: boolean;
  kerrShadow: boolean;
}

export type PresetName =
  | "maximum-performance"
  | "balanced"
  | "high-quality"
  | "ultra-quality"
  | "custom";

export interface PerformancePreset {
  name: PresetName;
  features: FeatureToggles;
}

export interface FeaturePerformanceCost {
  featureName: keyof FeatureToggles;
  estimatedFrameTimeMs: number;
  actualFrameTimeMs?: number;
}

export const DEFAULT_FEATURES: FeatureToggles =
  SIMULATION_CONFIG.features.default;

export function getMaxRaySteps(
  quality: RayTracingQuality,
  isMobile: boolean = false,
): number {
  const steps = SIMULATION_CONFIG.rayTracingSteps[quality] ?? 250;
  if (isMobile) {
    return Math.min(steps, PERFORMANCE_CONFIG.compute.maxStepsMobile);
  }
  return steps;
}

export function validateFeatureToggles(
  features: unknown,
): features is FeatureToggles {
  if (!features || typeof features !== "object") {
    return false;
  }

  const f = features as Record<string, unknown>;

  const requiredBooleans: (keyof FeatureToggles)[] = [
    "gravitationalLensing",
    "accretionDisk",
    "dopplerBeaming",
    "backgroundStars",
    "photonSphereGlow",
    "bloom",
    "relativisticJets",
    "gravitationalRedshift",
    "kerrShadow",
  ];

  for (const key of requiredBooleans) {
    if (typeof f[key] !== "boolean") {
      return false;
    }
  }

  const validQualities: RayTracingQuality[] = [
    "off",
    "low",
    "medium",
    "high",
    "ultra",
  ];
  if (!validQualities.includes(f.rayTracingQuality as RayTracingQuality)) {
    return false;
  }

  return true;
}

export const PERFORMANCE_PRESETS: Record<PresetName, FeatureToggles> = {
  ...SIMULATION_CONFIG.presets,
  custom: DEFAULT_FEATURES,
};

/**
 * Get preset by name
 */
export function getPreset(name: PresetName): FeatureToggles {
  return { ...PERFORMANCE_PRESETS[name] };
}

export function matchesPreset(features: FeatureToggles): PresetName {
  const presetNames: PresetName[] = [
    "maximum-performance",
    "balanced",
    "high-quality",
    "ultra-quality",
  ];

  for (const presetName of presetNames) {
    const p = PERFORMANCE_PRESETS[presetName];
    if (
      features.gravitationalLensing === p.gravitationalLensing &&
      features.rayTracingQuality === p.rayTracingQuality &&
      features.accretionDisk === p.accretionDisk &&
      features.dopplerBeaming === p.dopplerBeaming &&
      features.backgroundStars === p.backgroundStars &&
      features.photonSphereGlow === p.photonSphereGlow &&
      features.bloom === p.bloom &&
      features.relativisticJets === p.relativisticJets &&
      features.gravitationalRedshift === p.gravitationalRedshift &&
      features.kerrShadow === p.kerrShadow
    ) {
      return presetName;
    }
  }

  return "custom";
}

export function getMobilePreset(): FeatureToggles {
  const base = getPreset("balanced");
  return {
    ...base,
    bloom: false, // Force disable post-processing on mobile
  };
}
