"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { WebGLCanvas } from "@/components/canvas/WebGLCanvas";
import { WebGPUCanvas } from "@/components/canvas/WebGPUCanvas";
import ErrorBoundary from "@/components/debug/ErrorBoundary";
import { IdentityHUD } from "@/components/ui/IdentityHUD";
import { CompatibilityHUD } from "@/components/ui/CompatibilityHUD";
import { useHardwareSupport } from "@/hooks/useHardwareSupport";

// Dynamic Imports for Performance Optimization (SEO)
const ControlPanel = dynamic(
  () => import("@/components/ui/ControlPanel").then((mod) => mod.ControlPanel),
  { ssr: false },
);
const Telemetry = dynamic(
  () => import("@/components/ui/Telemetry").then((mod) => mod.Telemetry),
  { ssr: false },
);
const SimulationInfo = dynamic(
  () =>
    import("@/components/ui/SimulationInfo").then((mod) => mod.SimulationInfo),
  { ssr: false },
);
const BenchmarkResults = dynamic(
  () =>
    import("@/components/ui/BenchmarkResults").then(
      (mod) => mod.BenchmarkResults,
    ),
  { ssr: false },
);
const DebugOverlay = dynamic(
  () => import("@/components/ui/DebugOverlay").then((mod) => mod.DebugOverlay),
  { ssr: false },
);
const CinematicOverlay = dynamic(
  () =>
    import("@/components/ui/CinematicOverlay").then(
      (mod) => mod.CinematicOverlay,
    ),
  { ssr: false },
);

import { useCamera } from "@/hooks/useCamera";
import { useBenchmark } from "@/hooks/useBenchmark";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useUrlState } from "@/hooks/useUrlState";

import { useAdaptiveResolution } from "@/hooks/useAdaptiveResolution";
import { useMobileOptimization } from "@/hooks/useMobileOptimization";
import { usePresets } from "@/hooks/usePresets";
import { type SimulationParams, DEFAULT_PARAMS } from "@/types/simulation";
import type { PerformanceMetrics } from "@/performance/monitor";
import type { DebugMetrics } from "@/components/ui/DebugOverlay";
import { DEFAULT_FEATURES, type PresetName } from "@/types/features";
import { settingsStorage } from "@/storage/settings";
import { useWebGPUSupport } from "@/hooks/useWebGPUSupport";

