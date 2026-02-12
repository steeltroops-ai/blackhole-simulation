/**
 * FeatureTogglePanel Component
 * Re-engineered with "Liquid Glass" design.
 * Responsive, grid-based layout for fitting within the Horizontal Dashboard.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Info,
  Zap,
  Activity,
  Layers,
  Star,
  Sun,
  Aperture,
  Eye,
} from "lucide-react";
import type { FeatureToggles, RayTracingQuality } from "@/types/features";

interface FeatureTogglePanelProps {
  features: FeatureToggles;
  onFeaturesChange: (features: FeatureToggles) => void;
}

/**
 * Performance cost estimates (ms)
 */
const FEATURE_COSTS: Record<
  keyof FeatureToggles | "rayTracingQuality",
  number
> = {
  gravitationalLensing: 4.5,
  rayTracingQuality: 0,
  accretionDisk: 6.0,
  dopplerBeaming: 2.0,
  backgroundStars: 1.5,
  photonSphereGlow: 0.8,
  bloom: 3.0,
};

const RAY_QUALITY_COSTS: Record<RayTracingQuality, number> = {
  off: 0,
  low: 1.0,
  medium: 3.0,
  high: 6.0,
  ultra: 10.0,
};

const FEATURE_METADATA: Record<
  keyof FeatureToggles,
  { name: string; icon: any; description: string }
> = {
  gravitationalLensing: {
    name: "Gravitational Lensing",
    icon: Aperture,
    description:
      "Bends light rays around the black hole, creating Einstein rings.",
  },
  rayTracingQuality: {
    name: "Ray Quality",
    icon: Layers,
    description: "Detail level of the simulation integration steps.",
  },
  accretionDisk: {
    name: "Accretion Disk",
    icon: Activity,
    description: "Volumetric rendering of the hot plasma disk.",
  },
  dopplerBeaming: {
    name: "Doppler Beaming",
    icon: Zap,
    description: "Relativistic color/brightness shifting due to velocity.",
  },
  backgroundStars: {
    name: "Starfield",
    icon: Star,
    description: "Render background stars with gravitational distortion.",
  },
  photonSphereGlow: {
    name: "Photon Ring",
    icon: Sun,
    description: "Glowing ring at the unstable photon orbit.",
  },
  bloom: {
    name: "Bloom",
    icon: Eye,
    description: "Post-processing glow for bright regions.",
  },
};

const QUALITY_OPTIONS: {
  value: RayTracingQuality;
  label: string;
  steps: number;
}[] = [
  { value: "off", label: "OFF", steps: 0 },
  { value: "low", label: "LOW", steps: 50 },
  { value: "medium", label: "MED", steps: 150 },
  { value: "high", label: "HIGH", steps: 300 },
  { value: "ultra", label: "ULTRA", steps: 500 },
];

export const FeatureTogglePanel = ({
  features,
  onFeaturesChange,
}: FeatureTogglePanelProps) => {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  // Calculate Budget
  const calculateBudget = () => {
    let total = 0;
    const booleanFeatures: (keyof FeatureToggles)[] = [
      "gravitationalLensing",
      "accretionDisk",
      "dopplerBeaming",
      "backgroundStars",
      "photonSphereGlow",
      "bloom",
    ];

    booleanFeatures.forEach((f) => {
      if (features[f]) total += FEATURE_COSTS[f];
    });
    total += RAY_QUALITY_COSTS[features.rayTracingQuality];

    const target = 13.3; // 75 FPS
    return { total, percent: (total / target) * 100 };
  };

  const { total, percent } = calculateBudget();
  const budgetColor =
    percent > 100
      ? "bg-red-500"
      : percent > 80
        ? "bg-amber-500"
        : "bg-emerald-500";
  const budgetTextColor =
    percent > 100
      ? "text-red-300"
      : percent > 80
        ? "text-amber-300"
        : "text-emerald-300";

  const handleToggle = (feature: keyof FeatureToggles) => {
    if (feature === "rayTracingQuality") return;
    onFeaturesChange({ ...features, [feature]: !features[feature] });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Top Row: Quality & Budget */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ray Tracing Quality Segmented Control */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-cyan-200" /> Quality Steps
            </span>
            <span className="text-[9px] font-mono text-cyan-200/80">
              {
                QUALITY_OPTIONS.find(
                  (q) => q.value === features.rayTracingQuality,
                )?.steps
              }{" "}
              steps
            </span>
          </div>
          <div className="flex p-1 bg-black/40 rounded-lg border border-white/10 relative">
            {QUALITY_OPTIONS.map((option) => {
              const isSelected = features.rayTracingQuality === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() =>
                    onFeaturesChange({
                      ...features,
                      rayTracingQuality: option.value,
                    })
                  }
                  className={`flex-1 relative py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all rounded ${
                    isSelected
                      ? "text-black"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeQuality"
                      className="absolute inset-0 bg-cyan-400 rounded shadow-[0_0_10px_rgba(34,211,238,0.4)]"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="relative z-10">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Performance Budget Meter */}
        <div className="flex flex-col gap-2 justify-center">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">
              GPU Budget
            </span>
            <span
              className={`text-[9px] font-mono font-bold ${budgetTextColor}`}
            >
              {total.toFixed(1)}ms / 13.3ms
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
            {/* Tick marks */}
            <div className="absolute left-[75%] top-0 bottom-0 w-px bg-white/10 z-10" />
            <motion.div
              className={`h-full ${budgetColor} shadow-[0_0_10px_currentColor]`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percent, 100)}%` }}
              transition={{ duration: 0.5, ease: "circOut" }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Row: Feature Toggles Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {(Object.keys(FEATURE_METADATA) as (keyof FeatureToggles)[])
          .filter((k) => k !== "rayTracingQuality")
          .map((key) => {
            const meta = FEATURE_METADATA[key];
            const isOn = features[key] as boolean;
            const Icon = meta.icon;
            const cost = FEATURE_COSTS[key];

            return (
              <button
                key={key}
                onClick={() => handleToggle(key)}
                onMouseEnter={() => setHoveredFeature(key)}
                onMouseLeave={() => setHoveredFeature(null)}
                className={`
                                    relative group flex items-center gap-3 p-2 rounded-lg border transition-all duration-300
                                    ${
                                      isOn
                                        ? "bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                                    }
                                `}
              >
                {/* Icon Box */}
                <div
                  className={`p-1.5 rounded-md transition-colors ${isOn ? "bg-cyan-500/20 text-cyan-200" : "bg-white/5 text-gray-500 group-hover:text-gray-300"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* Text Info */}
                <div className="flex flex-col items-start gap-0.5 min-w-0">
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider truncate ${isOn ? "text-white" : "text-gray-400 group-hover:text-gray-300"}`}
                  >
                    {meta.name}
                  </span>
                  <span className="text-[9px] font-mono text-gray-600">
                    ~{cost}ms
                  </span>
                </div>

                {/* Toggle Indicator (Right) */}
                <div
                  className={`ml-auto w-1.5 h-1.5 rounded-full transition-all duration-300 ${isOn ? "bg-cyan-400 shadow-[0_0_8px_currentColor]" : "bg-gray-700"}`}
                />

                {/* Floating Tooltip */}
                <AnimatePresence>
                  {hoveredFeature === key && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-50 pointer-events-none"
                    >
                      <p className="text-[9px] text-gray-300 leading-relaxed font-medium">
                        {meta.description}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
      </div>
    </div>
  );
};
