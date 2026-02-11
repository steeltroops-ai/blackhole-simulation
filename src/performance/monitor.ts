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

  recordCPUTime(t: number) {}
  recordGPUTime(t: number) {}
  recordIdleTime(t: number) {}
  recordUniformUpdates(n: number) {}
  recordDrawCalls(n: number) {}
  recordBufferSwapTime(t: number) {}
}
