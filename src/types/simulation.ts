/**
 * Core simulation types.
 */

import type { FeatureToggles, RayTracingQuality } from "./features";

export type QualityLevel = RayTracingQuality;

export interface SimulationParams {
  mass: number;
  spin: number;
  diskDensity: number;
  diskTemp: number;
  lensing: number;
  paused: boolean;
  zoom: number;
  quality?: QualityLevel;
  features?: FeatureToggles;
  performancePreset?: string;
  adaptiveResolution?: boolean;
  renderScale?: number;
}

export interface MouseState {
  x: number;
  y: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  quality: QualityLevel;
  rayStepsUsed: number;
}
