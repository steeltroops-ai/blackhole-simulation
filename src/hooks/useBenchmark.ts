import { useState, useRef, useEffect, useCallback } from "react";
import { BenchmarkController } from "@/performance/benchmark";
import type { BenchmarkReport } from "@/performance/benchmark";
import type { PerformanceMetrics } from "@/performance/monitor";
import type { SimulationParams } from "@/types/simulation";
import type { FeatureToggles, PresetName } from "@/types/features";
import { DEFAULT_FEATURES } from "@/types/features";

/**
 * Encapsulates all benchmark state and logic.
 * Extracted from page.tsx to reduce component complexity.
 *
 * Phase 5: Architecture -- single-responsibility hook for benchmark lifecycle.
 */
export function useBenchmark(
  params: SimulationParams,
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>,
  metrics: PerformanceMetrics | undefined,
  applyPreset: (preset: PresetName, prev: SimulationParams) => SimulationParams,
) {
  const [benchmarkReport, setBenchmarkReport] =
    useState<BenchmarkReport | null>(null);
  const [showBenchmarkResults, setShowBenchmarkResults] = useState(false);
  const [isBenchmarkRunning, setIsBenchmarkRunning] = useState(false);
  const [benchmarkPreset, setBenchmarkPreset] = useState<string | null>(null);
  const [benchmarkProgress, setBenchmarkProgress] = useState(0);

  const benchmarkController = useRef(new BenchmarkController());

  // Drive the benchmark each frame when running
  useEffect(() => {
    if (!benchmarkController.current.isRunning() || !metrics) return;
    const currentPreset = benchmarkController.current.update(
      metrics.currentFPS,
    );
    if (currentPreset && currentPreset !== params.performancePreset) {
      setParams((prev) => applyPreset(currentPreset, prev));
    }
  }, [metrics, params.performancePreset, applyPreset, setParams]);

  const startBenchmark = useCallback(() => {
    setIsBenchmarkRunning(true);
    setBenchmarkProgress(0);
    benchmarkController.current.start(
      params.features || DEFAULT_FEATURES,
      (preset, progress) => {
        setBenchmarkPreset(preset);
        setBenchmarkProgress(progress);
      },
      (report) => {
        setBenchmarkReport(report);
        setShowBenchmarkResults(true);
        setIsBenchmarkRunning(false);
      },
    );
  }, [params.features]);

  const cancelBenchmark = useCallback(() => {
    const restored = benchmarkController.current.cancel();
    if (restored)
      setParams((prev) => ({ ...prev, features: restored as FeatureToggles }));
    setIsBenchmarkRunning(false);
  }, [setParams]);

  const applyRecommendedPreset = useCallback(() => {
    if (benchmarkReport) {
      setParams((prev) => applyPreset(benchmarkReport.recommendedPreset, prev));
      setShowBenchmarkResults(false);
    }
  }, [benchmarkReport, applyPreset, setParams]);

  return {
    benchmarkReport,
    showBenchmarkResults,
    setShowBenchmarkResults,
    isBenchmarkRunning,
    benchmarkPreset,
    benchmarkProgress,
    startBenchmark,
    cancelBenchmark,
    applyRecommendedPreset,
  };
}
