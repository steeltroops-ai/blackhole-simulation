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
  spacetimeVisualization: boolean;
  /**
   * SP-4 module 4A: composite polarization (Stokes Q, U) into the
   * fragment color. Off by default; ADR-0022 wires the feature, ADR-
   * 0027 limits it to tier 2 / tier 3 hardware.
   */
  polarizationOverlay?: boolean;
  /**
   * Manual Stokes Q / U values when polarizationOverlay is on. Until
   * the integrator-side per-pixel transport lands these are uniform
   * across the frame; an operator can drive them through the
   * polarization control to demonstrate the EVPA rotation.
   */
  polarizationStokesQ?: number;
  polarizationStokesU?: number;
  /**
   * SP-4 module 4B: active spectral RT band for shader-side tonemap.
   * Frequency in Hz; index into the BANDS_5 table for the tonemap
   * lookup. Defaults to 230 GHz EHT (band index 1).
   */
  activeBandFreqHz?: number;
  activeBandIndex?: number;
  /**
   * SP-4 module 4D: Wald magnetosphere streamline brightness
   * (geometric units B_0 with M = 1). Tier 3 only per ADR-0024;
   * 0 disables the overlay.
   */
  bFieldStrength?: number;
  /**
   * SP-4 module 4E: plunging-stream emissivity envelope scale (in
   * units of M). Tier 1+ per ADR-0025; 0 reverts to hard cutoff at
   * ISCO.
   */
  plungeEnvelopeScale?: number;
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
    "spacetimeVisualization",
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
      features.kerrShadow === p.kerrShadow &&
      features.spacetimeVisualization === p.spacetimeVisualization
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
