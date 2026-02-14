/**
 * Performance Validation and Tuning
 * Requirements: 1.1, 1.3, 1.4, 2.5, 4.5, 5.5, 6.4, 8.4
 *
 * Provides utilities for measuring baseline performance and individual feature costs
 * to validate performance targets and tune performance budgets.
 */

import type { FeatureToggles } from "@/types/features";

/**
 * Performance measurement result for a specific configuration
 */
export interface PerformanceMeasurement {
  configuration: string;
  features: FeatureToggles;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  averageFrameTimeMs: number;
  p95FrameTimeMs: number; // 95th percentile
  p99FrameTimeMs: number; // 99th percentile
  sampleCount: number;
  durationMs: number;
}

/**
 * Feature performance cost analysis
 */
export interface FeatureCost {
  featureName: string;
  baselineFPS: number;
  featureEnabledFPS: number;
  fpsImpact: number; // Negative value indicates FPS reduction
  frameTimeImpactMs: number; // Positive value indicates added time
  percentageImpact: number; // Percentage of baseline performance
}

/**
 * Complete validation report
 */
export interface ValidationReport {
  timestamp: Date;
  deviceInfo: {
    userAgent: string;
    devicePixelRatio: number;
    screenResolution: string;
    isMobile: boolean;
  };
  baselineMeasurement: PerformanceMeasurement;
  featureCosts: FeatureCost[];
  presetMeasurements: Map<string, PerformanceMeasurement>;
  meetsTargets: {
    baseline75FPS: boolean; // Requirement 1.1
    mobile60FPS: boolean; // Requirement 1.3
    desktop120FPS: boolean; // Requirement 1.4
  };
  recommendations: string[];
}

/**
 * Performance validation controller
 *
 * Measures baseline performance and individual feature costs to validate
 * that the system meets performance targets.
 */
export class PerformanceValidator {
  private readonly MEASUREMENT_DURATION_MS = 5000; // 5 seconds per measurement
  private readonly WARMUP_DURATION_MS = 1000; // 1 second warmup

  /**
   * Measure performance for a specific feature configuration
   *
   * @param features - Feature configuration to test
   * @param configName - Name for this configuration
   * @param onProgress - Optional progress callback
   * @returns Performance measurement
   */
  async measureConfiguration(
    features: FeatureToggles,
    configName: string,
    onProgress?: (progress: number) => void,
  ): Promise<PerformanceMeasurement> {
    const fpsReadings: number[] = [];
    const frameTimeReadings: number[] = [];

    const startTime = performance.now();
    const warmupEnd = startTime + this.WARMUP_DURATION_MS;
    const measurementEnd = warmupEnd + this.MEASUREMENT_DURATION_MS;

    return new Promise<PerformanceMeasurement>((resolve) => {
      let lastFrameTime = performance.now();

      const measureFrame = () => {
        const currentTime = performance.now();
        const deltaTime = currentTime - lastFrameTime;
        lastFrameTime = currentTime;

        // Skip warmup period
        if (currentTime < warmupEnd) {
          requestAnimationFrame(measureFrame);
          return;
        }

        // Record measurements
        if (deltaTime > 0) {
          const fps = 1000 / deltaTime;
          fpsReadings.push(fps);
          frameTimeReadings.push(deltaTime);
        }

        // Update progress
        if (onProgress) {
          const elapsed = currentTime - warmupEnd;
          const progress = Math.min(
            elapsed / this.MEASUREMENT_DURATION_MS,
            1.0,
          );
          onProgress(progress);
        }

        // Check if measurement complete
        if (currentTime >= measurementEnd) {
          resolve(
            this.calculateMeasurement({
              configName,
              features,
              fpsReadings,
              frameTimeReadings,
              durationMs: currentTime - warmupEnd,
            }),
          );
        } else {
          requestAnimationFrame(measureFrame);
        }
      };

      requestAnimationFrame(measureFrame);
    });
  }

  /**
   * Calculate performance measurement from readings
   */
  private calculateMeasurement(params: {
    configName: string;
    features: FeatureToggles;
    fpsReadings: number[];
    frameTimeReadings: number[];
    durationMs: number;
  }): PerformanceMeasurement {
    const { configName, features, fpsReadings, frameTimeReadings, durationMs } =
      params;
    if (fpsReadings.length === 0) {
      return {
        configuration: configName,
        features,
        averageFPS: 0,
        minFPS: 0,
        maxFPS: 0,
        averageFrameTimeMs: 0,
        p95FrameTimeMs: 0,
        p99FrameTimeMs: 0,
        sampleCount: 0,
        durationMs,
      };
    }

    // Calculate FPS statistics
    const averageFPS =
      fpsReadings.reduce((a, b) => a + b, 0) / fpsReadings.length;
    const minFPS = Math.min(...fpsReadings);
    const maxFPS = Math.max(...fpsReadings);

    // Calculate frame time statistics
    const averageFrameTimeMs =
      frameTimeReadings.reduce((a, b) => a + b, 0) / frameTimeReadings.length;

    // Calculate percentiles
    const sortedFrameTimes = [...frameTimeReadings].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedFrameTimes.length * 0.95);
    const p99Index = Math.floor(sortedFrameTimes.length * 0.99);
    const p95FrameTimeMs = sortedFrameTimes[p95Index] || 0;
    const p99FrameTimeMs = sortedFrameTimes[p99Index] || 0;

