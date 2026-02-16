/**
 * ControlPanel Component
 * Scientific Real-Time Interface
 *
 * Provides centralized control over simulation parameters, feature toggles, and performance settings.
 */

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Power,
  RefreshCcw,
  Settings,
  Zap,
  Star,
  Sun,
  Disc,
  Sparkles,
} from "lucide-react";
import { UserProfile } from "./UserProfile";
import { type SimulationParams, DEFAULT_PARAMS } from "@/types/simulation";
import { SIMULATION_CONFIG } from "@/configs/simulation.config";
import { usePhysicsState } from "@/hooks/usePhysicsState";
import { clampAndValidate } from "@/utils/validation";
import { usePresets } from "@/hooks/usePresets";
import type {
  PresetName,
  FeatureToggles,
  RayTracingQuality,
} from "@/types/features";

interface ControlPanelProps {
  params: SimulationParams;
  onParamsChange: (params: SimulationParams) => void;
  showUI: boolean;
  onToggleUI: (show: boolean) => void;
  onStartBenchmark?: () => void;
  onCancelBenchmark?: () => void;
  isBenchmarkRunning?: boolean;
  isCompact: boolean;
  onCompactChange: (compact: boolean) => void;
  onStartCinematic?: (path: "orbit" | "dive") => void;
  onResetCamera?: () => void;
  isCinematic?: boolean;
}

const PRESETS: { id: PresetName; label: string }[] = [
  { id: "maximum-performance", label: "Max Perf" },
  { id: "balanced", label: "Balanced" },
  { id: "high-quality", label: "High Qual" },
  { id: "ultra-quality", label: "Ultra" },
];

const ControlSlider = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
  decimals = 1,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit: string;
  decimals?: number;
}) => (
  <div className="mb-4 last:mb-0 group select-none">
    <div className="flex justify-between items-center mb-1.5 px-0.5">
      <span className="text-[9px] uppercase tracking-[0.2em] text-white/50 font-black group-hover:text-white transition-colors">
        {label}
      </span>
      <span className="font-mono text-[10px] text-white font-bold tabular-nums">
        {value.toFixed(decimals)}
        <span className="text-white/40 ml-1 text-[8px] uppercase">{unit}</span>
      </span>
    </div>
    <div className="relative h-4 w-full flex items-center">
      <div className="absolute left-0 right-0 h-[2px] bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-white/20 to-white/90 rounded-full transition-all duration-300"
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
      />
      <div
        className="absolute w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)] pointer-events-none z-10 border border-white/50 group-hover:scale-125 transition-[transform,opacity,scale]"
        style={{
          left: `calc(${((value - min) / (max - min)) * 100}% - 5px)`,
        }}
      />
    </div>
  </div>
);

const QUALITY_LEVELS: { id: RayTracingQuality; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Med" },
  { id: "high", label: "High" },
  { id: "ultra", label: "Ultra" },
];

const SectionHeader = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 text-white mb-4 px-0.5">
    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]" />
    <span className="text-[8px] font-black uppercase tracking-[0.3em] whitespace-nowrap">
      {label}
    </span>
    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-2" />
  </div>
);

