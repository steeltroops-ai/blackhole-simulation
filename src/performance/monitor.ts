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

/**
 * Fixed-size ring buffer backed by Float64Array for O(1) push and O(1) average.
 *
 * Previous implementation used Array.push() + Array.shift() + Array.reduce(),
 * costing O(n) per frame for shift and reduce, plus GC pressure from shift().
 *
 * Time complexity: push O(1), average O(1)
 * Space complexity: O(capacity) -- pre-allocated, zero GC pressure
 */
class RingBuffer {
  private readonly buffer: Float64Array;
  private head: number = 0;
  private sum: number = 0;
  private count: number = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Float64Array(capacity);
  }

  push(value: number): void {
    // Subtract the value being overwritten from running sum
    this.sum -= this.buffer[this.head];
    this.buffer[this.head] = value;
    this.sum += value;
    this.head = (this.head + 1) % this.capacity;
    this.count = Math.min(this.count + 1, this.capacity);
  }

  average(): number {
    return this.count > 0 ? this.sum / this.count : 0;
  }

  /** Returns the most recently pushed value */
  last(): number {
    if (this.count === 0) return 0;
    // head points to the NEXT write slot, so the last written is head - 1
    const idx = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[idx];
  }

  size(): number {
    return this.count;
  }

  clear(): void {
    this.buffer.fill(0);
    this.head = 0;
    this.sum = 0;
    this.count = 0;
  }
}

export class PerformanceMonitor {
  private readonly frameTimes: RingBuffer;
  private readonly cpuTimes: RingBuffer;
  private readonly gpuTimes: RingBuffer;
  private readonly idleTimes: RingBuffer;
  private readonly WINDOW = 60;
  private currentQuality: RayTracingQuality = "high";
  private renderResolution: number = 1.0;

  // Cache frequently computed values to avoid redundant recalculation
  private cachedAvgTime: number = 0;
  private cachedAvgFPS: number = 0;
  private cacheValid: boolean = false;

  constructor() {
    this.frameTimes = new RingBuffer(this.WINDOW);
    this.cpuTimes = new RingBuffer(this.WINDOW);
    this.gpuTimes = new RingBuffer(this.WINDOW);
    this.idleTimes = new RingBuffer(this.WINDOW);
  }

  updateMetrics(deltaTime: number): PerformanceMetrics {
    this.frameTimes.push(deltaTime);
    this.invalidateCache();

    return this.getMetrics(deltaTime);
  }

  private invalidateCache(): void {
    this.cacheValid = false;
  }

  private ensureCache(): void {
    if (!this.cacheValid) {
      this.cachedAvgTime = this.frameTimes.average();
      this.cachedAvgFPS =
        this.cachedAvgTime > 0 ? 1000 / this.cachedAvgTime : 0;
      this.cacheValid = true;
    }
  }

  private getMetrics(currentDeltaTime?: number): PerformanceMetrics {
    this.ensureCache();

    // Use provided deltaTime for instantaneous FPS, otherwise last frame
    const dt =
      currentDeltaTime ??
      (this.frameTimes.size() > 0 ? this.frameTimes.last() : 0);
    const fps = dt > 0 ? 1000 / dt : 0;

    return {
      currentFPS: Math.round(fps),
      frameTimeMs: Math.round(this.cachedAvgTime * 100) / 100,
      rollingAverageFPS: Math.round(this.cachedAvgFPS),
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
      cpuTimeMs: Math.round(this.cpuTimes.average() * 100) / 100,
      gpuTimeMs: Math.round(this.gpuTimes.average() * 100) / 100,
      idleTimeMs: Math.round(this.idleTimes.average() * 100) / 100,
    };
  }

  recordCPUTime(ms: number): void {
    this.cpuTimes.push(ms);
  }

  recordGPUTime(ms: number): void {
    this.gpuTimes.push(ms);
  }

  recordIdleTime(ms: number): void {
    this.idleTimes.push(ms);
  }

  getFrameTimeBudgetUsage(): number {
    this.ensureCache();
    const targetTime = 1000 / PERFORMANCE_CONFIG.scheduler.targetFPS;
    return (this.cachedAvgTime / targetTime) * 100;
  }

  getWarnings(): PerformanceWarning[] {
    // Uses cached values via ensureCache() inside getMetrics/getFrameTimeBudgetUsage
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
    this.ensureCache();
    return this.cachedAvgFPS > 0 && Math.round(this.cachedAvgFPS) < 60;
  }

  shouldIncreaseQuality(): boolean {
    this.ensureCache();
    const targetTime = 1000 / PERFORMANCE_CONFIG.scheduler.targetFPS;
    const budgetUsage = (this.cachedAvgTime / targetTime) * 100;
    return Math.round(this.cachedAvgFPS) > 75 && budgetUsage < 80;
  }

  reset(): void {
    this.frameTimes.clear();
    this.cpuTimes.clear();
    this.gpuTimes.clear();
    this.idleTimes.clear();
    this.invalidateCache();
  }
}
