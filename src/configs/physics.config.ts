/**
 * Physics Constants & Formula Configuration
 * Centralized control for physical laws and mathematical constants used in shaders and calculations.
 *
 * This file allows fine-tuning of the simulation's physical behavior, from the speed of light
 * to the specific coefficients used in blackbody radiation and gravitational lensing.
 */

export const PHYSICS_CONSTANTS = {
  // Fundamental Constants (Normalized for Simulation)
  speedOfLight: {
    value: 1.0, // c = 1 in geometric units
    description: "Normalized speed of light for relativistic calculations.",
  },
  gravitationalConstant: {
    value: 1.0, // G = 1 in geometric units
    description: "Normalized gravitational constant.",
  },

  // Color & Temperature Physics (Blackbody Radiation)
  blackbody: {
    tempMin: 1000.0,
    tempMax: 1000000.0,
    // Coefficients for converting temperature to RGB (Approximation of Planck's Law)
    redChannel: {
      threshold: 66.0,
      exponent: -0.1332047592,
      scale: 1.292936186,
      offset: 60.0,
    },
    greenChannel: {
      logScale: 0.39008157,
      logOffset: -0.631841444,
      powScale: 1.129890861,
      powExponent: -0.0755148492,
    },
    blueChannel: {
      threshold: 19.0,
      logScale: 0.543206789,
      logOffset: -1.196254089,
      offset: 10.0,
    },
    description:
      "Controls the color output based on accretion disk temperature.",
  },

  // Accretion Disk Dynamics
  accretion: {
    diskHeightMultiplier: 0.45, // Set higher to allow user-facing slider full range
    turbulenceScale: 0.75, // Increased frequency to match larger radius
    turbulenceDetail: 2.5, // Upped for finer nuances
    timeScale: 0.12, // Slightly slower for better stability
    densityFalloff: 0.25, // Softened falloff to reduce 'vector lines' effect
    description:
      "Governs the geometric and fluid dynamic properties of the accretion disk.",
  },

  // Ray Marching Limits
  rayMarching: {
    maxDistance: 10000.0, // Maximum render distance
    minStep: 0.01, // Minimum ray step size (precision)
    maxStep: 1.2, // Maximum ray step size (speed)
    horizonThreshold: 1.15, // Multiplier for Event Horizon hit detection
    description:
      "Parameters controlling the ray marching engine's precision and range.",
  },

  // Lensing & Gravity
  gravity: {
    centrifugalShieldStrength: 2.0, // Multiplier for angular momentum barrier
    frameDraggingStrength: 2.0, // Multiplier for space-time twist (ergosphere)
    description:
      "Coefficients for the gravitational lensing and frame-dragging equations.",
  },
} as const;
