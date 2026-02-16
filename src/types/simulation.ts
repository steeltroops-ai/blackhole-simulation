/**
 * Core simulation types.
 */

import type { FeatureToggles, RayTracingQuality } from "./features";
import {
  SIMULATION_CONFIG,
  DEFAULT_PRESET_MODE,
} from "@/configs/simulation.config";

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
  adaptiveResolution?: boolean;
  renderScale: number;
  features?: FeatureToggles;
  performancePreset?: import("./features").PresetName;
  verticalAngle?: number;
}

export const DEFAULT_PARAMS: SimulationParams = {
  mass: SIMULATION_CONFIG.mass.default,
  spin: SIMULATION_CONFIG.spin.default, // Using direct physics spin
  diskDensity: SIMULATION_CONFIG.diskDensity.default,
  diskTemp: SIMULATION_CONFIG.diskTemp.default,
  lensing: SIMULATION_CONFIG.lensing.default,
  paused: false,
  zoom: SIMULATION_CONFIG.zoom.default,
  autoSpin: SIMULATION_CONFIG.autoSpin.default,
  diskSize: SIMULATION_CONFIG.diskSize.default,
  renderScale: SIMULATION_CONFIG.renderScale.default,
  features: SIMULATION_CONFIG.features.default,
  performancePreset: DEFAULT_PRESET_MODE,
  verticalAngle: SIMULATION_CONFIG.verticalAngle.default,
};

export interface MouseState {
  x: number;
  y: number;
}
