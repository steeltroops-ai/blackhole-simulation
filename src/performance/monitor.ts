import { PERFORMANCE_CONFIG } from "@/configs/performance.config";
import type { RayTracingQuality } from "@/types/features";

export interface PerformanceMetrics {
  currentFPS: number;
  frameTimeMs: number;
  rollingAverageFPS: number;
  quality: RayTracingQuality;
  renderResolution: number;
}

export interface DebugMetrics extends PerformanceMetrics {
  totalFrameTimeMs: number;
  gpuTimeMs?: number;
  cpuTimeMs?: number;
  idleTimeMs?: number;
}

export interface PerformanceWarning {
  severity: "info" | "warning" | "critical";
  message: string;
  suggestions: string[];
}

export class PerformanceMonitor {
  private frameTimes: number[] = [];
  private readonly WINDOW = 60;
  private currentQuality: RayTracingQuality = "high";
  private renderResolution: number = 1.0;

  updateMetrics(deltaTime: number): PerformanceMetrics {
    this.frameTimes.push(deltaTime);
    if (this.frameTimes.length > this.WINDOW) this.frameTimes.shift();

    return this.getMetrics(deltaTime);
  }

  private getMetrics(currentDeltaTime?: number): PerformanceMetrics {
    const avgTime =
      this.frameTimes.reduce((a, b) => a + b, 0) /
      (this.frameTimes.length || 1);

    // Use provided deltaTime for instantaneous FPS, otherwise use last frame or 0
    const dt =
      currentDeltaTime ??
      (this.frameTimes.length > 0
        ? this.frameTimes[this.frameTimes.length - 1]
        : 0);
    const fps = dt > 0 ? 1000 / dt : 0;

    return {
      currentFPS: Math.round(fps),
      frameTimeMs: Math.round(avgTime * 100) / 100,
      rollingAverageFPS: Math.round(avgTime > 0 ? 1000 / avgTime : 0),
      quality: this.currentQuality,
      renderResolution: this.renderResolution,
    };
  }

  setQuality(quality: RayTracingQuality) {
    this.currentQuality = quality;
  }

  setRenderResolution(res: number) {
    this.renderResolution = Math.min(
      Math.max(res, PERFORMANCE_CONFIG.resolution.minScale),
      PERFORMANCE_CONFIG.resolution.maxScale,
    );
  }

  getDebugMetrics(): DebugMetrics {
    const metrics = this.getMetrics();
    return {
      ...metrics,
      totalFrameTimeMs: metrics.frameTimeMs,
    };
  }

  getFrameTimeBudgetUsage(): number {
    const avgTime =
      this.frameTimes.reduce((a, b) => a + b, 0) /
      (this.frameTimes.length || 1);
    const targetTime = 1000 / PERFORMANCE_CONFIG.scheduler.targetFPS;
    return (avgTime / targetTime) * 100;
  }

  getWarnings(): PerformanceWarning[] {
    const metrics = this.getMetrics();
    const budgetUsage = this.getFrameTimeBudgetUsage();
    const warnings: PerformanceWarning[] = [];

    if (metrics.rollingAverageFPS < 30) {
      warnings.push({
        severity: "critical",
        message: "Critical performance issue detected",
        suggestions: ["Disable Gravitational Lensing", "Set Quality to Low"],
      });
    } else if (metrics.rollingAverageFPS < 60) {
      warnings.push({
        severity: "warning",
        message: "Performance warning: FPS below 60",
        suggestions: ["Reduce Ray Tracing Quality", "Disable Bloom"],
      });
    }

    if (budgetUsage > 100) {
      warnings.push({
        severity: "info",
        message: `Frame time budget exceeded (>${(1000 / PERFORMANCE_CONFIG.scheduler.targetFPS).toFixed(1)}ms)`,
        suggestions: ["Enable Adaptive Resolution"],
      });
    }

    return warnings;
  }

  shouldReduceQuality(): boolean {
    return this.getMetrics().rollingAverageFPS < 60;
  }

  shouldIncreaseQuality(): boolean {
    const metrics = this.getMetrics();
    const budgetUsage = this.getFrameTimeBudgetUsage();
    // Increase only if FPS is high AND we have budget headroom (< 80% usage)
    return metrics.rollingAverageFPS > 75 && budgetUsage < 80;
  }

  reset(): void {
    this.frameTimes = [];
  }

  recordCPUTime(_t: number) {}
  recordGPUTime(_t: number) {}
  recordIdleTime(_t: number) {}
  recordUniformUpdates(_n: number) {}
  recordDrawCalls(_n: number) {}
  recordBufferSwapTime(_t: number) {}
}
