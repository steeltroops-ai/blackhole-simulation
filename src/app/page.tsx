"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronUp, Bug } from "lucide-react";
import { WebGLCanvas } from "@/components/canvas/WebGLCanvas";
import { ControlPanel } from "@/components/ui/ControlPanel";
import { UserProfile } from "@/components/ui/UserProfile";
import { Telemetry } from "@/components/ui/Telemetry";
import { DebugOverlay } from "@/components/ui/DebugOverlay";
import { useCamera } from "@/hooks/useCamera";
import { useAdaptiveResolution } from "@/hooks/useAdaptiveResolution";
import { useMobileOptimization } from "@/hooks/useMobileOptimization";
import { usePresets } from "@/hooks/usePresets";
import { type SimulationParams, DEFAULT_PARAMS } from "@/types/simulation";
import type { PerformanceMetrics, DebugMetrics } from "@/performance/monitor";
import { PerformanceMonitor } from "@/performance/monitor";
import { DEFAULT_FEATURES } from "@/types/features";
import { settingsStorage } from "@/storage/settings";
import { BenchmarkController } from "@/performance/benchmark";
import type { BenchmarkReport } from "@/performance/benchmark";

const App = () => {
  const { isMobile, getMobileFeatures } = useMobileOptimization();
  const { applyPreset, detectPreset } = usePresets();

  const [params, setParams] = useState<SimulationParams>(() => {
    // Forced Config Authority: Ignore local storage to respect simulation.config.ts defaults
    // const savedFeatures = settingsStorage.loadFeatures();
    // const savedPreset = settingsStorage.loadPreset();

    let initialFeatures = DEFAULT_FEATURES;
    let initialPreset = "ultra-quality";

    if (isMobile) {
      initialFeatures = getMobileFeatures();
      initialPreset = "balanced";
    }
    // else if (savedFeatures) {
    //   initialFeatures = savedFeatures;
    //   initialPreset = savedPreset || detectPreset(savedFeatures);
    // }

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
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debugMetrics, setDebugMetrics] = useState<DebugMetrics | null>(null);
  const [benchmarkReport, setBenchmarkReport] =
    useState<BenchmarkReport | null>(null);
  const [showBenchmarkResults, setShowBenchmarkResults] = useState(false);

  const performanceMonitor = useRef(new PerformanceMonitor());
  const benchmarkController = useRef(new BenchmarkController());

  const { resolutionScale } = useAdaptiveResolution(metrics?.currentFPS || 60, {
    enabled: params.adaptiveResolution,
    onResolutionChange: (scale) => {
      setParams((prev) => ({ ...prev, renderScale: scale }));
    },
  });

  useEffect(() => {
    if (debugEnabled) {
      const interval = setInterval(() => {
        setDebugMetrics(performanceMonitor.current.getDebugMetrics());
      }, 500);
      return () => clearInterval(interval);
    } else {
      setDebugMetrics(null);
    }
  }, [debugEnabled]);

  useEffect(() => {
    if (params.features) {
      settingsStorage.saveFeatures(params.features);
    }
    settingsStorage.savePreset(
      (params.performancePreset ??
        "ultra-quality") as import("@/types/features").PresetName,
    );
  }, [params.features, params.performancePreset]);

  useEffect(() => {
    if (!benchmarkController.current.isRunning() || !metrics) return;
    const currentPreset = benchmarkController.current.update(
      metrics.currentFPS,
    );
    if (currentPreset && currentPreset !== params.performancePreset) {
      setParams((prev) => applyPreset(currentPreset, prev));
    }
  }, [metrics, params.performancePreset, applyPreset]);

  const {
    mouse,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useCamera(params, setParams);

  const startBenchmark = () => {
    benchmarkController.current.start(
      params.features || DEFAULT_FEATURES,
      () => {},
      (report) => {
        setBenchmarkReport(report);
        setShowBenchmarkResults(true);
      },
    );
  };

  const cancelBenchmark = () => {
    const restored = benchmarkController.current.cancel();
    if (restored) setParams((prev) => ({ ...prev, features: restored }));
  };

  const applyRecommendedPreset = () => {
    if (benchmarkReport) {
      setParams((prev) => applyPreset(benchmarkReport.recommendedPreset, prev));
      setShowBenchmarkResults(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none font-sans text-white">
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

      <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />

      <div className="absolute top-0 left-0 w-full p-4 md:p-8 flex justify-between items-start z-30 pointer-events-none">
        {/* SLEEK IDENTITY HUD */}
        <div className="flex flex-col">
          <h1 className="text-lg md:text-xl font-extralight tracking-[0.4em] text-white uppercase leading-none">
            Black Hole
          </h1>
          <div className="flex items-center gap-2.5 mt-2">
            <span className="text-[8px] md:text-[10px] font-mono text-white/70 tracking-[0.2em] uppercase">
              Event Horizon v5.1
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
          </div>
        </div>

        <Telemetry params={params} metrics={metrics} />
      </div>

      <ControlPanel
        params={params}
        onParamsChange={setParams}
        showUI={showUI}
        onToggleUI={setShowUI}
        onStartBenchmark={startBenchmark}
        onCancelBenchmark={cancelBenchmark}
        isBenchmarkRunning={benchmarkController.current.isRunning()}
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

      {benchmarkController.current.isRunning() && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
          <div className="bg-black/90 border border-white/20 rounded-lg p-6 text-white min-w-[250px] text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3"></div>
            <p className="text-sm font-medium">{`Testing ${benchmarkController.current.getCurrentPreset() || "preset"}...`}</p>
            <div className="w-full bg-gray-700 rounded-full h-1.5 mt-3">
              <div
                className="bg-white h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${benchmarkController.current.getCurrentProgress() * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showBenchmarkResults && benchmarkReport && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="max-w-2xl mx-4 p-6 bg-black/95 border border-white/20 rounded-xl shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">
              Benchmark Results
            </h2>
            <div className="space-y-2 mb-4">
              {benchmarkReport.results.map((result) => (
                <div
                  key={result.presetName}
                  className={`p-3 rounded border ${result.presetName === benchmarkReport.recommendedPreset ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">
                      {result.presetName}
                      {result.presetName ===
                        benchmarkReport.recommendedPreset && (
                        <span className="ml-2 text-xs text-green-400">
                          ✓ RECOMMENDED
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-sm font-mono font-bold ${result.averageFPS >= 60 ? "text-green-400" : "text-yellow-400"}`}
                    >
                      {result.averageFPS.toFixed(1)} FPS
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>Min: {result.minFPS.toFixed(1)}</span>
                    <span>Max: {result.maxFPS.toFixed(1)}</span>
                    <span>Time: {result.averageFrameTimeMs.toFixed(1)}ms</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBenchmarkResults(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-sm font-medium"
              >
                Close
              </button>
              <button
                onClick={applyRecommendedPreset}
                className="px-4 py-2 bg-white hover:bg-white/90 text-black rounded text-sm font-medium"
              >
                Apply Recommended
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
