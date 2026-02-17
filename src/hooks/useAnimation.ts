import { useEffect, useRef } from "react";
import type { SimulationParams, MouseState } from "@/types/simulation";
import { getMaxRaySteps, DEFAULT_FEATURES } from "@/types/features";
import { PerformanceMonitor } from "@/performance/monitor";
import type { PerformanceMetrics } from "@/performance/monitor";
import { UniformBatcher, IdleDetector } from "@/utils/cpu-optimizations";
import type { BloomManager } from "@/rendering/bloom";
import type { ReprojectionManager } from "@/rendering/reprojection"; // Added import
import { SIMULATION_CONFIG } from "@/configs/simulation.config";
import { PERFORMANCE_CONFIG } from "@/configs/performance.config";
import { getSharedQuadBuffer } from "@/utils/webgl-utils";
import { GPUTimer } from "@/performance/gpu-timer";

import { physicsBridge } from "@/engine/physics-bridge";

interface AnimationRefs {
  glRef: React.RefObject<WebGL2RenderingContext | null>;
  programRef: React.RefObject<WebGLProgram | null>;
  bloomManagerRef: React.MutableRefObject<BloomManager | null>;
  reprojectionManagerRef: React.MutableRefObject<ReprojectionManager | null>;
  noiseTextureRef: React.MutableRefObject<WebGLTexture | null>;
  blueNoiseTextureRef: React.MutableRefObject<WebGLTexture | null>;
  diskLUTTextureRef: React.MutableRefObject<WebGLTexture | null>;
  spectrumLUTTextureRef: React.MutableRefObject<WebGLTexture | null>;
}