const App = () => {
  const { isMobile, getMobileFeatures } = useMobileOptimization();
  const { applyPreset } = usePresets();
  const { isSupported: isWebGPUSupported } = useWebGPUSupport();
  const hardwareSupport = useHardwareSupport();

  const [params, setParams] = useState<SimulationParams>(() => {
    // Forced Config Authority: Ignore local storage to respect simulation.config.ts defaults
    let initialFeatures = DEFAULT_FEATURES;
    let initialPreset: PresetName = "ultra-quality";

    if (isMobile) {
      initialFeatures = getMobileFeatures();
      initialPreset = "balanced";
    }

    return {
      ...DEFAULT_PARAMS,
      quality: initialFeatures.rayTracingQuality,
      features: initialFeatures,
      performancePreset: initialPreset,
      adaptiveResolution: false,
    };
  });

  const [showUI, setShowUI] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetrics | undefined>(
    undefined,
  );
  const [isCompact, setIsCompact] = useState(true);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // Phase 5: Extracted benchmark logic into dedicated hook
  const {
    benchmarkReport,
    showBenchmarkResults,
    setShowBenchmarkResults,
    isBenchmarkRunning,
    benchmarkPreset,
    benchmarkProgress,
    startBenchmark,
    cancelBenchmark,
    applyRecommendedPreset,
  } = useBenchmark(params, setParams, metrics, applyPreset);

  useAdaptiveResolution(metrics?.currentFPS || 60, {
    enabled: params.adaptiveResolution,
    onResolutionChange: (scale) => {
      setParams((prev) => ({ ...prev, renderScale: scale }));
    },
  });

  useEffect(() => {
    if (params.features) {
      settingsStorage.saveFeatures(params.features);
    }
    settingsStorage.savePreset(params.performancePreset ?? "ultra-quality");
  }, [params.features, params.performancePreset]);

  const {
    mouse,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    nudgeCamera,
    startCinematic,
    resetCamera,
    isCinematic,
    cinematicMode,
  } = useCamera(params, setParams);

  // Phase 9.5: Debug Overlay
  const [showDebug, setShowDebug] = useState(false);
  const toggleDebug = useCallback(() => setShowDebug((prev) => !prev), []);

  // Phase 7: Keyboard shortcuts for accessibility
  useKeyboard({
    setParams,
    applyPreset,
    setShowUI,
    nudgeCamera,
    toggleDebug,
  });

  // Phase 7: URL hash state for shareable simulation links
  useUrlState(params, setParams);

  // Phase 6: WebGPU Support Hook
  const [useWebGPU, setUseWebGPU] = useState(false);
  const [forceShowCompat, setForceShowCompat] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const requested = urlParams.get("webgpu") === "true";

      if (urlParams.get("debug_hud") === "true") {
        setForceShowCompat(true);
      }

      if (requested && isWebGPUSupported !== false) {
        setUseWebGPU(true);
      } else {
        setUseWebGPU(false);
      }
    }
  }, [isWebGPUSupported]);

  // SELF-HEALING: If hardware IS supported, force-hide the HUD and clean URL
  useEffect(() => {
    if (hardwareSupport.webgl && forceShowCompat) {
      setForceShowCompat(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("debug_hud");
      window.history.replaceState({}, "", url.toString());
    }
  }, [hardwareSupport.webgl, forceShowCompat]);

  useEffect(() => {
    // Trigger Physics Bridge Initialization
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { physicsBridge } = require("@/engine/physics-bridge");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    physicsBridge.ensureInitialized().catch((err: any) => {
      // eslint-disable-next-line no-console
      console.error("Critical Physics Initialization Failure:", err);
    });
  }, [isWebGPUSupported]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none font-sans text-white">
      {(forceShowCompat ||
        (hardwareSupport.isReady && !hardwareSupport.webgl)) && (
        <CompatibilityHUD />
      )}

      <ErrorBoundary>
        {useWebGPU ? (
          <WebGPUCanvas
            params={params}
            mouse={mouse}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMetricsUpdate={setMetrics}
          />
        ) : (
          <WebGLCanvas
            params={params}
            mouse={mouse}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMetricsUpdate={setMetrics}
          />
        )}

        <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />

        <AnimatePresence>
          {showUI && !isInfoExpanded && !(isMobile && !isCompact) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-0 left-0 w-full p-4 md:p-8 flex justify-between items-start z-50 pointer-events-none"
            >
              {/* SLEEK IDENTITY HUD */}
              <IdentityHUD
                isCinematic={isCinematic}
                cinematicMode={cinematicMode}
              />

              <Telemetry params={params} metrics={metrics} />
            </motion.div>
          )}
        </AnimatePresence>

        <CinematicOverlay isCinematic={isCinematic} zoom={params.zoom} />

        <ControlPanel
          params={params}
          onParamsChange={setParams}
          showUI={showUI && !isInfoExpanded}
          onToggleUI={setShowUI}
          isCompact={isCompact}
          onCompactChange={setIsCompact}
          onStartBenchmark={startBenchmark}
          onCancelBenchmark={cancelBenchmark}
          isBenchmarkRunning={isBenchmarkRunning}
          onStartCinematic={startCinematic}
          onResetCamera={resetCamera}
          isCinematic={isCinematic}
        />

        <SimulationInfo
          isVisible={showUI && isCompact}
          isExpanded={isInfoExpanded}
          onToggleExpanded={setIsInfoExpanded}
        />

        {!showUI && (
          <div className="absolute bottom-8 right-8 z-30 animate-fade-in">
            <button
              onClick={() => setShowUI(true)}
              className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full p-3 hover:bg-white/10 transition-all active:scale-95 shadow-lg group"
            >
              <ChevronUp className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
            </button>
          </div>
        )}

        <AnimatePresence>
          {isBenchmarkRunning && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="relative group overflow-hidden rounded-full liquid-glass border border-white/10 shadow-2xl p-2.5 px-6 flex items-center gap-4">
                  {/* Liquid Glass Infrastructure */}
                  <div className="absolute inset-0 liquid-glass-highlight z-1 pointer-events-none" />
                  <div className="absolute inset-x-0 top-0 liquid-glass-top-line z-30" />

                  <div className="relative z-40 flex items-center gap-4">
                    <div className="w-2.5 h-2.5 rounded-full border border-white/20 border-t-white animate-spin shrink-0" />
                    <span className="text-white text-[9.5px] font-black uppercase tracking-[0.2em] leading-none">
                      Optimizing{" "}
                      {benchmarkPreset?.replace("-", " ") ||
                        "Global Parameters"}
                    </span>
                    <span className="text-white/40 text-[8px] font-mono font-black">
                      {Math.round(benchmarkProgress * 100)}%
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {showBenchmarkResults && benchmarkReport && (
          <BenchmarkResults
            report={benchmarkReport}
            onClose={() => setShowBenchmarkResults(false)}
            onApplyRecommended={applyRecommendedPreset}
          />
        )}

        {/* Debug Overlay */}
        <DebugOverlay
          enabled={showDebug}
          onToggle={setShowDebug}
          metrics={
            metrics
              ? ({
                  ...metrics,
                  totalFrameTimeMs: metrics.frameTimeMs,
                } as DebugMetrics)
              : ({
                  totalFrameTimeMs: 0,
                  currentFPS: 0,
                  rollingAverageFPS: 0,
                  renderResolution: 1,
                } as DebugMetrics)
          }
          backend={useWebGPU ? "WebGPU" : "WebGL (CPU)"}
        />
      </ErrorBoundary>
    </div>
  );
};

export default App;
