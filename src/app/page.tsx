"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { WebGLCanvas } from "@/components/canvas/WebGLCanvas";
import { WebGPUCanvas } from "@/components/canvas/WebGPUCanvas";
import ErrorBoundary from "@/components/debug/ErrorBoundary";
import { ControlPanel } from "@/components/ui/ControlPanel";
import { Telemetry } from "@/components/ui/Telemetry";
import { SimulationInfo } from "@/components/ui/SimulationInfo";
import { IdentityHUD } from "@/components/ui/IdentityHUD";
import { BenchmarkResults } from "@/components/ui/BenchmarkResults";
import { DebugOverlay, type DebugMetrics } from "@/components/ui/DebugOverlay";
import { useCamera } from "@/hooks/useCamera";
import { useBenchmark } from "@/hooks/useBenchmark";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useUrlState } from "@/hooks/useUrlState";

import { useAdaptiveResolution } from "@/hooks/useAdaptiveResolution";
import { useMobileOptimization } from "@/hooks/useMobileOptimization";
import { usePresets } from "@/hooks/usePresets";
import { type SimulationParams, DEFAULT_PARAMS } from "@/types/simulation";
import type { PerformanceMetrics } from "@/performance/monitor";
import { DEFAULT_FEATURES, type PresetName } from "@/types/features";
import { settingsStorage } from "@/storage/settings";
import { useWebGPUSupport } from "@/hooks/useWebGPUSupport";

const App = () => {
  const { isMobile, getMobileFeatures } = useMobileOptimization();
  const { applyPreset } = usePresets();
  const { isSupported: isWebGPUSupported } = useWebGPUSupport();

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const requested = urlParams.get("webgpu") === "true";
      // Only enable if requested AND supported (or forced for testing?)
      // Let's allow force if supported is unknown/true, but fallback if explicitly false?
      // For now: require explicit URL param + browser support
      if (requested && isWebGPUSupported !== false) {
        setUseWebGPU(true);
      } else {
        setUseWebGPU(false);
      }
    }
  }, [isWebGPUSupported]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none font-sans text-white">
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
          {showUI && !isInfoExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-0 left-0 w-full p-4 md:p-8 flex justify-between items-start z-50 pointer-events-none"
            >
              {/* SLEEK IDENTITY HUD */}
              <IdentityHUD />

              <Telemetry params={params} metrics={metrics} />
            </motion.div>
          )}
        </AnimatePresence>

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

        {isBenchmarkRunning && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
            <div className="bg-black/90 border border-white/20 rounded-lg p-6 text-white min-w-[250px] text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3" />
              <p className="text-sm font-medium">{`Testing ${benchmarkPreset || "preset"}...`}</p>
              <div className="w-full bg-gray-700 rounded-full h-1.5 mt-3">
                <div
                  className="bg-white h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${benchmarkProgress * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

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