// eslint-disable-next-line max-params
export function useAnimation(
  {
    glRef,
    programRef,
    bloomManagerRef,
    reprojectionManagerRef,
    noiseTextureRef,
    blueNoiseTextureRef,
    diskLUTTextureRef,
    spectrumLUTTextureRef,
  }: AnimationRefs,
  params: SimulationParams,
  mouse: MouseState,
  setResolutionScale?: (scale: number) => void,
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void,
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
    quality: params.features?.rayTracingQuality || "high",
    renderResolution: params.renderScale || 1.0,
  };

  const metricsRef = useRef<PerformanceMetrics>(initialMetrics);

  const lastFrameTime = useRef(0);
  const smoothedDeltaTime = useRef(16.67); // 60 FPS default
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

  // Initialize Physics Textures (LUTs)
  useEffect(() => {
    // Poll for physics engine readiness
    // In a real app, use a proper loading state context
    const initTextures = async () => {
      if (!glRef.current) return;
      const gl = glRef.current;

      // Import dynamically to avoid circular dependencies if needed,
      // but here we use the global instance.
      // Using top-level imported physicsBridge

      // Dynamic import to avoid no-var-requires
      const { createTextureFromData } = await import("@/utils/webgl-utils");

      if (physicsBridge && !diskLUTTextureRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const diskData = (physicsBridge as any).getDiskLUT();
        if (diskData) {
          // Disk LUT is 1D array of temperatures. 512x1
          // We use R32F format
          diskLUTTextureRef.current = createTextureFromData(gl, {
            width: 512,
            height: 1,
            data: diskData,
            minFilter: gl.LINEAR,
            magFilter: gl.LINEAR,
            wrap: gl.CLAMP_TO_EDGE,
            internalFormat: gl.R32F,
            format: gl.RED,
            type: gl.FLOAT,
          });
        }
      }

      if (physicsBridge && !spectrumLUTTextureRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spectrumData = (physicsBridge as any).getSpectrumLUT(
          512,
          1,
          100000.0,
        );
        if (spectrumData) {
          // Spectrum LUT is RGBA (r,g,b,a)
          spectrumLUTTextureRef.current = createTextureFromData(gl, {
            width: 512,
            height: 1,
            data: spectrumData,
            minFilter: gl.LINEAR,
            magFilter: gl.LINEAR,
            wrap: gl.CLAMP_TO_EDGE,
            internalFormat: gl.RGBA32F,
            format: gl.RGBA,
            type: gl.FLOAT,
          });
        }
      }
    };

    // Try immediately and then on a short delay to catch WASM load
    initTextures();
    const timer = setTimeout(initTextures, 1000);
    return () => clearTimeout(timer);
  }, [glRef, diskLUTTextureRef, spectrumLUTTextureRef]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const animate = async (currentTime: number) => {
      if (!isVisible.current) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      const gl = glRef.current;
      const program = programRef.current;
      const currentParams = paramsRef.current;
      const currentMouse = mouseRef.current;

      const frameStartTime = performance.now();
      const rawDeltaTime = frameStartTime - lastFrameTime.current;
      lastFrameTime.current = frameStartTime;

      // Filter out huge spikes from tab switching
      const cappedDelta = Math.min(rawDeltaTime, 100);

      // Moving Average Smoothing (Exponential)
      smoothedDeltaTime.current =
        smoothedDeltaTime.current * 0.8 + cappedDelta * 0.2;
      const deltaTimeMs = smoothedDeltaTime.current;

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

      // -------------------------------------

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

          // Initializing hardware measurement
          if (!gpuTimer.current.available) {
            gpuTimer.current.initialize(gl);
          }

          // Phase 4.3: Shader Warmup
          // Perform 1x1 dummy draw to prime the driver
          // Perform 1x1 dummy draw to prime the driver
          const { warmupShader } = await import("@/utils/webgl-utils");
          const qb = getSharedQuadBuffer(gl);
          if (qb) {
            warmupShader(gl, program, qb);
          }
        }

        gl.useProgram(program); // Ensure program is active before setting uniforms

        // --- Zero-Copy Physics Integration ---
        const physicsResult =
          physicsBridge && physicsBridge.isReady()
            ? physicsBridge.tick(deltaTimeMs / 1000.0)
            : null;

        if (physicsResult) {
          // Layout: [0..2: pos, 8..11: orientation]
          const cam = physicsResult.camera;
          uniformBatcher.current.set3f("u_camPos", cam[0], cam[1], cam[2]);
          uniformBatcher.current.set4f(
            "u_camQuat",
            cam[8],
            cam[9],
            cam[10],
            cam[11],
          );
        }
        // -------------------------------------

        const features = currentParams.features || DEFAULT_FEATURES;

        // Phase 4.1: PID-Stabilized Metrics
        // The PerformanceMonitor already updated these via applyPIDScaling
        metricsRef.current.quality = updatedMetrics.quality;
        metricsRef.current.renderResolution = updatedMetrics.renderResolution;

        const maxRaySteps = getMaxRaySteps(features.rayTracingQuality);

        // Throttle UI Updates (5Hz / 200ms)
        if (currentTime - lastMetricsUpdate.current > 200) {
          lastMetricsUpdate.current = currentTime;

          // Sync refs to state for UI (Visual Only)
          if (onMetricsUpdate) {
            onMetricsUpdate({
              ...updatedMetrics,
              quality: metricsRef.current.quality,
              renderResolution: metricsRef.current.renderResolution,
            });
          }
        }

        // Throttle Resolution Changes (0.5Hz / 2000ms) to prevent context thrashing
        // Only if dynamic scaling is enabled
        if (
          setResolutionScale &&
          PERFORMANCE_CONFIG.resolution.enableDynamicScaling &&
          currentTime - (lastMetricsUpdate.current || 0) > 2000
        ) {
          // Wait, lastMetricsUpdate is reset above. Need separate timer.
        }

        // Let's use a separate timer for resolution
        if (!gpuTimer.current.lastResolutionChange) {
          gpuTimer.current.lastResolutionChange = currentTime;
        }

        // Resolution Logic: Phase 2.3 (Virtual Viewport)
        // We no longer call setResolutionScale here.
        // Instead, the renderResolution is used internally to set gl.viewport.
        // This provides instantaneous scaling without canvas resize freezes.

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

        // Phase 2.3: Virtual Viewport Scaling
        // Render simulations at fractional resolution into full-size FBO
        const renderScale = metricsRef.current.renderResolution;
        gl.viewport(
          0,
          0,
          gl.canvas.width * renderScale,
          gl.canvas.height * renderScale,
        );

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
        if (diskLUTTextureRef.current) {
          gl.activeTexture(gl.TEXTURE4);
          gl.bindTexture(gl.TEXTURE_2D, diskLUTTextureRef.current);
          uniformBatcher.current.set1f("u_diskLUT", 4);
        }
        if (spectrumLUTTextureRef.current) {
          gl.activeTexture(gl.TEXTURE5);
          gl.bindTexture(gl.TEXTURE_2D, spectrumLUTTextureRef.current);
          uniformBatcher.current.set1f("u_spectrumLUT", 5);
        }

        // Optimized Uniform Updates (Zero-Allocation)
        // Shader needs scaled resolution for correct ray calculations
        uniformBatcher.current.set2f(
          "u_resolution",
          gl.canvas.width * renderScale,
          gl.canvas.height * renderScale,
        );
        uniformBatcher.current.set1f("u_time", timeRef.current);
        uniformBatcher.current.set1f("u_mass", currentParams.mass);
        uniformBatcher.current.set1f(
          "u_disk_density",
          currentParams.diskDensity,
        );
        uniformBatcher.current.set1f("u_disk_temp", currentParams.diskTemp);
        uniformBatcher.current.set2f("u_mouse", currentMouse.x, currentMouse.y);
        // Spin is already normalized to [-1, 1] by the UI.
        // Convert to Kerr parameter a = J/M = a_* * M.
        // Shader expects 'a' (length), not dimensionless a_*.
        const physSpin = currentParams.spin * currentParams.mass;
        uniformBatcher.current.set1f("u_spin", physSpin);
        uniformBatcher.current.set1f(
          "u_lensing_strength",
          currentParams.lensing,
        );
        // Zoom is in Rs (Schwarzschild Radii). Rs = 2M.
        // Shader expects absolute distance.
        const r_obs = currentParams.zoom * 2.0 * currentParams.mass;
        uniformBatcher.current.set1f("u_zoom", r_obs);

        // Disk Size is in Rs multiplier. Shader uses diskOuter = M * u_disk_size.
        // We want diskOuter = M * (diskSize_Rs * 2).
        const diskSizeM =
          (currentParams.diskSize ?? SIMULATION_CONFIG.diskSize.default) * 2.0;
        uniformBatcher.current.set1f("u_disk_size", diskSizeM);
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
        const quadBuffer = getSharedQuadBuffer(gl);
        if (quadBuffer) {
          uniformBatcher.current.setupAttribute("position", quadBuffer);
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
            repoManager.resolve(
              sceneTexture,
              0.7,
              isCameraMovingRef.current,
              renderScale,
            );
            // Get TAA-stabilized output and apply bloom to it
            const taaResult = repoManager.getResultTexture();
            if (taaResult) {
              bloomManager.applyBloomToTexture(taaResult, renderScale);
            } else {
              // Fallback: apply bloom directly if TAA result failed
              bloomManager.applyBloom(renderScale);
            }
          } else {
            bloomManager.applyBloom(renderScale);
          }
        } else if (bloomManager) {
          // Bloom only (no TAA)
          bloomManager.applyBloom(renderScale);
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
    diskLUTTextureRef,
    spectrumLUTTextureRef,
    setResolutionScale,
    onMetricsUpdate,
  ]);

  return {
    metrics: metricsRef.current,
  };
}
