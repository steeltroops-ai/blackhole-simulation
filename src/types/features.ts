/**
 * Feature toggle definitions for performance optimization.
 */

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

export const DEFAULT_FEATURES: FeatureToggles = {
  gravitationalLensing: true,
  rayTracingQuality: "high",
  accretionDisk: true,
  dopplerBeaming: true,
  backgroundStars: true,
  photonSphereGlow: true,
  bloom: true,
};

export function getMaxRaySteps(quality: RayTracingQuality): number {
  switch (quality) {
    case "off":
      return 0;
    case "low":
      return 50;
    case "medium":
      return 100;
    case "high":
      return 250;
    case "ultra":
      return 500;
    default:
      return 250;
  }
}

export function validateFeatureToggles(
  features: any,
): features is FeatureToggles {
  if (!features || typeof features !== "object") {
    return false;
  }

  const requiredBooleans: (keyof FeatureToggles)[] = [
    "gravitationalLensing",
    "accretionDisk",
    "dopplerBeaming",
    "backgroundStars",
    "photonSphereGlow",
    "bloom",
  ];

  for (const key of requiredBooleans) {
    if (typeof features[key] !== "boolean") {
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
  if (!validQualities.includes(features.rayTracingQuality)) {
    return false;
  }

  return true;
}

export const PERFORMANCE_PRESETS: Record<PresetName, FeatureToggles> = {
  "maximum-performance": {
    gravitationalLensing: false,
    rayTracingQuality: "off",
    accretionDisk: false,
    dopplerBeaming: false,
    backgroundStars: false,
    photonSphereGlow: false,
    bloom: false,
  },
  balanced: {
    gravitationalLensing: true,
    rayTracingQuality: "medium",
    accretionDisk: true,
    dopplerBeaming: false,
    backgroundStars: true,
    photonSphereGlow: false,
    bloom: false,
  },
  "high-quality": {
    gravitationalLensing: true,
    rayTracingQuality: "high",
    accretionDisk: true,
    dopplerBeaming: true,
    backgroundStars: true,
    photonSphereGlow: true,
    bloom: false,
  },
  "ultra-quality": {
    gravitationalLensing: true,
    rayTracingQuality: "ultra",
    accretionDisk: true,
    dopplerBeaming: true,
    backgroundStars: true,
    photonSphereGlow: true,
    bloom: true,
  },
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
    if (
      JSON.stringify(features) ===
      JSON.stringify(PERFORMANCE_PRESETS[presetName])
    ) {
      return presetName;
    }
  }

  return "custom";
}

export function getMobilePreset(): FeatureToggles {
  const balanced = getPreset("balanced");
  return { ...balanced, bloom: false };
}
