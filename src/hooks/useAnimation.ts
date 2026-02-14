import { useEffect, useRef, useState } from "react";
import type {
  SimulationParams,
  MouseState,
  QualityLevel,
} from "@/types/simulation";
import { getMaxRaySteps, DEFAULT_FEATURES } from "@/types/features";
import { PerformanceMonitor } from "@/performance/monitor";
import type { PerformanceMetrics } from "@/performance/monitor";
import { UniformBatcher, IdleDetector } from "@/utils/cpu-optimizations";
import type { BloomManager } from "@/rendering/bloom";
import { SIMULATION_CONFIG } from "@/configs/simulation.config";
import { PERFORMANCE_CONFIG } from "@/configs/performance.config";

export function useAnimation(
  glRef: React.RefObject<WebGLRenderingContext | null>,
  programRef: React.RefObject<WebGLProgram | null>,
  bloomManagerRef: React.RefObject<BloomManager | null>,
  params: SimulationParams,
  mouse: MouseState,
  setResolutionScale?: (scale: number) => void,
) {
  const requestRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const paramsRef = useRef(params);
  const mouseRef = useRef(mouse);
  const performanceMonitor = useRef(new PerformanceMonitor());

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    currentFPS: PERFORMANCE_CONFIG.scheduler.targetFPS,
    frameTimeMs: PERFORMANCE_CONFIG.scheduler.frameBudgetMs,
    rollingAverageFPS: 60,
    quality: params.quality || "high",
    renderResolution: params.renderScale || 1.0,
  });

  const lastFrameTime = useRef(performance.now());
  const isVisible = useRef(true);
  const uniformBatcher = useRef(new UniformBatcher());
  const idleDetector = useRef(
    new IdleDetector(PERFORMANCE_CONFIG.scheduler.idleTimeoutMs),
  );
  const targetFrameTime = useRef(PERFORMANCE_CONFIG.scheduler.frameBudgetMs);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);
  useEffect(() => {
    mouseRef.current = mouse;
    idleDetector.current.recordActivity();
  }, [mouse]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisible.current = !document.hidden;
      if (isVisible.current) lastFrameTime.current = performance.now();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    const record = () => idleDetector.current.recordActivity();
    window.addEventListener("mousemove", record);
    window.addEventListener("mousedown", record);
    window.addEventListener("keydown", record);
    return () => {
      window.removeEventListener("mousemove", record);
      window.removeEventListener("mousedown", record);
      window.removeEventListener("keydown", record);
    };
  }, []);

  const adjustQuality = (fps: number, q: QualityLevel): QualityLevel => {
    if (fps < 25) {
      if (q === "high") return "medium";
      if (q === "medium") return "low";
      if (q === "low") return "off";
    }
    return q;
  };

  useEffect(() => {
    const animate = (currentTime: number) => {
      if (!isVisible.current) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      const gl = glRef.current;
      const program = programRef.current;
      const currentParams = paramsRef.current;
      const currentMouse = mouseRef.current;

      const frameStartTime = performance.now();
      const deltaTime = currentTime - lastFrameTime.current;
      lastFrameTime.current = currentTime;

      if (idleDetector.current.isIdle()) {
        targetFrameTime.current =
          1000 / PERFORMANCE_CONFIG.scheduler.idleThrottleFPS;
      } else {
        targetFrameTime.current = PERFORMANCE_CONFIG.scheduler.frameBudgetMs;
      }

      if (deltaTime < targetFrameTime.current) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      const updatedMetrics =
        performanceMonitor.current.updateMetrics(deltaTime);

      // PAUSE LOGIC: Only increment simulation time if not paused
      if (!currentParams.paused) {
        timeRef.current += 0.01;
      }

      // OPTIMIZATION: If paused and no interaction, skip heavy rendering to save GPU/CPU
      // But keep loop running for responsiveness
      const isInteractionActive =
        Math.abs(currentMouse.x - mouseRef.current.x) > 0.0001 ||
        Math.abs(currentMouse.y - mouseRef.current.y) > 0.0001 ||
        paramsRef.current !== currentParams; // Check if params changed

      const shouldRender = !currentParams.paused || isInteractionActive;

      if (!shouldRender) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      if (gl && program) {
        const features = currentParams.features || DEFAULT_FEATURES;
        const currentQuality = currentParams.quality || metrics.quality;
        const newQuality = adjustQuality(
          updatedMetrics.currentFPS,
          currentQuality,
        );
        const maxRaySteps = getMaxRaySteps(features.rayTracingQuality);

        const dynamicScale = (() => {
          if (
            !PERFORMANCE_CONFIG.resolution.enableDynamicScaling ||
            !setResolutionScale
          )
            return 1.0;

          if (
            updatedMetrics.currentFPS <
            PERFORMANCE_CONFIG.resolution.adaptiveThreshold
          ) {
            return Math.max(
              PERFORMANCE_CONFIG.resolution.minScale,
              metrics.renderResolution * 0.9,
            );
          } else if (
            updatedMetrics.currentFPS >
            PERFORMANCE_CONFIG.resolution.recoveryThreshold
          ) {
            return Math.min(
              PERFORMANCE_CONFIG.resolution.maxScale,
              metrics.renderResolution * 1.05,
            );
          }
          return metrics.renderResolution;
        })();

        if (
          setResolutionScale &&
          Math.abs(dynamicScale - metrics.renderResolution) > 0.05
        ) {
          setResolutionScale(dynamicScale);
        }

        setMetrics({
          ...updatedMetrics,
          quality: newQuality,
          renderResolution: dynamicScale,
        });

        const bloomManager = bloomManagerRef.current;
        if (bloomManager) {
          bloomManager.updateConfig({
            enabled: features.bloom,
            intensity: 0.5,
            threshold: 0.8,
            blurPasses: 2,
          });
          bloomManager.resize(gl.canvas.width, gl.canvas.height);
        }

        const targetFramebuffer = bloomManager
          ? bloomManager.beginScene()
          : null;
        gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.useProgram(program);

        uniformBatcher.current.set("u_resolution", [
          gl.canvas.width,
          gl.canvas.height,
        ]);
        uniformBatcher.current.set("u_time", timeRef.current);
        uniformBatcher.current.set("u_mass", currentParams.mass);
        uniformBatcher.current.set("u_disk_density", currentParams.diskDensity);
        uniformBatcher.current.set("u_disk_temp", currentParams.diskTemp);
        uniformBatcher.current.set("u_mouse", [currentMouse.x, currentMouse.y]);
        uniformBatcher.current.set("u_spin", currentParams.spin);
        uniformBatcher.current.set("u_lensing_strength", currentParams.lensing);
        uniformBatcher.current.set("u_zoom", currentParams.zoom);
        uniformBatcher.current.set(
          "u_disk_size",
          currentParams.diskSize ?? SIMULATION_CONFIG.diskSize.default,
        );
        uniformBatcher.current.set("u_maxRaySteps", maxRaySteps);

        uniformBatcher.current.flush(gl, program);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        if (bloomManager) bloomManager.applyBloom();
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [glRef, programRef]);

  return { metrics, timeRef };
}
