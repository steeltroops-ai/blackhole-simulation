import { describe, test, expect, beforeEach } from "vitest";
import * as fc from "fast-check";
import { PerformanceMonitor } from "@/performance/monitor";
import { PERFORMANCE_CONFIG } from "@/configs/performance.config";

/**
 * Feature: performance-optimization, Property 8: Rolling average FPS calculation
 * Validates: Requirements 10.3
 *
 * For any sequence of frame times, the rolling average FPS should be calculated
 * as 1000 / (average of last 60 frame times).
 */
describe("Property 8: Rolling average FPS calculation", () => {
  test("rolling average FPS equals 1000 divided by average frame time", () => {
    fc.assert(
      fc.property(
        // Generate array of frame times (10ms to 100ms range)
        fc.array(fc.double({ min: 10, max: 100, noNaN: true }), {
          minLength: 1,
          maxLength: 60,
        }),
        (frameTimes) => {
          // Create fresh monitor for each test
          const monitor = new PerformanceMonitor();

          // Feed frame times to the monitor
          let lastMetrics;
          for (const frameTime of frameTimes) {
            lastMetrics = monitor.updateMetrics(frameTime);
          }

          // Calculate expected rolling average FPS
          const avgFrameTime =
            frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
          const expectedFPS = Math.round(1000 / avgFrameTime);

          // The rolling average FPS should match our calculation (both are rounded)
          expect(lastMetrics?.rollingAverageFPS).toBe(expectedFPS);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("rolling average uses only last 60 frames", () => {
    fc.assert(
      fc.property(
        // Generate more than 60 frame times
        fc.array(fc.double({ min: 10, max: 100, noNaN: true }), {
          minLength: 61,
          maxLength: 120,
        }),
        (frameTimes) => {
          // Create fresh monitor for each test
          const monitor = new PerformanceMonitor();

          // Feed all frame times to the monitor
          let lastMetrics;
          for (const frameTime of frameTimes) {
            lastMetrics = monitor.updateMetrics(frameTime);
          }

          // Calculate expected rolling average using only last 60 frames
          const last60Frames = frameTimes.slice(-60);
          const avgFrameTime =
            last60Frames.reduce((sum, time) => sum + time, 0) /
            last60Frames.length;
          const expectedFPS = Math.round(1000 / avgFrameTime);

          // The rolling average FPS should match calculation using only last 60 frames
          expect(lastMetrics?.rollingAverageFPS).toBe(expectedFPS);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("rolling average FPS is always positive for positive frame times", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 1, max: 100, noNaN: true }), {
          minLength: 1,
          maxLength: 60,
        }),
        (frameTimes) => {
          // Create fresh monitor for each test
          const monitor = new PerformanceMonitor();

          let lastMetrics;
          for (const frameTime of frameTimes) {
            lastMetrics = monitor.updateMetrics(frameTime);
          }

          // Rolling average FPS should always be positive
          expect(lastMetrics?.rollingAverageFPS).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("lower frame times result in higher FPS", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 10, max: 40, noNaN: true }), // lower frame time
        fc.double({ min: 60, max: 100, noNaN: true }), // higher frame time (larger gap)
        (lowFrameTime, highFrameTime) => {
          // Create two monitors
          const monitor1 = new PerformanceMonitor();
          const monitor2 = new PerformanceMonitor();

          // Feed consistent low frame times to monitor1
          let metrics1;
          for (let i = 0; i < 60; i++) {
            metrics1 = monitor1.updateMetrics(lowFrameTime);
          }

          // Feed consistent high frame times to monitor2
          let metrics2;
          for (let i = 0; i < 60; i++) {
            metrics2 = monitor2.updateMetrics(highFrameTime);
          }

          // Lower frame time should result in higher or equal FPS (due to rounding)
          expect(metrics1?.rollingAverageFPS).toBeGreaterThanOrEqual(
            metrics2?.rollingAverageFPS || 0,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  test("rolling average smooths out frame time spikes", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 15, max: 17, noNaN: true }), // baseline frame time (around 60 FPS)
        fc.double({ min: 50, max: 100, noNaN: true }), // spike frame time
        (baselineFrameTime, spikeFrameTime) => {
          // Create fresh monitor for each test
          const monitor = new PerformanceMonitor();

          // Feed 59 baseline frames
          for (let i = 0; i < 59; i++) {
            monitor.updateMetrics(baselineFrameTime);
          }

          // Add one spike
          const metricsWithSpike = monitor.updateMetrics(spikeFrameTime);

          // Calculate expected average
          const avgFrameTime = (baselineFrameTime * 59 + spikeFrameTime) / 60;
          const expectedFPS = Math.round(1000 / avgFrameTime);

          // Rolling average should smooth the spike
          expect(metricsWithSpike.rollingAverageFPS).toBe(expectedFPS);

          // Rolling average should be less affected than instantaneous FPS
          const instantaneousFPS = 1000 / spikeFrameTime;
          expect(metricsWithSpike.rollingAverageFPS).toBeGreaterThan(
            instantaneousFPS,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  test("rolling average converges to stable value with consistent frame times", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 10, max: 50, noNaN: true }), // consistent frame time
        (frameTime) => {
          // Create fresh monitor for each test
          const monitor = new PerformanceMonitor();

          // Feed 60 identical frame times
          let lastMetrics;
          for (let i = 0; i < 60; i++) {
            lastMetrics = monitor.updateMetrics(frameTime);
          }

          // Expected FPS for consistent frame time
          const expectedFPS = Math.round(1000 / frameTime);

          // Rolling average should converge to the expected value
          expect(lastMetrics?.rollingAverageFPS).toBe(expectedFPS);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("rolling average handles single frame correctly", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 10, max: 100, noNaN: true }),
        (frameTime) => {
          // Create fresh monitor for each test
          const monitor = new PerformanceMonitor();

          const metrics = monitor.updateMetrics(frameTime);
          const expectedFPS = Math.round(1000 / frameTime);

          // With only one frame, rolling average should equal instantaneous FPS (both rounded)
          expect(metrics.rollingAverageFPS).toBe(expectedFPS);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("rolling average is rounded to nearest integer", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 10, max: 100, noNaN: true }), {
          minLength: 1,
          maxLength: 60,
        }),
        (frameTimes) => {
          // Create fresh monitor for each test
          const monitor = new PerformanceMonitor();

          let lastMetrics;
          for (const frameTime of frameTimes) {
            lastMetrics = monitor.updateMetrics(frameTime);
          }

          // Rolling average FPS should be an integer
          expect(lastMetrics?.rollingAverageFPS).toBe(
            Math.round(lastMetrics?.rollingAverageFPS || 0),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Unit tests for PerformanceMonitor class
 */
describe("PerformanceMonitor", () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    monitor.endCalibration();
  });

  test("updateMetrics returns valid performance metrics", () => {
    const metrics = monitor.updateMetrics(16.67); // ~60 FPS

    expect(metrics).toHaveProperty("currentFPS");
    expect(metrics).toHaveProperty("frameTimeMs");
    expect(metrics).toHaveProperty("rollingAverageFPS");
    expect(metrics).toHaveProperty("quality");
    expect(metrics).toHaveProperty("renderResolution");
  });

  test("getWarnings returns critical warning for FPS < 30", () => {
    // Feed low FPS frames
    for (let i = 0; i < 60; i++) {
      monitor.updateMetrics(40); // 25 FPS
    }

    const warnings = monitor.getWarnings();
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.severity === "critical")).toBe(true);
  });

  test("getWarnings returns warning for FPS < 60", () => {
    // Feed medium FPS frames
    for (let i = 0; i < 60; i++) {
      monitor.updateMetrics(20); // 50 FPS
    }

    const warnings = monitor.getWarnings();
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.severity === "warning")).toBe(true);
  });

  test("shouldReduceQuality returns true when FPS is below adaptive threshold", () => {
    // Feed frames below the adaptive threshold
    const lowFPS = PERFORMANCE_CONFIG.resolution.adaptiveThreshold - 5;
    const frameTime = 1000 / lowFPS;

    for (let i = 0; i < 60; i++) {
      monitor.updateMetrics(frameTime);
    }

    expect(monitor.shouldReduceQuality()).toBe(true);
  });

  test("shouldIncreaseQuality returns true when FPS is above recovery threshold", () => {
    // Feed high FPS frames above the recovery threshold
    const highFPS = PERFORMANCE_CONFIG.resolution.recoveryThreshold + 20;
    const frameTime = 1000 / highFPS;

    for (let i = 0; i < 70; i++) {
      monitor.updateMetrics(frameTime);
    }

    expect(monitor.shouldIncreaseQuality()).toBe(true);
  });

  test("setQuality updates quality level", () => {
    monitor.setQuality("low");
    const metrics = monitor.updateMetrics(16.67);
    expect(metrics.quality).toBe("low");
  });

  test("setRenderResolution clamps to valid range", () => {
    monitor.setRenderResolution(0.3); // Below minimum (0.5)
    let metrics = monitor.updateMetrics(16.67);
    expect(metrics.renderResolution).toBeCloseTo(0.5, 1);

    monitor.setRenderResolution(2.5); // Above maximum (2.0)
    metrics = monitor.updateMetrics(16.67);
    expect(metrics.renderResolution).toBeCloseTo(2.0, 1);
  });

  test("reset clears frame time history", () => {
    // Add some frame times
    for (let i = 0; i < 10; i++) {
      monitor.updateMetrics(20);
    }

    monitor.reset();

    // After reset, first frame should be the only one in history
    const metrics = monitor.updateMetrics(16.67);
    expect(metrics.rollingAverageFPS).toBeCloseTo(60, 0);
  });

  test("getFrameTimeBudgetUsage returns percentage", () => {
    monitor.updateMetrics(13.3); // 13.3ms is ~80% of 16.66ms budget
    const usage = monitor.getFrameTimeBudgetUsage();
    // 13.3 / 16.666 * 100 = 79.8
    expect(usage).toBeCloseTo(80, 0);
  });
});
