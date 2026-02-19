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
    adaptiveThreshold: 58, // FPS threshold below which resolution drops
    recoveryThreshold: 72, // FPS threshold above which resolution recovers
    enableDynamicScaling: true, // Master toggle for DPI scaling
    // PID Controller Coefficients -- tuned for STABILITY, not reactivity.
    // Goal: FPS should barely move once converged. Visual smoothness > peak throughput.
    pid: {
      kp: 0.025, // Proportional: halved to dampen oscillation around setpoint
      ki: 0.005, // Integral: reduced to prevent wind-up drift
      kd: 0.04, // Derivative: doubled to resist sudden frame-time spikes
      deadzone: 0.05, // Fractional: ignore errors < 5% of frame budget (prevents micro-oscillation)
      cooldownMs: 500, // Minimum time between resolution changes (prevents GPU pipeline thrashing)
      integralClamp: 8.0, // Tighter integral wind-up limit (was effectively 20)
    },
  },

  // Stress-Test Calibration (Hardware Awareness)
  calibration: {
    durationMs: 3000, // 3 seconds of stress-testing at startup
    minStableFPS: 30, // FPS needed to maintain 'ultra/high' quality (Cinematic standard)
    mobileHardCap: "medium", // Forced max quality for mobile devices
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
