/**
 * Benchmark Mode Implementation
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 *
 * Provides automated performance testing across different presets
 * to help users find optimal settings for their hardware.
 */

import type { PresetName, FeatureToggles } from "@/types/features";

/**
 * Results from testing a single preset
 */
export interface BenchmarkResult {
  presetName: PresetName;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  averageFrameTimeMs: number;
  testDurationSeconds: number;
}

/**
 * Complete benchmark report with recommendations
 */
export interface BenchmarkReport {
  results: BenchmarkResult[];
  recommendedPreset: PresetName;
  hardwareInfo: {
    isMobile: boolean;
    hasIntegratedGPU: boolean;
    devicePixelRatio: number;
  };
}

/**
 * Benchmark state
 */
export type BenchmarkState = "idle" | "running" | "completed" | "cancelled";

/**
 * Callback for benchmark progress updates
 */
export type BenchmarkProgressCallback = (
  currentPreset: PresetName,
  progress: number,
  currentFPS: number,
) => void;

/**
 * Callback for benchmark completion
 */
export type BenchmarkCompleteCallback = (report: BenchmarkReport) => void;

/**
 * BenchmarkController manages automated performance testing
 *
 * Tests each preset for a fixed duration and collects FPS statistics
 * to recommend optimal settings for the user's hardware.
 */
export class BenchmarkController {
  private state: BenchmarkState = "idle";
  private currentPresetIndex: number = 0;
  private testStartTime: number = 0;
  private results: BenchmarkResult[] = [];
  private savedSettings: FeatureToggles | null = null;

  // Phase 2: Incremental statistics instead of unbounded array
  // Previous: fpsReadings.push() + Math.min(...fpsReadings) = O(n) + potential stack overflow
  // Now: O(1) per update, O(1) finalization
  private fpsSum: number = 0;
  private fpsCount: number = 0;
  private fpsMin: number = Infinity;
  private fpsMax: number = -Infinity;

  private readonly TEST_DURATION_MS = 5000; // 5 seconds per preset (Faster feedback)
  private readonly PRESETS_TO_TEST: PresetName[] = [
    "maximum-performance",
    "balanced",
    "high-quality",
    "ultra-quality",
  ];

  private progressCallback?: BenchmarkProgressCallback;
  private completeCallback?: BenchmarkCompleteCallback;

  /**
   * Start the benchmark
   *
   * Requirements:
   * - 19.1: Test each preset for 10 seconds
   * - 19.4: Disable user input during benchmark
   *
   * @param currentSettings - Current feature settings to restore after benchmark
   * @param onProgress - Callback for progress updates
   * @param onComplete - Callback when benchmark completes
   */
  start(
    currentSettings: FeatureToggles,
    onProgress?: BenchmarkProgressCallback,
    onComplete?: BenchmarkCompleteCallback,
  ): void {
    if (this.state === "running") {
      return;
    }

    // Save current settings for restoration (Requirement 19.5)
    this.savedSettings = { ...currentSettings };

    // Reset state
    this.state = "running";
    this.currentPresetIndex = 0;
    this.results = [];
    this.progressCallback = onProgress;
    this.completeCallback = onComplete;

    // Start first preset test
    this.startPresetTest();
  }

  /**
   * Cancel the benchmark
   *
   * Requirement 19.5: Immediately stop testing and restore previous settings
   */
  cancel(): FeatureToggles | null {
    if (this.state !== "running") {
      return null;
    }

    this.state = "cancelled";
    const settingsToRestore = this.savedSettings;
    this.reset();

    return settingsToRestore;
  }

  /**
   * Update benchmark with current FPS reading
   *
   * Should be called every frame during benchmark
   *
   * @param currentFPS - Current frames per second
   * @returns Current preset being tested, or null if benchmark not running
   */
  update(currentFPS: number): PresetName | null {
    if (this.state !== "running") {
      return null;
    }

    // Record FPS reading incrementally (O(1))
    this.fpsSum += currentFPS;
    this.fpsCount++;
    if (currentFPS < this.fpsMin) this.fpsMin = currentFPS;
    if (currentFPS > this.fpsMax) this.fpsMax = currentFPS;

    const elapsed = Date.now() - this.testStartTime;
    const progress = Math.min(elapsed / this.TEST_DURATION_MS, 1.0);
    const currentPreset = this.PRESETS_TO_TEST[this.currentPresetIndex];

    // Notify progress
    if (this.progressCallback) {
      this.progressCallback(currentPreset, progress, currentFPS);
    }

    // Check if current preset test is complete
    if (elapsed >= this.TEST_DURATION_MS) {
      this.finishPresetTest();

      // Move to next preset or complete benchmark
      this.currentPresetIndex++;
      if (this.currentPresetIndex < this.PRESETS_TO_TEST.length) {
        this.startPresetTest();
      } else {
        this.completeBenchmark();
      }
    }

    return currentPreset;
  }

