import { useEffect, useRef, useState } from "react";
import type { SimulationParams, MouseState } from "@/types/simulation";
import { getMaxRaySteps, DEFAULT_FEATURES } from "@/types/features";
import { PerformanceMonitor } from "@/performance/monitor";
import type { PerformanceMetrics } from "@/performance/monitor";
import { UniformBatcher, IdleDetector } from "@/utils/cpu-optimizations";
import type { BloomManager } from "@/rendering/bloom";
import type { ReprojectionManager } from "@/rendering/reprojection"; // Added import
import { SIMULATION_CONFIG } from "@/configs/simulation.config";
import { PERFORMANCE_CONFIG } from "@/configs/performance.config";
import {
  getSharedQuadBuffer,
  setupPositionAttribute,
} from "@/utils/webgl-utils";
import { GPUTimer } from "@/performance/gpu-timer";

interface AnimationRefs {
  glRef: React.RefObject<WebGL2RenderingContext | null>;
  programRef: React.RefObject<WebGLProgram | null>;
  bloomManagerRef: React.RefObject<BloomManager | null>;
  reprojectionManagerRef: React.RefObject<ReprojectionManager | null>;
  noiseTextureRef: React.RefObject<WebGLTexture | null>;
  blueNoiseTextureRef: React.RefObject<WebGLTexture | null>;
}

