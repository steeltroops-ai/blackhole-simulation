"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronUp, Bug } from 'lucide-react';
import { WebGLCanvas } from '@/components/canvas/WebGLCanvas';
import { ControlPanel } from '@/components/ui/ControlPanel';
import { Telemetry } from '@/components/ui/Telemetry';
import { DebugOverlay } from '@/components/ui/DebugOverlay';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { useCamera } from '@/hooks/useCamera';
import { useAdaptiveResolution } from '@/hooks/useAdaptiveResolution';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { usePresets } from '@/hooks/usePresets';
import type { SimulationParams } from '@/types/simulation';
import type { PerformanceMetrics, DebugMetrics } from '@/performance/monitor';
import { PerformanceMonitor } from '@/performance/monitor';
import { DEFAULT_FEATURES } from '@/types/features';
import { settingsStorage } from '@/storage/settings';
import { BenchmarkController } from '@/performance/benchmark';
import type { BenchmarkReport } from '@/performance/benchmark';

const App = () => {
  // Mobile optimization hook (Requirements: 16.1, 16.3, 16.4)
  const { isMobile, getMobileFeatures, applyMobileRayStepCap } = useMobileOptimization();

  // Preset management hook (Requirements: 9.1-9.6)
  const { applyPreset, detectPreset } = usePresets();

  // Initialize state with mobile optimizations and saved settings
  // Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
  const [params, setParams] = useState<SimulationParams>(() => {
    // Load saved settings from localStorage
    const savedFeatures = settingsStorage.loadFeatures();
    const savedPreset = settingsStorage.loadPreset();

    // Determine initial features
    let initialFeatures = DEFAULT_FEATURES;
    let initialPreset = 'ultra-quality';

    if (isMobile) {
      // Requirement 16.1: Apply mobile preset on mobile devices
      initialFeatures = getMobileFeatures();
      initialPreset = 'balanced';
    } else if (savedFeatures) {
      // Requirement 17.2: Restore saved settings
      initialFeatures = savedFeatures;
      initialPreset = savedPreset || detectPreset(savedFeatures);
    }

    return {
      mass: 1.2,
      spin: 1.5,
      diskDensity: 3.5,
      diskTemp: 1.3,
      lensing: 1.0,
      paused: false,
      zoom: 14.0,
      quality: 'high',
      features: initialFeatures,
      performancePreset: initialPreset,
      adaptiveResolution: false,
      renderScale: 1.0,
    };
  });

  const [showUI, setShowUI] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetrics | undefined>(undefined);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [debugMetrics, setDebugMetrics] = useState<DebugMetrics | null>(null);
  const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReport | null>(null);
  const [showBenchmarkResults, setShowBenchmarkResults] = useState(false);

  const performanceMonitor = useRef(new PerformanceMonitor());
  const benchmarkController = useRef(new BenchmarkController());

  // Adaptive resolution hook (Requirements: 11.1, 11.2, 11.3, 11.4, 11.5)
  const { resolutionScale } = useAdaptiveResolution(
    metrics?.currentFPS || 60,
    {
      enabled: params.adaptiveResolution,
      onResolutionChange: (scale) => {
        setParams(prev => ({ ...prev, renderScale: scale }));
      }
    }
  );

  // Update debug metrics when debug mode is enabled
  useEffect(() => {
    performanceMonitor.current.setDebugEnabled(debugEnabled);

    if (debugEnabled) {
      // Update debug metrics every 500ms
      const interval = setInterval(() => {
        const metrics = performanceMonitor.current.getDebugMetrics();
        setDebugMetrics(metrics);
      }, 500);

      return () => clearInterval(interval);
    } else {
      setDebugMetrics(null);
    }
  }, [debugEnabled]);

  // Save settings to localStorage when features change
  // Requirements: 17.1, 17.3
  useEffect(() => {
    settingsStorage.saveFeatures(params.features);
    settingsStorage.savePreset(params.performancePreset);
  }, [params.features, params.performancePreset]);

  // Handle benchmark updates
  useEffect(() => {
    if (!benchmarkController.current.isRunning() || !metrics) {
      return;
    }

    const currentPreset = benchmarkController.current.update(metrics.currentFPS);

    if (currentPreset && currentPreset !== params.performancePreset) {
      // Apply the preset being tested
      setParams(prev => applyPreset(currentPreset, prev));
    }
  }, [metrics, params.performancePreset, applyPreset]);

  // Use camera hook for camera state and handlers
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

  // Benchmark control functions (Requirements: 19.1-19.5)
  const startBenchmark = () => {
    benchmarkController.current.start(
      params.features,
      (currentPreset, progress, currentFPS) => {
        // Progress callback - could update UI here
        console.log(`Testing ${currentPreset}: ${(progress * 100).toFixed(0)}% (${currentFPS.toFixed(1)} FPS)`);
      },
      (report) => {
        // Completion callback
        setBenchmarkReport(report);
        setShowBenchmarkResults(true);

        // Restore original settings
        setParams(prev => ({
          ...prev,
          features: report.results[0]?.presetName ? params.features : prev.features,
        }));
      }
    );
  };

  const cancelBenchmark = () => {
    const settingsToRestore = benchmarkController.current.cancel();
    if (settingsToRestore) {
      setParams(prev => ({ ...prev, features: settingsToRestore }));
    }
  };

  const applyRecommendedPreset = () => {
    if (benchmarkReport) {
      setParams(prev => applyPreset(benchmarkReport.recommendedPreset, prev));
      setShowBenchmarkResults(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none font-sans text-white">
      {/* Render Canvas */}
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
        onMetricsUpdate={(m) => setMetrics(m)}
      />

      {/* Overlay Effects */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />

      {/* TOP HEADER LAYOUT */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-20 pointer-events-none">
        <div>
          <h1 className="text-xl md:text-2xl font-extralight tracking-tight text-white/90">
            SINGULARITY <span className="font-bold">OS</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-mono text-gray-400 tracking-widest">SYSTEM NOMINAL</span>
          </div>
        </div>

        {/* TELEMETRY & STATS */}
        <Telemetry
          params={params}
          metrics={metrics}
          budgetUsage={metrics ? performanceMonitor.current.getFrameTimeBudgetUsage() : 0}
        />
      </div>

      {/* BOTTOM CONTROLS DASHBOARD */}
      <ControlPanel
        params={params}
        onParamsChange={setParams}
        showUI={showUI}
        onToggleUI={setShowUI}
        onStartBenchmark={startBenchmark}
        onCancelBenchmark={cancelBenchmark}
        isBenchmarkRunning={benchmarkController.current.isRunning()}
      />

      {/* DEBUG OVERLAY (Requirement 20.5) */}
      {debugMetrics && (
        <DebugOverlay
          enabled={debugEnabled}
          onToggle={setDebugEnabled}
          metrics={debugMetrics}
        />
      )}

      {/* DEBUG TOGGLE BUTTON */}
      <div className="absolute bottom-8 left-8 z-30">
        <button
          onClick={() => setDebugEnabled(!debugEnabled)}
          className={`bg-black/40 backdrop-blur-md border ${debugEnabled ? 'border-red-500/50 bg-red-500/10' : 'border-white/10'
            } rounded-full p-3 hover:bg-white/10 transition-all active:scale-95 shadow-lg group pointer-events-auto`}
          title="Toggle debug overlay"
        >
          <Bug className={`w-5 h-5 ${debugEnabled ? 'text-red-400' : 'text-white/80'
            } group-hover:text-white transition-colors`} />
        </button>
      </div>

      {/* FLOATING TOGGLE BUTTON (Show when Hidden) */}
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

      {/* Tutorial Tip */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20 text-[10px] tracking-[0.3em] pointer-events-none opacity-100 animate-fade-out">
        INTERACTIVE SYSTEM READY
      </div>

      {/* Benchmark Running Indicator */}
      {benchmarkController.current.isRunning() && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
          <LoadingIndicator
            message={`Testing ${benchmarkController.current.getCurrentPreset() || 'preset'}...`}
            progress={benchmarkController.current.getCurrentProgress()}
          />
        </div>
      )}

      {/* Benchmark Results Modal */}
      {showBenchmarkResults && benchmarkReport && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="max-w-2xl mx-4 p-6 bg-black/95 border border-cyan-500/30 rounded-xl shadow-2xl">
            <h2 className="text-xl font-bold text-cyan-400 mb-4">Benchmark Results</h2>

            {/* Results Table */}
            <div className="space-y-2 mb-4">
              {benchmarkReport.results.map((result) => (
                <div
                  key={result.presetName}
                  className={`p-3 rounded border ${result.presetName === benchmarkReport.recommendedPreset
                      ? 'bg-cyan-500/10 border-cyan-500/50'
                      : 'bg-white/5 border-white/10'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">
                      {result.presetName}
                      {result.presetName === benchmarkReport.recommendedPreset && (
                        <span className="ml-2 text-xs text-cyan-400">✓ RECOMMENDED</span>
                      )}
                    </span>
                    <span className={`text-sm font-mono font-bold ${result.averageFPS >= 60 ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                      {result.averageFPS.toFixed(1)} FPS
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>Min: {result.minFPS.toFixed(1)}</span>
                    <span>Max: {result.maxFPS.toFixed(1)}</span>
                    <span>Frame Time: {result.averageFrameTimeMs.toFixed(1)}ms</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Hardware Info */}
            <div className="p-3 bg-white/5 rounded border border-white/10 mb-4">
              <div className="text-xs text-gray-400 space-y-1">
                <div>Device: {benchmarkReport.hardwareInfo.isMobile ? 'Mobile' : 'Desktop'}</div>
                <div>Pixel Ratio: {benchmarkReport.hardwareInfo.devicePixelRatio.toFixed(2)}x</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBenchmarkResults(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-sm font-medium transition-all"
              >
                Close
              </button>
              <button
                onClick={applyRecommendedPreset}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-black rounded text-sm font-medium transition-all"
              >
                Apply Recommended Preset
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;