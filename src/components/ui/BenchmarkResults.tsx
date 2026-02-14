import type { BenchmarkReport } from "@/performance/benchmark";

interface BenchmarkResultsProps {
  report: BenchmarkReport;
  onClose: () => void;
  onApplyRecommended: () => void;
}

export const BenchmarkResults = ({
  report,
  onClose,
  onApplyRecommended,
}: BenchmarkResultsProps) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="max-w-2xl mx-4 p-6 bg-black/95 border border-white/20 rounded-xl shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-4">Benchmark Results</h2>
        <div className="space-y-2 mb-4">
          {report.results.map((result) => (
            <div
              key={result.presetName}
              className={`p-3 rounded border ${result.presetName === report.recommendedPreset ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">
                  {result.presetName}
                  {result.presetName === report.recommendedPreset && (
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
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-sm font-medium"
          >
            Close
          </button>
          <button
            onClick={onApplyRecommended}
            className="px-4 py-2 bg-white hover:bg-white/90 text-black rounded text-sm font-medium"
          >
            Apply Recommended
          </button>
        </div>
      </div>
    </div>
  );
};
