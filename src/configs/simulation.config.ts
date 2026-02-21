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
    spacetimeVisualization: false,
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
    spacetimeVisualization: false,
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
    spacetimeVisualization: false,
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
    spacetimeVisualization: false,
  },
} as const;

// --- MASTER CONFIGURATION SWITCH ---
export const DEFAULT_PRESET_MODE: keyof typeof PERFORMANCE_PRESETS =
  "high-quality";

export const SIMULATION_CONFIG = {
  // Singularity Dynamics
  mass: {
    default: 1,
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

  // Initial Camera Orientation
  verticalAngle: {
    default: 97.0, // Mild top-down view for better disk visibility
    min: 0.1, // Near Pole (Top)
    max: 179.9, // Near Pole (Bottom)
    step: 5.0,
    unit: "deg",
    decimals: 1,
    label: "Initial Vertical Axis",
  },

  // NOTE: ui_spin removed as we now use direct physics values

  zoom: {
    default: 30.0,
    min: 1.5, // Close orbit (Deep Dive limit)
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
    default: 50.0, // Replaces 25.0 Rs (renders at 50.0M)
    min: 4.0, // Just outside Event Horizon
    max: 100.0, // Extended observable disk
    step: 0.5,
    unit: "Rs",
    decimals: 1,
    label: "Accretion Max Radius",
  },
  diskScaleHeight: {
    default: 0.2, // Standard thin disk approximation
    min: 0.01,
    max: 0.3, // Capped to stay within "Thin Disk" regime (< 0.2)
    step: 0.01,
    unit: "H/R",
    decimals: 2,
    label: "Disk Thickness",
  },

  // Thermodynamics
  diskTemp: {
    default: 9500.0,
    min: 1000.0, // Cool edge
    max: 1000000.0, // High Energy X-Ray Limit (Scientific Accuracy)
    step: 1000,
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
