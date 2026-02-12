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

    const avgTime =
      this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const fps = deltaTime > 0 ? 1000 / deltaTime : 0;

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
    this.renderResolution = res;
  }

  getDebugMetrics(): DebugMetrics {
    const metrics = this.updateMetrics(0);
    return {
      ...metrics,
      totalFrameTimeMs: metrics.frameTimeMs,
    };
  }

  getFrameTimeBudgetUsage(): number {
    const avgTime =
      this.frameTimes.reduce((a, b) => a + b, 0) /
      (this.frameTimes.length || 1);
    const targetTime = 1000 / 60; // 60 FPS target
    return (avgTime / targetTime) * 100;
  }

  getWarnings(): PerformanceWarning[] {
    const metrics = this.updateMetrics(0);
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
        message: "Frame time budget exceeded (>13.3ms)",
        suggestions: ["Enable Adaptive Resolution"],
      });
    }

    return warnings;
  }

  shouldReduceQuality(): boolean {
    return this.updateMetrics(0).rollingAverageFPS < 60;
  }

  shouldIncreaseQuality(): boolean {
    const metrics = this.updateMetrics(0);
    const budgetUsage = this.getFrameTimeBudgetUsage();
    // Increase only if FPS is high AND we have budget headroom (< 80% usage)
    return metrics.rollingAverageFPS > 75 && budgetUsage < 80;
  }

  reset(): void {
    this.frameTimes = [];
  }

  recordCPUTime(t: number) {}
  recordGPUTime(t: number) {}
  recordIdleTime(t: number) {}
  recordUniformUpdates(n: number) {}
  recordDrawCalls(n: number) {}
  recordBufferSwapTime(t: number) {}
}