export const ControlPanel = ({
  params,
  onParamsChange,
  showUI,
  onToggleUI,
  onStartBenchmark,
  onCancelBenchmark,
  isBenchmarkRunning,
  isCompact,
  onCompactChange,
  onStartCinematic,
  onResetCamera,
  isCinematic,
}: ControlPanelProps) => {
  const [isResetting, setIsResetting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "simulation" | "performance" | "features"
  >("simulation");

  const { applyPreset } = usePresets();
  const physicsState = usePhysicsState(params);

  const calculatedRadii = useMemo(
    () => ({
      eventHorizon: physicsState.eventHorizonRadius,
      photonSphere: physicsState.photonSphereRadius,
      isco: physicsState.iscoRadius,
    }),
    [physicsState],
  );

  const handleReset = useCallback(() => {
    setIsResetting(true);
    onParamsChange(DEFAULT_PARAMS);
    if (onResetCamera) onResetCamera();
    setTimeout(() => setIsResetting(false), 500);
  }, [onParamsChange, onResetCamera]);

  // Debounced/Throttled handler is not strictly here, expecting parent optimization
  // But we wrap in useCallback
  const handleParamChange = useCallback(
    (newParams: SimulationParams) => {
      const validatedParams: SimulationParams = {
        ...newParams,
        mass: clampAndValidate(
          newParams.mass,
          SIMULATION_CONFIG.mass.min,
          SIMULATION_CONFIG.mass.max,
          DEFAULT_PARAMS.mass,
        ),
        spin: clampAndValidate(
          newParams.spin,
          SIMULATION_CONFIG.spin.min,
          SIMULATION_CONFIG.spin.max,
          DEFAULT_PARAMS.spin,
        ),
        diskDensity: clampAndValidate(
          newParams.diskDensity,
          SIMULATION_CONFIG.diskDensity.min,
          SIMULATION_CONFIG.diskDensity.max,
          DEFAULT_PARAMS.diskDensity,
        ),
        diskTemp: clampAndValidate(
          newParams.diskTemp,
          SIMULATION_CONFIG.diskTemp.min,
          SIMULATION_CONFIG.diskTemp.max,
          DEFAULT_PARAMS.diskTemp,
        ),
        lensing: clampAndValidate(
          newParams.lensing,
          SIMULATION_CONFIG.lensing.min,
          SIMULATION_CONFIG.lensing.max,
          DEFAULT_PARAMS.lensing,
        ),
        zoom: clampAndValidate(
          newParams.zoom,
          SIMULATION_CONFIG.zoom.min,
          SIMULATION_CONFIG.zoom.max,
          DEFAULT_PARAMS.zoom,
        ),
        autoSpin: clampAndValidate(
          newParams.autoSpin ?? SIMULATION_CONFIG.autoSpin.default,
          SIMULATION_CONFIG.autoSpin.min,
          SIMULATION_CONFIG.autoSpin.max,
          DEFAULT_PARAMS.autoSpin,
        ),
        diskSize: clampAndValidate(
          newParams.diskSize ?? SIMULATION_CONFIG.diskSize.default,
          SIMULATION_CONFIG.diskSize.min,
          SIMULATION_CONFIG.diskSize.max,
          DEFAULT_PARAMS.diskSize,
        ),
        renderScale: clampAndValidate(
          newParams.renderScale ?? SIMULATION_CONFIG.renderScale.default,
          SIMULATION_CONFIG.renderScale.min,
          SIMULATION_CONFIG.renderScale.max,
          DEFAULT_PARAMS.renderScale,
        ),
        paused: newParams.paused,
      };
      onParamsChange(validatedParams);
    },
    [onParamsChange],
  );

  const toggleFeature = useCallback(
    (key: keyof FeatureToggles) => {
      if (!params.features) return;
      const currentVal = params.features[key];
      if (typeof currentVal !== "boolean") return;
      const newFeatures = { ...params.features, [key]: !currentVal };
      onParamsChange({
        ...params,
        features: newFeatures,
        performancePreset: "custom",
      });
    },
    [params, onParamsChange],
  );

  const setQuality = useCallback(
    (q: RayTracingQuality) => {
      if (!params.features) return;
      const newFeatures = { ...params.features, rayTracingQuality: q };
      onParamsChange({
        ...params,
        features: newFeatures,
        performancePreset: "custom",
      });
    },
    [params, onParamsChange],
  );

  const renderToggle = (
    label: string,
    isActive: boolean,
    onClick: () => void,
    icon?: React.ComponentType<{ className?: string }>,
    key?: string,
  ) => {
    const Icon = icon;
    return (
      <button
        key={key}
        onClick={onClick}
        className={`
          flex items-center gap-2 p-1.5 px-2 rounded-lg border transition-all duration-300 relative group/btn overflow-hidden w-full
          ${
            isActive
              ? "bg-white/10 text-white border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
              : "bg-white/[0.02] text-white/40 border-white/5 hover:bg-white/[0.05] hover:border-white/10 hover:text-white"
          }
        `}
      >
        {Icon && (
          <Icon
            className={`w-3 h-3 shrink-0 transition-all duration-500 ${isActive ? "text-white icon-glow" : "text-white/80 group-hover/btn:text-white"}`}
          />
        )}
        <span
          className={`text-[7.5px] uppercase font-black tracking-[0.1em] truncate transition-colors duration-300 ${isActive ? "text-white" : "text-white/30"}`}
        >
          {label}
        </span>
        <div
          className={`ml-auto w-4.5 h-2 rounded-full border transition-all duration-300 shrink-0 relative ${
            isActive
              ? "bg-white/20 border-white/30"
              : "bg-white/5 border-white/10"
          }`}
        >
          <div
            className={`absolute top-0.5 w-1 h-1 rounded-full transition-all duration-300 ${
              isActive
                ? "left-2.5 bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)]"
                : "left-0.5 bg-white/20"
            }`}
          />
        </div>
      </button>
    );
  };

  const renderPresetButton = (
    label: string,
    isActive: boolean,
    onClick: () => void,
    key?: string,
  ) => (
    <button
      key={key}
      onClick={onClick}
      className={`
        flex items-center justify-center p-1.5 px-2.5 rounded-lg border transition-all duration-300 relative group/btn overflow-hidden
        ${
          isActive
            ? "bg-white/10 text-white border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.05)] scale-[1.01]"
            : "bg-white/[0.02] text-white/40 border-white/5 hover:bg-white/[0.05] hover:border-white/10 hover:text-white"
        }
      `}
    >
      <span
        className={`text-[7.5px] uppercase font-black tracking-[0.1em] truncate transition-colors duration-300 ${isActive ? "text-white" : "text-white/20"}`}
      >
        {label}
      </span>
    </button>
  );

  return (
    <AnimatePresence mode="wait">
      {showUI &&
        (isCompact ? (
          /* --- COMPACT MODE: FLOATING ACCESS NODE --- */
          <motion.div
            key="compact-node"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 p-2"
          >
            <div className="flex flex-col-reverse items-center justify-center">
              <button
                onClick={() => onCompactChange(false)}
                className="text-white hover:text-white/80 transition-colors"
                title="Open Settings"
              >
                <Settings className="w-6 h-6 sm:w-7 h-7 lg:w-8 h-8 animate-[spin_8s_linear_infinite] opacity-80 hover:opacity-100" />
              </button>
              <UserProfile />
            </div>
          </motion.div>
        ) : (
          /* --- FULL MODE: UNIFIED CONTROL CHASSIS (Adaptive Panels) --- */
          <div className="fixed bottom-0 left-0 w-full h-full pointer-events-none z-30 flex flex-col items-center justify-end p-2 sm:p-4 pb-4">
            <motion.div
              key="full-system"
              initial={{ y: 50, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 150, damping: 25 }}
              className="w-[98%] sm:w-[94%] lg:max-w-4xl xl:max-w-5xl pointer-events-auto"
            >
              <div className="relative group overflow-hidden rounded-3xl liquid-glass border border-white/10 shadow-2xl">
                {/* Liquid Glass Infrastructure */}
                <div className="absolute inset-0 liquid-glass-highlight z-1 pointer-events-none" />
                <div className="absolute inset-x-0 top-0 liquid-glass-top-line z-30" />

                {/* CONTENT LAYER: High-Density Active Manifold */}
                <div className="relative z-40 p-5 md:p-8">
                  {/* Header Anchor: Identity & Responsive Telemetry */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <Image
                        src="/icon.png"
                        alt="Project Icon"
                        width={48}
                        height={48}
                        className="w-12 h-12 object-contain icon-glow shrink-0"
                        priority
                      />
                      <div>
                        <h2 className="text-white text-[13px] font-extralight tracking-[0.3em] uppercase leading-none mb-1 text-glow">
                          Scientific Visualization
                        </h2>
                        <div className="flex items-center gap-2">
                          <p className="text-white/60 text-[7px] font-mono tracking-[0.15em] font-medium uppercase">
                            by Mayank _@steeltroops_ai
                          </p>
                          <button
                            onClick={() => onToggleUI(false)}
                            className="text-[9px] text-white/40 hover:text-white uppercase tracking-widest border border-white/10 px-1.5 rounded-sm hover:bg-white/10 transition-colors"
                          >
                            Hide
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Unified Responsive Telemetry Rail */}
                    <div className="flex flex-wrap items-center justify-around gap-4 sm:gap-6 px-4 py-2 bg-white/[0.03] rounded-2xl border border-white/5 w-full sm:w-auto">
                      <div className="flex flex-col items-center sm:items-start min-w-[50px]">
                        <span className="text-white/25 text-[7px] font-bold uppercase tracking-[0.1em]">
                          Event Horizon
                        </span>
                        <span className="text-[10px] font-mono text-white/80 tabular-nums">
                          {calculatedRadii.eventHorizon.toFixed(2)}Rs
                        </span>
                      </div>
                      <div className="flex flex-col items-center sm:items-start min-w-[50px]">
                        <span className="text-white/60 text-[7px] font-black uppercase tracking-[0.15em]">
                          Photon Ring
                        </span>
                        <span className="text-[10px] font-mono text-white font-bold tabular-nums">
                          {calculatedRadii.photonSphere.toFixed(2)}Rp
                        </span>
                      </div>
                      <div className="flex flex-col items-center sm:items-start min-w-[50px]">
                        <span className="text-white/60 text-[7px] font-black uppercase tracking-[0.15em]">
                          Stable Orbit
                        </span>
                        <span className="text-[10px] font-mono text-white font-bold tabular-nums">
                          {calculatedRadii.isco.toFixed(2)}Ri
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Scrollable Instrumentation Manifold (Responsive Chassis) */}
                  <div className="max-h-[55vh] sm:max-h-[60vh] overflow-y-auto overflow-x-hidden pr-1.5 custom-scrollbar pb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-min items-start mb-6">
                      {activeTab === "simulation" && (
                        <>
                          <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                            <SectionHeader label="Black Hole Parameters" />
                            <div className="space-y-4">
                              <ControlSlider
                                label={SIMULATION_CONFIG.mass.label}
                                value={params.mass}
                                min={SIMULATION_CONFIG.mass.min}
                                max={SIMULATION_CONFIG.mass.max}
                                step={SIMULATION_CONFIG.mass.step}
                                onChange={(v) =>
                                  handleParamChange({ ...params, mass: v })
                                }
                                unit={SIMULATION_CONFIG.mass.unit}
                                decimals={SIMULATION_CONFIG.mass.decimals}
                              />
                              <ControlSlider
                                label={SIMULATION_CONFIG.zoom.label}
                                value={params.zoom}
                                min={SIMULATION_CONFIG.zoom.min}
                                max={SIMULATION_CONFIG.zoom.max}
                                step={SIMULATION_CONFIG.zoom.step}
                                onChange={(v) =>
                                  handleParamChange({ ...params, zoom: v })
                                }
                                unit={SIMULATION_CONFIG.zoom.unit}
                                decimals={SIMULATION_CONFIG.zoom.decimals}
                              />
                              <ControlSlider
                                label={SIMULATION_CONFIG.spin.label} // Updated from ui_spin
                                value={params.spin}
                                min={SIMULATION_CONFIG.spin.min} // Updated from ui_spin
                                max={SIMULATION_CONFIG.spin.max} // Updated from ui_spin
                                step={SIMULATION_CONFIG.spin.step} // Updated from ui_spin
                                onChange={(v) =>
                                  handleParamChange({ ...params, spin: v })
                                }
                                unit={SIMULATION_CONFIG.spin.unit} // Updated from ui_spin
                                decimals={SIMULATION_CONFIG.spin.decimals} // Updated from ui_spin
                              />
                            </div>
                          </div>

                          <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                            <SectionHeader label="Accretion Dynamics" />
                            <div className="space-y-4">
                              <ControlSlider
                                label={SIMULATION_CONFIG.autoSpin.label}
                                value={params.autoSpin}
                                min={SIMULATION_CONFIG.autoSpin.min}
                                max={SIMULATION_CONFIG.autoSpin.max}
                                step={SIMULATION_CONFIG.autoSpin.step}
                                onChange={(v) =>
                                  handleParamChange({
                                    ...params,
                                    autoSpin: v,
                                  })
                                }
                                unit={SIMULATION_CONFIG.autoSpin.unit}
                                decimals={SIMULATION_CONFIG.autoSpin.decimals}
                              />
                              <ControlSlider
                                label={SIMULATION_CONFIG.diskSize.label}
                                value={
                                  params.diskSize ??
                                  SIMULATION_CONFIG.diskSize.default
                                }
                                min={SIMULATION_CONFIG.diskSize.min}
                                max={SIMULATION_CONFIG.diskSize.max}
                                step={SIMULATION_CONFIG.diskSize.step}
                                onChange={(v) =>
                                  handleParamChange({
                                    ...params,
                                    diskSize: v,
                                  })
                                }
                                unit={SIMULATION_CONFIG.diskSize.unit}
                                decimals={SIMULATION_CONFIG.diskSize.decimals}
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {activeTab === "performance" && (
                        <>
                          <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                            <SectionHeader label="Performance Presets" />
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              {PRESETS.map((p) =>
                                renderPresetButton(
                                  p.label,
                                  params.performancePreset === p.id,
                                  () =>
                                    onParamsChange(applyPreset(p.id, params)),
                                  p.id,
                                ),
                              )}
                            </div>
                            <ControlSlider
                              label={SIMULATION_CONFIG.renderScale.label}
                              value={
                                params.renderScale ??
                                SIMULATION_CONFIG.renderScale.default
                              }
                              min={SIMULATION_CONFIG.renderScale.min}
                              max={SIMULATION_CONFIG.renderScale.max}
                              step={SIMULATION_CONFIG.renderScale.step}
                              onChange={(v) =>
                                handleParamChange({
                                  ...params,
                                  renderScale: v,
                                })
                              }
                              unit={SIMULATION_CONFIG.renderScale.unit}
                              decimals={SIMULATION_CONFIG.renderScale.decimals}
                            />
                          </div>

                          <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                            <SectionHeader label="Ray Tracing Fidelity" />
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              {QUALITY_LEVELS.map((q) =>
                                renderPresetButton(
                                  q.label,
                                  params.features?.rayTracingQuality === q.id,
                                  () => setQuality(q.id),
                                  q.id,
                                ),
                              )}
                            </div>
                          </div>

                          <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                            <SectionHeader label="System Validation" />
                            <button
                              onClick={
                                isBenchmarkRunning
                                  ? onCancelBenchmark
                                  : onStartBenchmark
                              }
                              className={`w-full py-3 rounded-xl border transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                                isBenchmarkRunning
                                  ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              {isBenchmarkRunning ? (
                                <>
                                  <Power className="w-3.5 h-3.5 text-red-400" />
                                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                                    Abort Benchmark
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Activity className="w-3.5 h-3.5" />
                                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                                    Run Performance Suite
                                  </span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                            <SectionHeader label="Display Precision" />
                            <div className="space-y-4">
                              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <p className="text-[7.5px] text-white/30 uppercase tracking-widest leading-relaxed">
                                  Spectral precision and volumetric scattering
                                  density limit.
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {activeTab === "features" && (
                        <>
                          <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                            <SectionHeader label="Physics Modules" />
                            <div className="grid grid-cols-1 gap-2">
                              {[
                                {
                                  label: "Gravitational Lensing",
                                  key: "gravitationalLensing" as const,
                                  icon: Star,
                                },
                                {
                                  label: "Accretion Disk",
                                  key: "accretionDisk" as const,
                                  icon: Disc,
                                },
                                {
                                  label: "Doppler Beaming",
                                  key: "dopplerBeaming" as const,
                                  icon: Zap,
                                },
                                {
                                  label: "Photon Sphere",
                                  key: "photonSphereGlow" as const,
                                  icon: Sun,
                                },
                                {
                                  label: "Ambient Stars",
                                  key: "backgroundStars" as const,
                                  icon: Star,
                                },
                                {
                                  label: "Volumetric Bloom",
                                  key: "bloom" as const,
                                  icon: Sparkles,
                                },
                                {
                                  label: "Gravitational Redshift",
                                  key: "gravitationalRedshift" as const,
                                  icon: Activity,
                                },
                                {
                                  label: "Kerr Shadow Guide",
                                  key: "kerrShadow" as const,
                                  icon: Disc,
                                },
                              ].map((f) =>
                                renderToggle(
                                  f.label,
                                  !!params.features?.[
                                    f.key as keyof FeatureToggles
                                  ],
                                  () =>
                                    toggleFeature(
                                      f.key as keyof FeatureToggles,
                                    ),
                                  f.icon,
                                  f.key,
                                ),
                              )}
                            </div>
                          </div>

                          {/* Right Column Stack: Spectral Properties & Cinematic Utility */}
                          <div className="space-y-4">
                            <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                              <SectionHeader label="Spectral Properties" />
                              <div className="space-y-4">
                                <ControlSlider
                                  label={SIMULATION_CONFIG.diskTemp.label}
                                  value={params.diskTemp}
                                  min={SIMULATION_CONFIG.diskTemp.min}
                                  max={SIMULATION_CONFIG.diskTemp.max}
                                  step={SIMULATION_CONFIG.diskTemp.step}
                                  onChange={(v) =>
                                    handleParamChange({
                                      ...params,
                                      diskTemp: v,
                                    })
                                  }
                                  unit={SIMULATION_CONFIG.diskTemp.unit}
                                  decimals={SIMULATION_CONFIG.diskTemp.decimals}
                                />
                                <ControlSlider
                                  label={SIMULATION_CONFIG.lensing.label}
                                  value={params.lensing}
                                  min={SIMULATION_CONFIG.lensing.min}
                                  max={SIMULATION_CONFIG.lensing.max}
                                  step={SIMULATION_CONFIG.lensing.step}
                                  onChange={(v) =>
                                    handleParamChange({
                                      ...params,
                                      lensing: v,
                                    })
                                  }
                                  unit={SIMULATION_CONFIG.lensing.unit}
                                  decimals={SIMULATION_CONFIG.lensing.decimals}
                                />
                                <ControlSlider
                                  label={SIMULATION_CONFIG.diskDensity.label}
                                  value={params.diskDensity}
                                  min={SIMULATION_CONFIG.diskDensity.min}
                                  max={SIMULATION_CONFIG.diskDensity.max}
                                  step={SIMULATION_CONFIG.diskDensity.step}
                                  onChange={(v) =>
                                    handleParamChange({
                                      ...params,
                                      diskDensity: v,
                                    })
                                  }
                                  unit={SIMULATION_CONFIG.diskDensity.unit}
                                  decimals={
                                    SIMULATION_CONFIG.diskDensity.decimals
                                  }
                                />
                              </div>
                            </div>

                            {/* Cinematic Tools - Always Active for Instant Switching */}
                            <div className="p-3.5 sm:p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                              <SectionHeader label="Cinematic Tools" />
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  onClick={() => onStartCinematic?.("orbit")}
                                  className={`py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-[9px] uppercase tracking-wider text-white transition-all active:scale-95 hover:bg-indigo-500/20 hover:border-indigo-500/40 hover:text-indigo-200 shadow-sm`}
                                >
                                  Orbit Tour
                                </button>
                                <button
                                  onClick={() => onStartCinematic?.("dive")}
                                  className={`py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-[9px] uppercase tracking-wider text-white transition-all active:scale-95 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-200 shadow-sm`}
                                >
                                  Infall Dive
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* --- DOCKED NAVIGATION RAIL: Sleek Glass Footer --- */}
                <div className="relative z-50 px-6 pb-3 pt-0 pointer-events-auto">
                  {/* Command Triad: Global Action Hub */}
                  <div className="flex gap-2 max-w-lg mx-auto mb-2">
                    <button
                      onClick={handleReset}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[8px] tracking-[0.1em] uppercase transition-all duration-300 border ${
                        isCinematic
                          ? "bg-red-500/20 border-red-500/40 text-red-200 animate-pulse hover:bg-red-500/30"
                          : "bg-white/[0.04] border-white/10 text-white/60 hover:text-white hover:bg-red-500/20 hover:border-red-500/40"
                      } group/reset
                      `}
                    >
                      <RefreshCcw
                        className={`w-3.5 h-3.5 group-hover/reset:text-red-400 transition-colors ${isResetting || isCinematic ? "animate-spin text-red-400" : ""}`}
                      />
                      <span className="hidden sm:inline group-hover/reset:text-red-200 transition-colors">
                        {isCinematic ? "ABORT SEQ" : "Reset"}
                      </span>
                    </button>

                    <button
                      onClick={() =>
                        handleParamChange({
                          ...params,
                          paused: !params.paused,
                        })
                      }
                      className={`flex-[3.5] flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[8px] tracking-[0.2em] uppercase transition-all duration-300 border ${
                        params.paused
                          ? "bg-white/20 text-white border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                          : "bg-white/[0.06] text-white border-white/10 hover:bg-white/[0.1] hover:border-white/20"
                      }`}
                    >
                      <Power
                        className={`w-3.5 h-3.5 text-white ${!params.paused ? "animate-pulse" : ""}`}
                      />
                      {params.paused ? "Resume" : "Pause"}
                    </button>

                    <button
                      onClick={() => {
                        onCompactChange(true);
                        setActiveTab("simulation");
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[8px] tracking-[0.1em] uppercase transition-all duration-300 border bg-white/[0.04] border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 group/close`}
                    >
                      <span className="group-hover/close:text-white transition-colors">
                        Close
                      </span>
                    </button>

                    {/* Tab Navigation (Bottom - Mobile Optimized) */}
                  </div>

                  {/* Tab Navigation (Bottom - Mobile Optimized) */}
                  <div className="flex justify-center bg-black/80 p-1.5 rounded-2xl backdrop-blur-xl border border-white/10 max-w-lg mx-auto mt-2 shadow-2xl">
                    <button
                      onClick={() => setActiveTab("simulation")}
                      className={`flex-1 px-2 py-3 text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 font-bold ${activeTab === "simulation" ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "text-white/50 hover:text-white hover:bg-white/5"}`}
                    >
                      Physics
                    </button>
                    <button
                      onClick={() => setActiveTab("features")}
                      className={`flex-1 px-2 py-3 text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 font-bold ${activeTab === "features" ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "text-white/50 hover:text-white hover:bg-white/5"}`}
                    >
                      Modules
                    </button>
                    <button
                      onClick={() => setActiveTab("performance")}
                      className={`flex-1 px-2 py-3 text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 font-bold ${activeTab === "performance" ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "text-white/50 hover:text-white hover:bg-white/5"}`}
                    >
                      System
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ))}
    </AnimatePresence>
  );
};
