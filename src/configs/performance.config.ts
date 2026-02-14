/**
 * Performance Optimization Configuration
 * Centralized control for GPU scheduling, resolution scaling, and computational budgets.
 *
 * This file governs how the simulation utilizes hardware resources. It is designed to
 * maximize FPS on constrained devices (like mobile/MacBooks) while allowing
 * high-fidelity output on dedicated GPUs.
 */

export const PERFORMANCE_CONFIG = {
  // Adaptive Resolution & Scaling
  resolution: {
    baseScale: 1.0, // Default DPI multiplier (1.0 = native)
    minScale: 0.5, // Minimum allowed downscaling for potato mode
    maxScale: 2.0, // Maximum supersampling (Retina/4K)
    mobileCap: 1.0, // Hard cap for mobile devices to prevent thermal throttling
    adaptiveThreshold: 45, // FPS threshold below which resolution drops
    recoveryThreshold: 58, // FPS threshold above which resolution recovers
    enableDynamicScaling: true, // Master toggle for DPI scaling
  },

  // Ray Marching Budget (The Engine's "Gas Pedal")
  compute: {
    maxStepsDefault: 200, // Balanced default for ray steps
    maxStepsMobile: 80, // Reduced steps for mobile GPUs
    stepOptimizationThreshold: 0.05, // Distance threshold to switch to larger steps
    dynamicLOD: true, // Enable Level-of-Detail scaling based on camera distance
  },

  // Scheduler & Loop Management
  scheduler: {
    targetFPS: 60, // The simulation's heartbeat target
    idleThrottleFPS: 30, // FPS when tab is inactive/backgrounded
    frameBudgetMs: 16.67, // Max milliseconds per frame (1000/60)
    idleTimeoutMs: 30000, // Time in ms before throttling kicks in
  },

  // WebGL Context Attributes (Power Management)
  context: {
    powerPreference: "high-performance" as const,
    preserveDrawingBuffer: false, // Set false to save memory if screenshots aren't needed
    antialias: false, // Disable MSAA as we use ray-marching (saves GPU)
    depth: false, // Disable depth buffer if 2D quad render (saves bandwidth)
    stencil: false,
    alpha: false,
  },
} as const;
