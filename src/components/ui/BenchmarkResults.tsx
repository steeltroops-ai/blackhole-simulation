import { motion } from "framer-motion";
import { Zap, Check, Activity, X } from "lucide-react";
import type { BenchmarkReport } from "@/performance/benchmark";

interface BenchmarkResultsProps {
  report: BenchmarkReport;
  onClose: () => void;
  onApplyRecommended: () => void;
}

const getTierInfo = (fps: number) => {
  if (fps >= 60)
    return {
      label: "Ultra Smooth",
      color: "text-green-400",
      bg: "bg-green-500/20",
    };
  if (fps >= 35)
    return {
      label: "Stable High",
      color: "text-blue-400",
      bg: "bg-blue-500/20",
    };
  if (fps >= 24)
    return {
      label: "Cinematic",
      color: "text-yellow-400",
      bg: "bg-yellow-500/20",
    };
  return {
    label: "Low Performance",
    color: "text-red-400",
    bg: "bg-red-500/20",
  };
};

export const BenchmarkResults = ({
  report,
  onClose,
  onApplyRecommended,
}: BenchmarkResultsProps) => {
  const recommendedResult = report.results.find(
    (r) => r.presetName === report.recommendedPreset,
  );
  const recommendedTier = recommendedResult
    ? getTierInfo(recommendedResult.averageFPS)
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20">
      <motion.div
        initial={{ y: 15, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 15, opacity: 0, scale: 0.98 }}
        className="relative group w-full max-w-[320px] overflow-hidden rounded-3xl liquid-glass border border-white/10 shadow-2xl"
      >
        {/* Liquid Glass Infrastructure */}
        <div className="absolute inset-0 liquid-glass-highlight z-1 pointer-events-none" />
        <div className="absolute inset-x-0 top-0 liquid-glass-top-line z-30" />

        <div className="relative z-40 p-6 md:p-8">
          {/* Diagnostic Header */}
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/5">
            <div className="flex items-center gap-2.5 text-white/30">
              <Activity className="w-3 h-3" />
              <span className="text-[8.5px] font-black tracking-[0.25em] uppercase">
                Stability Evaluation
              </span>
            </div>
            <button
              onClick={onClose}
              className="hover:text-white transition-colors"
            >
              <X className="w-3 h-3 text-white/20" />
            </button>
          </div>

          {/* Optimized Target Card */}
          {recommendedResult && (
            <div className="mb-5">
              <div className="bg-white/[0.04] p-4 rounded-2xl border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-20">
                  <Zap className={`w-4 h-4 ${recommendedTier?.color}`} />
                </div>
                <div className="text-[7.5px] text-white/20 uppercase tracking-[0.2em] font-black mb-2">
                  Recommended Setup
                </div>
                <h3 className="text-white text-[13px] font-black uppercase tracking-tight leading-none mb-2.5">
                  {report.recommendedPreset.replace("-", " ")}
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-white font-mono text-xl font-black leading-none">
                    {recommendedResult.averageFPS.toFixed(0)}
                  </span>
                  <span className="text-[8px] text-white/20 font-mono uppercase">
                    FPS
                  </span>
                  <div
                    className={`ml-auto px-2.5 py-0.5 rounded-sm bg-white/5 text-[7px] font-black ${recommendedTier?.color} uppercase tracking-widest`}
                  >
                    {recommendedTier?.label}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preset Registry */}
          <div className="space-y-2 mb-6">
            {report.results.map((result) => {
              const isRecommended =
                result.presetName === report.recommendedPreset;
              const tier = getTierInfo(result.averageFPS);

              return (
                <div
                  key={result.presetName}
                  className={`px-4 py-2.5 rounded-xl flex items-center justify-between border transition-all ${
                    isRecommended
                      ? "bg-white/5 border-white/10"
                      : "bg-transparent border-white/5 opacity-40 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-1 h-1 rounded-full ${isRecommended ? "bg-white shadow-[0_0_10px_white]" : "bg-white/10"}`}
                    />
                    <span
                      className={`text-[8.5px] font-black uppercase tracking-[0.1em] ${isRecommended ? "text-white" : "text-white/40"}`}
                    >
                      {result.presetName.replace("-", " ")}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-black ${isRecommended ? tier.color : "text-white/20"}`}
                  >
                    {result.averageFPS.toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Technical Execution Link */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/5 text-white/40 text-[8px] font-black uppercase tracking-widest hover:text-white hover:bg-white/5 transition-all"
            >
              Discard
            </button>
            <button
              onClick={onApplyRecommended}
              className="flex-1 py-2.5 rounded-xl bg-white text-black text-[8.5px] font-black uppercase tracking-[0.25em] hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-3 h-3" />
              Apply Settings
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
