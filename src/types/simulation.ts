/**
 * Core simulation types.
 */

import type { FeatureToggles, RayTracingQuality } from "./features";
import { SIMULATION_CONFIG } from "../configs/simulation.config";

export type QualityLevel = RayTracingQuality;

export interface SimulationParams {
  mass: number;
  spin: number;
  diskDensity: number;
  diskTemp: number;
  lensing: number;
  paused: boolean;
  zoom: number;
  autoSpin: number;
  diskSize: number;
  quality?: QualityLevel;
  features?: FeatureToggles;
  performancePreset?: string;
  adaptiveResolution?: boolean;
  renderScale: number;
}

export const DEFAULT_PARAMS: SimulationParams = {
  mass: SIMULATION_CONFIG.mass.default,
  spin: SIMULATION_CONFIG.spin.default,
  diskDensity: SIMULATION_CONFIG.diskDensity.default,
  diskTemp: SIMULATION_CONFIG.diskTemp.default,
  lensing: SIMULATION_CONFIG.lensing.default,
  paused: false,
  zoom: SIMULATION_CONFIG.zoom.default,
  autoSpin: SIMULATION_CONFIG.autoSpin.default,
  diskSize: SIMULATION_CONFIG.diskSize.default,
  renderScale: SIMULATION_CONFIG.renderScale.default,
  features: SIMULATION_CONFIG.features.default,
  performancePreset: "ultra-quality",
};

export interface MouseState {
  x: number;
  y: number;
}
