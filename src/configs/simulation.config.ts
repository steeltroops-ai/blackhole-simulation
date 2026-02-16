/**
 * Global Simulation Governance Schema
 * Centralized source of truth for all physics and visual parameters.
 *
 * NOTE: All ranges are set to physically plausible values for a Kerr Black Hole.
 * Mass is in Solar Masses (M☉).
 * Spin is the dimensionless spin parameter a* = J / M^2, strictly bounded [-1, 1].
 * Temperatures are in Kelvin.
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
    relativisticJets: false,
    gravitationalRedshift: false,
    kerrShadow: false,
  },
  balanced: {
    gravitationalLensing: true,
    rayTracingQuality: "medium",
    accretionDisk: true,
    dopplerBeaming: false,
    backgroundStars: true,
    photonSphereGlow: false,
    bloom: false,
    relativisticJets: false,
    gravitationalRedshift: false,
    kerrShadow: false,
  },
  "high-quality": {
    gravitationalLensing: true,
    rayTracingQuality: "high",
    accretionDisk: true,
    dopplerBeaming: true,
    backgroundStars: true,
    photonSphereGlow: true,
    bloom: true,
    relativisticJets: true,
    gravitationalRedshift: false,
    kerrShadow: false,
  },
  "ultra-quality": {
    gravitationalLensing: true,
    rayTracingQuality: "ultra",
    accretionDisk: true,
    dopplerBeaming: true,
    backgroundStars: true,
    photonSphereGlow: true,
    bloom: true,
    relativisticJets: true,
    gravitationalRedshift: false,
    kerrShadow: false,
  },
} as const;

// --- MASTER CONFIGURATION SWITCH ---
const DEFAULT_PRESET_MODE: keyof typeof PERFORMANCE_PRESETS = "high-quality";

export const SIMULATION_CONFIG = {
  // Singularity Dynamics
  mass: {
    default: 1.0,
    min: 0.1, // 0.1 Solar Masses (Micro-BH)
    max: 10.0, // 10 Solar Masses (Stellar BH)
    step: 0.1,
    unit: "M\u2609",
    decimals: 1,
    label: "Black Hole Mass",
  },

  // Angular Momentum (Spin)
  // Strictly bounded to [-1, 1] for Kerr metric stability.
  // Values outside this range represent a naked singularity.
  spin: {
    default: 0.5,
    min: -0.99, // Avoid exactly -1/1 to prevent numerical singularity at horizon
    max: 0.99,
    step: 0.01,
    unit: "a*",
    decimals: 2,
    label: "Spin Parameter",
  },

  // NOTE: ui_spin removed as we now use direct physics values

  zoom: {
    default: 20.0,
    min: 2.5, // Close orbit
    max: 100.0, // Far observer
    step: 0.5,
    unit: "Rs", // Schwarzschild Radii
    decimals: 1,
    label: "Observer Dist",
  },

  // System Kinetics
  autoSpin: {
    default: 0.005, // Default to static for accuracy
    min: -0.1,
    max: 0.1,
    step: 0.001,
    unit: "rad/s",
    decimals: 3,
    label: "Cam Auto-Pan",
  },
  diskSize: {
    default: 12.0,
    min: 3.0, // Just outside ISCO
    max: 50.0, // Extended disk
    step: 0.5,
    unit: "Rs",
    decimals: 1,
    label: "Disk Radius",
  },

  // Thermodynamics
  diskTemp: {
    default: 5000.0,
    min: 1000.0, // Cool edge
    max: 100000.0, // X-ray hot
    step: 500,
    unit: "K",
    decimals: 0,
    label: "Disk Temp",
  },
  diskDensity: {
    default: 4.0,
    min: 0.0,
    max: 5.0,
    step: 0.1,
    unit: "rel",
    decimals: 1,
    label: "Opt. Density",
  },

  // Relativistic Effects
  lensing: {
    default: 0.7, // Standard GR
    min: 0.0,
    max: 2.0, // Exaggerated for education
    step: 0.1,
    unit: "\u03B7", // Eta
    decimals: 1,
    label: "Lensing Str",
  },

  // System Optimization
  renderScale: {
    default: 1.0,
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
    low: 32,
    medium: 64,
    high: 128,
    ultra: 256, // 500 is often overkill for real-time
  } as const,

  // Global Performance Presets
  presets: PERFORMANCE_PRESETS,
} as const;

export type SimulationParameterKey = keyof typeof SIMULATION_CONFIG;