export function useAnimation(
  {
    glRef,
    programRef,
    bloomManagerRef,
    reprojectionManagerRef,
    noiseTextureRef,
    blueNoiseTextureRef,
  }: AnimationRefs,
  params: SimulationParams,
  mouse: MouseState,
  setResolutionScale?: (scale: number) => void,
) {
  const requestRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const paramsRef = useRef(params);
  const mouseRef = useRef(mouse);
  const performanceMonitor = useRef(new PerformanceMonitor());

  /*
   * Internal reference for metrics to avoid stale closures in the animation loop.
   * This is the source of truth for the animation loop.
   */
  // Initialize metrics object once to use for both ref and state
  const initialMetrics: PerformanceMetrics = {
    currentFPS: PERFORMANCE_CONFIG.scheduler.targetFPS,
    frameTimeMs: PERFORMANCE_CONFIG.scheduler.frameBudgetMs,
    rollingAverageFPS: 60,
    quality: params.quality || "high",
    renderResolution: params.renderScale || 1.0,
  };

  const metricsRef = useRef<PerformanceMetrics>(initialMetrics);

  const [metrics, setMetrics] = useState<PerformanceMetrics>(initialMetrics);

  const lastFrameTime = useRef(0);
  useEffect(() => {
    lastFrameTime.current = performance.now();
  }, []);
  const isVisible = useRef(true);
  const uniformBatcher = useRef(new UniformBatcher());
  const gpuTimer = useRef(new GPUTimer());
  const idleDetector = useRef(
    new IdleDetector(PERFORMANCE_CONFIG.scheduler.idleTimeoutMs),
  );
  const targetFrameTime = useRef<number>(
    PERFORMANCE_CONFIG.scheduler.frameBudgetMs,
  );
  const lastMetricsUpdate = useRef(0);

  // Camera movement detection refs
  const lastMousePos = useRef({ x: 0, y: 0 });
  const isCameraMovingRef = useRef(false);
  const cameraMoveTimeout = useRef<NodeJS.Timeout | null>(null);
  const canvasSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);
  useEffect(() => {
    mouseRef.current = mouse;
    idleDetector.current.recordActivity();

    // Simple motion detection based on mouse delta
    const dx = Math.abs(mouse.x - lastMousePos.current.x);
    const dy = Math.abs(mouse.y - lastMousePos.current.y);

    // Threshold for "moving" - lowered to catch subtle momentum
    if (dx > 0.0001 || dy > 0.0001) {
      isCameraMovingRef.current = true;
      if (cameraMoveTimeout.current) clearTimeout(cameraMoveTimeout.current);

      // "Debounce" the stop state - increase timeout to cover momentum
      cameraMoveTimeout.current = setTimeout(() => {
        isCameraMovingRef.current = false;
      }, 300); // Increased from 100ms to 300ms
    }
    lastMousePos.current.x = mouse.x;
    lastMousePos.current.y = mouse.y;
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
      const deltaTimeMs = frameStartTime - lastFrameTime.current;
      lastFrameTime.current = frameStartTime;

      // Unbind all textures to prevent feedback loops across frames
      if (gl) {
        for (let i = 0; i < 8; i++) {
          gl.activeTexture(gl.TEXTURE0 + i);
          gl.bindTexture(gl.TEXTURE_2D, null);
        }
        gl.activeTexture(gl.TEXTURE0); // Return to default
      }

      if (idleDetector.current.isIdle()) {
        targetFrameTime.current =
          1000 / PERFORMANCE_CONFIG.scheduler.idleThrottleFPS;
      } else {
        targetFrameTime.current = PERFORMANCE_CONFIG.scheduler.frameBudgetMs;
      }

      if (deltaTimeMs < targetFrameTime.current) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      const updatedMetrics =
        performanceMonitor.current.updateMetrics(deltaTimeMs);

      // PAUSE LOGIC
      if (!currentParams.paused) {
        timeRef.current += 0.01;
      }

      const isInteractionActive =
        Math.abs(currentMouse.x - mouseRef.current.x) > 0.0001 ||
        Math.abs(currentMouse.y - mouseRef.current.y) > 0.0001 ||
        paramsRef.current !== currentParams;

      const shouldRender = !currentParams.paused || isInteractionActive;

      if (!shouldRender) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      if (gl && program) {
        // If program changed, we MUST reset the batcher to get new uniform locations
        if (uniformBatcher.current.program !== program) {
          uniformBatcher.current.clear();
          uniformBatcher.current.upload(gl, program);
          // Initialize GPU timer on first context usage
          if (!gpuTimer.current.available) {
            gpuTimer.current.initialize(gl);
          }
        }

        const features = currentParams.features || DEFAULT_FEATURES;

        // Dynamic Quality Logic (using refs)
        if (performanceMonitor.current.shouldReduceQuality()) {
          const q = metricsRef.current.quality;
          metricsRef.current.quality =
            q === "ultra" ? "high" : q === "high" ? "medium" : "low";
        } else if (performanceMonitor.current.shouldIncreaseQuality()) {
          const q = metricsRef.current.quality;
          metricsRef.current.quality =
            q === "low" ? "medium" : q === "medium" ? "high" : "ultra";
        }

        // Resolution Logic (using refs)
        if (
          PERFORMANCE_CONFIG.resolution.enableDynamicScaling &&
          setResolutionScale
        ) {
          if (
            updatedMetrics.currentFPS <
            PERFORMANCE_CONFIG.resolution.adaptiveThreshold
          ) {
            metricsRef.current.renderResolution = Math.max(
              PERFORMANCE_CONFIG.resolution.minScale,
              metricsRef.current.renderResolution * 0.9,
            );
          } else if (
            updatedMetrics.currentFPS >
            PERFORMANCE_CONFIG.resolution.recoveryThreshold
          ) {
            metricsRef.current.renderResolution = Math.min(
              PERFORMANCE_CONFIG.resolution.maxScale,
              metricsRef.current.renderResolution * 1.05,
            );
          }
        }

        const maxRaySteps = getMaxRaySteps(features.rayTracingQuality);

        // Throttle UI Updates and Resolution Changes to 5Hz (200ms)
        if (currentTime - lastMetricsUpdate.current > 200) {
          lastMetricsUpdate.current = currentTime;

          // Sync refs to state for UI
          setMetrics({
            ...updatedMetrics,
            quality: metricsRef.current.quality,
            renderResolution: metricsRef.current.renderResolution,
          });

          if (
            setResolutionScale &&
            Math.abs(
              metricsRef.current.renderResolution - (params.renderScale || 1.0),
            ) > 0.05
          ) {
            setResolutionScale(metricsRef.current.renderResolution);
          }
        }

        const bloomManager = bloomManagerRef.current;
        const repoManager = reprojectionManagerRef.current;

        // Resize managers if canvas size changed
        if (
          canvasSizeRef.current.width !== gl.canvas.width ||
          canvasSizeRef.current.height !== gl.canvas.height
        ) {
          canvasSizeRef.current = {
            width: gl.canvas.width,
            height: gl.canvas.height,
          };
          if (bloomManager) {
            bloomManager.resize(gl.canvas.width, gl.canvas.height);
          }
          if (repoManager) {
            repoManager.resize(gl.canvas.width, gl.canvas.height);
          }
        }

        // Sync Bloom Config with UI State
        if (bloomManager) {
          bloomManager.updateConfig({ enabled: !!features.bloom });
        }

        // Force scene to be rendered to texture if Reprojection (TAA) is active
        // Bug 1.1 (frame gating unit mismatch) caused the black screen, NOT TAA.
        // Re-enabled after fix.
        const forceOffscreen = !!repoManager;

        const targetFramebuffer = bloomManager
          ? bloomManager.beginScene(forceOffscreen)
          : null;

        gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.useProgram(program);

        // ... Set Uniforms & Textures ...
        if (noiseTextureRef.current) {
          gl.activeTexture(gl.TEXTURE2);
          gl.bindTexture(gl.TEXTURE_2D, noiseTextureRef.current);
          uniformBatcher.current.set("u_noiseTex", 2);
        }
        if (blueNoiseTextureRef.current) {
          gl.activeTexture(gl.TEXTURE3);
          gl.bindTexture(gl.TEXTURE_2D, blueNoiseTextureRef.current);
          uniformBatcher.current.set1f("u_blueNoiseTex", 3);
        }

        // Optimized Uniform Updates (Zero-Allocation)
        uniformBatcher.current.set2f(
          "u_resolution",
          gl.canvas.width,
          gl.canvas.height,
        );
        uniformBatcher.current.set1f("u_time", timeRef.current);
        uniformBatcher.current.set1f("u_mass", currentParams.mass);
        uniformBatcher.current.set1f(
          "u_disk_density",
          currentParams.diskDensity,
        );
        uniformBatcher.current.set1f("u_disk_temp", currentParams.diskTemp);
        uniformBatcher.current.set2f("u_mouse", currentMouse.x, currentMouse.y);
        // Normalize spin from UI range [-5, 5] to physics range [-1, 1]
        // The Kerr metric requires |a/M| <= 1; sending raw UI values violates this.
        const physSpin = Math.max(
          -1.0,
          Math.min(1.0, currentParams.spin / 5.0),
        );
        uniformBatcher.current.set1f("u_spin", physSpin);
        uniformBatcher.current.set1f(
          "u_lensing_strength",
          currentParams.lensing,
        );
        uniformBatcher.current.set1f("u_zoom", currentParams.zoom);
        uniformBatcher.current.set1f(
          "u_disk_size",
          currentParams.diskSize ?? SIMULATION_CONFIG.diskSize.default,
        );
        uniformBatcher.current.set1f("u_maxRaySteps", maxRaySteps);
        uniformBatcher.current.set1f(
          "u_show_redshift",
          features.gravitationalRedshift ? 1.0 : 0.0,
        );
        uniformBatcher.current.set1f(
          "u_show_kerr_shadow",
          features.kerrShadow ? 1.0 : 0.0,
        );
        uniformBatcher.current.set1f("u_debug", 0.0); // Set to 1.0 to debug shader output

        // Ensure viewport matches canvas dimensions for the draw call
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Critical Fix: Explicitly bind the geometry buffer
        // This ensures the attribute pointer is correct even if other managers changed it
        const quadBuffer = getSharedQuadBuffer(gl);
        if (quadBuffer) {
          setupPositionAttribute(gl, program, "position", quadBuffer);
        }

        // GPU Timing: begin measurement around draw calls
        if (gpuTimer.current.available) {
          gpuTimer.current.beginFrame();
        }

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        if (gpuTimer.current.available) {
          gpuTimer.current.endFrame();
        }

        // Post-processing pipeline:
        //   1. Scene renders into bloom's offscreen FBO
        //   2. If TAA active: blend raw scene with history buffer (before bloom)
        //   3. Apply bloom to either TAA output or raw scene
        //
        // TAA must happen BEFORE bloom to avoid accumulating bloom artifacts
        // in the history buffer (which would cause glow to "grow" over time).
        if (bloomManager && repoManager) {
          // TAA + Bloom pipeline
          const sceneTexture = bloomManager.getSceneTexture();
          if (sceneTexture) {
            // TAA: blend raw scene with history
            repoManager.resolve(sceneTexture, 0.7, isCameraMovingRef.current);
            // Get TAA-stabilized output and apply bloom to it
            const taaResult = repoManager.getResultTexture();
            if (taaResult) {
              bloomManager.applyBloomToTexture(taaResult);
            } else {
              // Fallback: apply bloom directly if TAA result failed
              bloomManager.applyBloom();
            }
          } else {
            bloomManager.applyBloom();
          }
        } else if (bloomManager) {
          // Bloom only (no TAA)
          bloomManager.applyBloom();
        }

        // Safety: Unbind Framebuffer to ensure backbuffer is ready for next frame
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [
    glRef,
    programRef,
    bloomManagerRef,
    reprojectionManagerRef,
    noiseTextureRef,
    blueNoiseTextureRef,
    setResolutionScale,
    params.renderScale,
  ]);

  return { metrics, timeRef };
}