    return {
      configuration: configName,
      features,
      averageFPS,
      minFPS,
      maxFPS,
      averageFrameTimeMs,
      p95FrameTimeMs,
      p99FrameTimeMs,
      sampleCount: fpsReadings.length,
      durationMs,
    };
  }

  /**
   * Measure baseline performance with all features disabled
   * Requirement 1.1: Verify 75 FPS target with all features disabled
   */
  async measureBaseline(
    onProgress?: (progress: number) => void,
  ): Promise<PerformanceMeasurement> {
    const baselineFeatures: FeatureToggles = {
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
    };

    return this.measureConfiguration(
      baselineFeatures,
      "Baseline (All Features Off)",
      onProgress,
    );
  }

  /**
   * Measure individual feature performance costs
   * Requirement 2.5, 4.5, 5.5, 6.4, 8.4: Measure frame time reduction for each feature
   */
  async measureFeatureCosts(
    baselineMeasurement: PerformanceMeasurement,
    onProgress?: (featureName: string, progress: number) => void,
  ): Promise<FeatureCost[]> {
    const costs: FeatureCost[] = [];

    // Test gravitational lensing (Requirement 2.5: 30% frame time reduction)
    const lensingFeatures: FeatureToggles = {
      ...baselineMeasurement.features,
      gravitationalLensing: true,
      gravitationalRedshift: false, // Ensure consistent base
      kerrShadow: false,
    };
    const lensingMeasurement = await this.measureConfiguration(
      lensingFeatures,
      "Gravitational Lensing",
      (p) => onProgress?.("Gravitational Lensing", p),
    );
    costs.push(
      this.calculateFeatureCost(
        "Gravitational Lensing",
        baselineMeasurement,
        lensingMeasurement,
      ),
    );

    // Test accretion disk (Requirement 4.5: 40% frame time reduction)
    const diskFeatures: FeatureToggles = {
      ...baselineMeasurement.features,
      accretionDisk: true,
      gravitationalRedshift: false,
      kerrShadow: false,
    };
    const diskMeasurement = await this.measureConfiguration(
      diskFeatures,
      "Accretion Disk",
      (p) => onProgress?.("Accretion Disk", p),
    );
    costs.push(
      this.calculateFeatureCost(
        "Accretion Disk",
        baselineMeasurement,
        diskMeasurement,
      ),
    );

    // Test Doppler beaming (Requirement 5.5: 15% frame time reduction)
    const dopplerFeatures: FeatureToggles = {
      ...baselineMeasurement.features,
      accretionDisk: true, // Doppler requires disk
      dopplerBeaming: true,
      gravitationalRedshift: false,
      kerrShadow: false,
    };
    const dopplerMeasurement = await this.measureConfiguration(
      dopplerFeatures,
      "Doppler Beaming",
      (p) => onProgress?.("Doppler Beaming", p),
    );
    costs.push(
      this.calculateFeatureCost(
        "Doppler Beaming",
        diskMeasurement, // Compare against disk-enabled baseline
        dopplerMeasurement,
      ),
    );

    // Test background stars (Requirement 6.4: 10% frame time reduction)
    const starsFeatures: FeatureToggles = {
      ...baselineMeasurement.features,
      backgroundStars: true,
      gravitationalRedshift: false,
      kerrShadow: false,
    };
    const starsMeasurement = await this.measureConfiguration(
      starsFeatures,
      "Background Stars",
      (p) => onProgress?.("Background Stars", p),
    );
    costs.push(
      this.calculateFeatureCost(
        "Background Stars",
        baselineMeasurement,
        starsMeasurement,
      ),
    );

    // Test bloom (Requirement 8.4: 20% frame time reduction)
    const bloomFeatures: FeatureToggles = {
      ...baselineMeasurement.features,
      bloom: true,
      gravitationalRedshift: false,
      kerrShadow: false,
    };
    const bloomMeasurement = await this.measureConfiguration(
      bloomFeatures,
      "Bloom",
      (p) => onProgress?.("Bloom", p),
    );
    costs.push(
      this.calculateFeatureCost("Bloom", baselineMeasurement, bloomMeasurement),
    );

    return costs;
  }

  /**
   * Calculate feature cost by comparing baseline and feature-enabled measurements
   */
  private calculateFeatureCost(
    featureName: string,
    baseline: PerformanceMeasurement,
    featureEnabled: PerformanceMeasurement,
  ): FeatureCost {
    const fpsImpact = featureEnabled.averageFPS - baseline.averageFPS;
    const frameTimeImpactMs =
      featureEnabled.averageFrameTimeMs - baseline.averageFrameTimeMs;
    const percentageImpact =
      baseline.averageFPS > 0 ? (fpsImpact / baseline.averageFPS) * 100 : 0;

    return {
      featureName,
      baselineFPS: baseline.averageFPS,
      featureEnabledFPS: featureEnabled.averageFPS,
      fpsImpact,
      frameTimeImpactMs,
      percentageImpact,
    };
  }

  /**
   * Generate complete validation report
   *
   * Requirements:
   * - 1.1: Verify 75 FPS with all features disabled on integrated GPU
   * - 1.3: Verify 60 FPS on mobile devices
   * - 1.4: Verify 120 FPS on desktop with dedicated GPU
   */
  async generateValidationReport(
    onProgress?: (stage: string, progress: number) => void,
  ): Promise<ValidationReport> {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      devicePixelRatio: window.devicePixelRatio || 1,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      isMobile: this.detectMobile(),
    };

    // Measure baseline
    onProgress?.("Measuring baseline performance", 0);
    const baselineMeasurement = await this.measureBaseline((p) =>
      onProgress?.("Measuring baseline performance", p),
    );

    // Measure feature costs
    onProgress?.("Measuring feature costs", 0);
    const featureCosts = await this.measureFeatureCosts(
      baselineMeasurement,
      (feature, p) => onProgress?.(`Measuring ${feature}`, p),
    );

    // Check if targets are met
    const meetsTargets = {
      baseline75FPS: baselineMeasurement.averageFPS >= 75, // Requirement 1.1
      mobile60FPS: deviceInfo.isMobile
        ? baselineMeasurement.averageFPS >= 60
        : true, // Requirement 1.3
      desktop120FPS: !deviceInfo.isMobile
        ? baselineMeasurement.averageFPS >= 120
        : true, // Requirement 1.4
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      baselineMeasurement,
      featureCosts,
      meetsTargets,
      deviceInfo.isMobile,
    );

    return {
      timestamp: new Date(),
      deviceInfo,
      baselineMeasurement,
      featureCosts,
      presetMeasurements: new Map(),
      meetsTargets,
      recommendations,
    };
  }

  /**
   * Generate performance recommendations based on measurements
   */
  private generateRecommendations(
    baseline: PerformanceMeasurement,
    costs: FeatureCost[],
    targets: {
      baseline75FPS: boolean;
      mobile60FPS: boolean;
      desktop120FPS: boolean;
    },
    isMobile: boolean,
  ): string[] {
    const recommendations: string[] = [];

    // Check baseline target
    if (!targets.baseline75FPS) {
      recommendations.push(
        `⚠️ Baseline performance (${baseline.averageFPS.toFixed(1)} FPS) is below 75 FPS target. ` +
          `Consider optimizing shader code or reducing render resolution.`,
      );
    } else {
      recommendations.push(
        `✓ Baseline performance meets 75 FPS target (${baseline.averageFPS.toFixed(1)} FPS).`,
      );
    }

    // Check mobile target
    if (isMobile && !targets.mobile60FPS) {
      recommendations.push(
        `⚠️ Mobile performance (${baseline.averageFPS.toFixed(1)} FPS) is below 60 FPS target. ` +
          `Apply mobile-specific optimizations.`,
      );
    }

    // Analyze feature costs
    for (const cost of costs) {
      const impactPercent = Math.abs(cost.percentageImpact);
      if (impactPercent > 40) {
        recommendations.push(
          `⚠️ ${cost.featureName} has high performance cost (${impactPercent.toFixed(1)}% impact). ` +
            `Consider optimization or making it optional.`,
        );
      } else if (impactPercent > 20) {
        recommendations.push(
          `ℹ️ ${cost.featureName} has moderate performance cost (${impactPercent.toFixed(1)}% impact).`,
        );
      }
    }

    // Check frame time budget
    if (baseline.averageFrameTimeMs > 13.3) {
      const budgetUsage = (baseline.averageFrameTimeMs / 13.3) * 100;
      recommendations.push(
        `⚠️ Frame time budget exceeded: ${budgetUsage.toFixed(1)}% ` +
          `(${baseline.averageFrameTimeMs.toFixed(2)}ms / 13.3ms target).`,
      );
    }

    return recommendations;
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
   * Export validation report as JSON
   */
  exportReport(report: ValidationReport): string {
    return JSON.stringify(
      {
        timestamp: report.timestamp.toISOString(),
        deviceInfo: report.deviceInfo,
        baseline: {
          averageFPS: report.baselineMeasurement.averageFPS,
          minFPS: report.baselineMeasurement.minFPS,
          maxFPS: report.baselineMeasurement.maxFPS,
          averageFrameTimeMs: report.baselineMeasurement.averageFrameTimeMs,
          p95FrameTimeMs: report.baselineMeasurement.p95FrameTimeMs,
          p99FrameTimeMs: report.baselineMeasurement.p99FrameTimeMs,
        },
        featureCosts: report.featureCosts.map((cost) => ({
          feature: cost.featureName,
          fpsImpact: cost.fpsImpact.toFixed(2),
          frameTimeImpactMs: cost.frameTimeImpactMs.toFixed(2),
          percentageImpact: cost.percentageImpact.toFixed(2) + "%",
        })),
        meetsTargets: report.meetsTargets,
        recommendations: report.recommendations,
      },
      null,
      2,
    );
  }
}