  /**
   * Get current benchmark state
   */
  getState(): BenchmarkState {
    return this.state;
  }

  /**
   * Check if benchmark is running
   */
  isRunning(): boolean {
    return this.state === "running";
  }

  /**
   * Get current preset being tested
   */
  getCurrentPreset(): PresetName | null {
    if (
      this.state !== "running" ||
      this.currentPresetIndex >= this.PRESETS_TO_TEST.length
    ) {
      return null;
    }
    return this.PRESETS_TO_TEST[this.currentPresetIndex];
  }

  /**
   * Get progress (0-1) for current preset test
   */
  getCurrentProgress(): number {
    if (this.state !== "running") {
      return 0;
    }
    const elapsed = Date.now() - this.testStartTime;
    return Math.min(elapsed / this.TEST_DURATION_MS, 1.0);
  }

  /**
   * Start testing a preset
   */
  private startPresetTest(): void {
    this.testStartTime = Date.now();
    this.fpsSum = 0;
    this.fpsCount = 0;
    this.fpsMin = Infinity;
    this.fpsMax = -Infinity;
  }

  /**
   * Finish testing current preset and record results
   *
   * Requirement 19.2: Display average FPS for each preset
   */
  private finishPresetTest(): void {
    if (this.fpsCount === 0) {
      return;
    }

    const presetName = this.PRESETS_TO_TEST[this.currentPresetIndex];

    // Phase 2: Use incremental statistics (O(1) finalization)
    const averageFPS = this.fpsSum / this.fpsCount;
    const averageFrameTimeMs = 1000 / averageFPS;

    const result: BenchmarkResult = {
      presetName,
      averageFPS,
      minFPS: this.fpsMin,
      maxFPS: this.fpsMax,
      averageFrameTimeMs,
      testDurationSeconds: this.TEST_DURATION_MS / 1000,
    };

    this.results.push(result);
  }

  /**
   * Complete the benchmark and generate report
   *
   * Requirements:
   * - 19.2: Display average FPS for each preset
   * - 19.3: Recommend highest quality preset that maintains 60+ FPS
   */
  private completeBenchmark(): void {
    this.state = "completed";

    // Generate hardware info
    const hardwareInfo = {
      isMobile: this.detectMobile(),
      hasIntegratedGPU: false, // Would need WebGL extension to detect
      devicePixelRatio: window.devicePixelRatio || 1,
    };

    // Find recommended preset (Requirement 19.3)
    const recommendedPreset = this.findRecommendedPreset();

    const report: BenchmarkReport = {
      results: this.results,
      recommendedPreset,
      hardwareInfo,
    };

    // Notify completion
    if (this.completeCallback) {
      this.completeCallback(report);
    }

    this.reset();
  }

  /**
   * Find the highest quality preset that maintains 60+ FPS
   *
   * Requirement 19.3: Recommend highest quality preset with 60+ average FPS
   */
  private findRecommendedPreset(): PresetName {
    // Presets in order from highest to lowest quality
    const qualityOrder: PresetName[] = [
      "ultra-quality",
      "high-quality",
      "balanced",
      "maximum-performance",
    ];

    // Intelligence Pass 1: High Fidelity (60+ FPS)
    // For users with powerful GPUs, give them the best possible experience.
    for (const presetName of qualityOrder) {
      const result = this.results.find((r) => r.presetName === presetName);
      if (result && result.averageFPS >= 60) {
        return presetName;
      }
    }

    // Intelligence Pass 2: Stable Standard (35+ FPS)
    // Good balance of fluidity and fidelity.
    for (const presetName of qualityOrder) {
      const result = this.results.find((r) => r.presetName === presetName);
      if (result && result.averageFPS >= 35) {
        return presetName;
      }
    }

    // Intelligence Pass 3: Cinematic Minimum (24+ FPS)
    // Respect the user's hardware. If it can maintain 24 FPS, don't strip features.
    for (const presetName of qualityOrder) {
      const result = this.results.find((r) => r.presetName === presetName);
      if (result && result.averageFPS >= 24) {
        return presetName;
      }
    }

    // Fallback: If everything is a slideshow, use the performance mode.
    return "maximum-performance";
  }

  /**
   * Detect if running on mobile device
   */
  private detectMobile(): boolean {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) || window.innerWidth < 768
    );
  }

  /**
   * Reset benchmark state
   */
  private reset(): void {
    this.currentPresetIndex = 0;
    this.testStartTime = 0;
    this.fpsSum = 0;
    this.fpsCount = 0;
    this.fpsMin = Infinity;
    this.fpsMax = -Infinity;
    this.savedSettings = null;
    this.progressCallback = undefined;
    this.completeCallback = undefined;
  }
}
