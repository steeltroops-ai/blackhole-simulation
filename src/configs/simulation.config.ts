/**
 * Global Simulation Governance Schema
 * Centralized source of truth for all physics and visual parameters.
 */

export interface ParameterConfig {
  default: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  decimals: number;
  label: string;
}

const PERFORMANCE_PRESETS = {
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
    bloom: true,
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
} as const;

// --- MASTER CONFIGURATION SWITCH ---
// Change this to automatically inherit all settings for that preset
const DEFAULT_PRESET_MODE: keyof typeof PERFORMANCE_PRESETS = "ultra-quality";

export const SIMULATION_CONFIG = {
  // Singularity Dynamics
  mass: {
    default: 0.5,
    min: 0.1,
    max: 3.0,
    step: 0.1,
    unit: "M\u2609",
    decimals: 1,
    label: "Black Hole Mass",
  },
  spin: {
    default: 0.9,
    min: -1.0, // Internal normalized range is -1 to 1 for physics, but UI uses -5 to 5 for "feel"
    max: 1.0,
    step: 0.01,
    unit: "a*",
    decimals: 2,
    label: "Angular Spin",
  },
  // UI mapping for spin (converts slider -5..5 to physics -1..1)
  ui_spin: {
    default: 4.5, // matches physics 0.9
    min: -5.0,
    max: 5.0,
    step: 0.1,
    unit: "a*",
    decimals: 1,
    label: "Angular Spin",
  },
  zoom: {
    default: 50.0,
    min: 5.0,
    max: 100.0,
    step: 0.5,
    unit: "AU",
    decimals: 1,
    label: "Observer Distance",
  },

  // System Kinetics
  autoSpin: {
    default: 0.005,
    min: -0.05,
    max: 0.05,
    step: 0.001,
    unit: "rad/s",
    decimals: 3,
    label: "Auto-Rotation",
  },
  diskSize: {
    default: 35.0,
    min: 5.0,
    max: 50.0,
    step: 0.5,
    unit: "M",
    decimals: 1,
    label: "Accretion Radius",
  },

  // Light & Color
  diskTemp: {
    default: 3000.0,
    min: 1000.0,
    max: 50000.0,
    step: 500,
    unit: "K",
    decimals: 0,
    label: "Accretion Temp",
  },
  lensing: {
    default: 1.0,
    min: 0.0,
    max: 3.0,
    step: 0.1,
    unit: "\u03bb",
    decimals: 1,
    label: "Lensing Factor",
  },
  diskDensity: {
    default: 3.9,
    min: 0.0,
    max: 5.0,
    step: 0.1,
    unit: "g/cm\u00b3",
    decimals: 1,
    label: "Plasma Density",
  },

  // System Optimization
  renderScale: {
    default: 1.5,
    min: 0.25,
    max: 2.0,
    step: 0.25,
    unit: "x",
    decimals: 2,
    label: "Render Scale",
  },

  // Performance Features (Core Toggles)
  features: {
    default: PERFORMANCE_PRESETS[DEFAULT_PRESET_MODE],
  },

  // Ray Tracing Step Budgets
  rayTracingSteps: {
    off: 0,
    low: 50,
    medium: 100,
    high: 250,
    ultra: 500,
  } as const,

  // Global Performance Presets
  presets: PERFORMANCE_PRESETS,
} as const;

export type SimulationParameterKey = keyof typeof SIMULATION_CONFIG;
