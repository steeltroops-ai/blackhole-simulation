/**
 * ControlPanel Component
 * Scientific Real-Time Interface - Refined Structure v5
 *
 * user_request: Refined Layout - 3 Panels (Variables, Modules, System) with Game-like Icons
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Power,
  RefreshCcw,
  ChevronDown,
  Settings,
  Eye,
  Atom,
  Cpu,
  Zap,
  Layers,
  Star,
  Sun,
  Disc,
  RotateCw,
  Focus,
  Sparkles,
  Monitor,
  SlidersHorizontal,
} from "lucide-react";
import type { SimulationParams } from "@/types/simulation";
import {
  calculateEventHorizon,
  calculatePhotonSphere,
  calculateISCO,
} from "@/physics/kerr-metric";
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
}

const DEFAULT_PARAMS: SimulationParams = {
  mass: 0.5,
  spin: 0.8,
  diskDensity: 3.5,
  diskTemp: 1.3,
  lensing: 1.0,
  paused: false,
  zoom: 50.0,
  autoSpin: 0.005,
  renderScale: 1.0,
};

const PRESETS: { id: PresetName; label: string }[] = [
  { id: "maximum-performance", label: "Max Perf" },
  { id: "balanced", label: "Balanced" },
  { id: "high-quality", label: "High Qual" },
  { id: "ultra-quality", label: "Ultra" },
];

const QUALITY_LEVELS: { id: RayTracingQuality; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Med" },
  { id: "high", label: "High" },
  { id: "ultra", label: "Ultra" },
];

export const ControlPanel = ({
  params,
  onParamsChange,
  showUI,
}: ControlPanelProps) => {
  const [isCompact, setIsCompact] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // 3-Panel State: Variables (Scrollable), Modules (Toggles), System (Performance)
  const [activeTab, setActiveTab] = useState<
    "variables" | "modules" | "system"
  >("variables");

  const [calculatedRadii, setCalculatedRadii] = useState({
    eventHorizon: 0,
    photonSphere: 0,
    isco: 0,
  });

  const { applyPreset } = usePresets();

  useEffect(() => {
    const normalizedSpin = Math.max(-1, Math.min(1, params.spin / 5.0));
    const eventHorizon = calculateEventHorizon(params.mass, normalizedSpin);
    const photonSphere = calculatePhotonSphere(params.mass, normalizedSpin);
    const isco = calculateISCO(params.mass, normalizedSpin, true);

    setCalculatedRadii({ eventHorizon, photonSphere, isco });
  }, [params.mass, params.spin]);

  const handleReset = () => {
    setIsResetting(true);
    onParamsChange(DEFAULT_PARAMS);
    setTimeout(() => setIsResetting(false), 500);
  };

  const handleParamChange = (newParams: SimulationParams) => {
    const validatedParams: SimulationParams = {
      ...newParams,
      mass: clampAndValidate(newParams.mass, 0.1, 3.0, DEFAULT_PARAMS.mass),
      spin: clampAndValidate(newParams.spin, -5.0, 5.0, DEFAULT_PARAMS.spin),
      diskDensity: clampAndValidate(
        newParams.diskDensity,
        0.0,
        5.0,
        DEFAULT_PARAMS.diskDensity,
      ),
      diskTemp: clampAndValidate(
        newParams.diskTemp,
        0.5,
        3.0,
        DEFAULT_PARAMS.diskTemp,
      ),
      lensing: clampAndValidate(
        newParams.lensing,
        0.0,
        3.0,
        DEFAULT_PARAMS.lensing,
      ),
      zoom: clampAndValidate(newParams.zoom, 2.5, 50.0, DEFAULT_PARAMS.zoom),
      autoSpin: clampAndValidate(
        newParams.autoSpin ?? 0.005,
        -0.05,
        0.05,
        DEFAULT_PARAMS.autoSpin,
      ),
      paused: newParams.paused,
    };
    onParamsChange(validatedParams);
  };

  const toggleFeature = (key: keyof FeatureToggles) => {
    if (!params.features) return;
    const currentVal = params.features[key];
    if (typeof currentVal !== "boolean") return;
    const newFeatures = { ...params.features, [key]: !currentVal };
    onParamsChange({
      ...params,
      features: newFeatures,
      performancePreset: "custom",
    });
  };

  const setQuality = (q: RayTracingQuality) => {
    if (!params.features) return;
    const newFeatures = { ...params.features, rayTracingQuality: q };
    onParamsChange({
      ...params,
      features: newFeatures,
      performancePreset: "custom",
    });
  };

  // --- Premium Inline UI Primitives (Preserved) ---

  const renderSlider = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (v: number) => void,
    unit: string,
    decimals: number = 1,
  ) => (
    <div className="mb-3.5 group select-none">
      <div className="flex justify-between items-center mb-1.5 px-0.5">
        <span className="text-[9px] uppercase tracking-[0.15em] text-white/60 font-bold group-hover:text-white/90 transition-colors">
          {label}
        </span>
        <span className="font-mono text-[10px] text-white font-medium tabular-nums">
          {value.toFixed(decimals)}
          <span className="text-white/30 ml-0.5 text-[8px]">{unit}</span>
        </span>
      </div>
      <div className="relative h-4 w-full flex items-center">
        <div className="absolute left-0 right-0 h-[2px] bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-white/20 to-white/60 rounded-full transition-all duration-300"
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
          className="absolute w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] pointer-events-none transition-all z-10 border border-white/50 group-hover:scale-125 glow-white"
          style={{
            left: `calc(${((value - min) / (max - min)) * 100}% - 5px)`,
          }}
        />
      </div>
    </div>
  );

  const renderToggle = (
    label: string,
    isActive: boolean,
    onClick: () => void,
    icon?: any,
  ) => {
    const Icon = icon;
    return (
      <button
        onClick={onClick}
        className={`
          flex items-center gap-2.5 p-2 px-3 rounded-xl border transition-all duration-500 relative group/btn overflow-hidden w-full
          ${
            isActive
              ? "bg-white/15 backdrop-blur-2xl text-white border-white/50 shadow-[0_0_25px_rgba(255,255,255,0.08),inset_0_0_12px_rgba(255,255,255,0.08)]"
              : "bg-white/[0.03] text-white/50 border-white/5 hover:bg-white/[0.07] hover:border-white/15 hover:text-white/80"
          }
        `}
      >
        {Icon && (
          <Icon
            className={`w-3 h-3 shrink-0 transition-all duration-500 ${isActive ? "text-white icon-glow" : "opacity-50 group-hover/btn:opacity-80"}`}
          />
        )}
        <span
          className={`text-[8px] uppercase font-bold tracking-[0.15em] truncate transition-colors duration-500 ${isActive ? "text-white" : "text-white/50"}`}
        >
          {label}
        </span>
        <div
          className={`ml-auto w-6 h-3 rounded-full border transition-all duration-500 shrink-0 relative ${
            isActive
              ? "bg-white/20 border-white/40"
              : "bg-white/5 border-white/10"
          }`}
        >
          <div
            className={`absolute top-0.5 w-2 h-2 rounded-full transition-all duration-500 ${
              isActive
                ? "left-3 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                : "left-0.5 bg-white/30"
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
  ) => (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center p-2 px-3 rounded-xl border transition-all duration-500 relative group/btn overflow-hidden
        ${
          isActive
            ? "bg-white/15 backdrop-blur-2xl text-white border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.08),inset_0_0_10px_rgba(255,255,255,0.06)] scale-[1.02]"
            : "bg-white/[0.03] text-white/50 border-white/5 hover:bg-white/[0.07] hover:border-white/15 hover:text-white/80"
        }
      `}
    >
      <span
        className={`text-[8px] uppercase font-bold tracking-[0.15em] truncate transition-colors duration-500 ${isActive ? "text-white" : "text-white/50"}`}
      >
        {label}
      </span>
      {isActive && (
        <div className="ml-1.5 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse shrink-0" />
      )}
    </button>
  );

  const SectionHeader = ({
    icon: Icon,
    label,
  }: {
    icon: any;
    label: string;
  }) => (
    <div className="flex items-center gap-2 text-white/30 mb-2.5 px-0.5">
      <Icon className="w-3 h-3" />
      <span className="text-[7px] font-black uppercase tracking-[0.25em]">
        {label}
      </span>
    </div>
  );

  const VerticalDivider = () => (
    <div className="w-px bg-gradient-to-b from-transparent via-white/5 to-transparent self-stretch opacity-30" />
  );

  return (
    <AnimatePresence mode="wait">
      {showUI &&
        (isCompact ? (
          /* --- COMPACT MODE: FLOATING ACCESS NODE --- */
          <motion.div
            key="compact-node"
            initial={{ x: 50, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 50, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute bottom-8 right-8 z-50"
          >
            <button
              onClick={() => setIsCompact(false)}
              className="relative p-5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-3xl shadow-[0_0_50px_rgba(255,255,255,0.1),inset_0_0_20px_rgba(255,255,255,0.05)] hover:scale-110 active:scale-95 transition-all group liquid-glass-highlight overflow-hidden"
              title="Expand System Controls"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Focus className="w-7 h-7 text-white icon-glow animate-pulse" />
              <div className="absolute top-2 right-2 flex gap-1">
                <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white] animate-pulse" />
              </div>

              {/* Tooltip Label */}
              <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 whitespace-nowrap px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none translate-x-2 group-hover:translate-x-0">
                <span className="text-[10px] font-black tracking-[0.3em] text-white uppercase">
                  System Access
                </span>
              </div>
            </button>
          </motion.div>
        ) : (
          /* --- FULL MODE: UNIFIED CONTROL CHASSIS (3-Panel Layout) --- */
          <motion.div
            key="full-system"
            initial={{ y: 100, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.98 }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 25,
              mass: 1.1,
            }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-[1200px]"
          >
            <div className="relative group overflow-hidden rounded-2xl liquid-glass border border-white/10 shadow-2xl">
              {/* Liquid Glass Infrastructure */}
              <div className="absolute inset-0 liquid-glass-highlight z-1 pointer-events-none" />
              <div className="absolute inset-x-0 top-0 liquid-glass-top-line z-30" />

              {/* Dynamic Atmosphere */}
              <div className="absolute -top-32 -left-32 w-80 h-80 bg-white/[0.03] blur-[120px] rounded-full pointer-events-none" />
              <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-white/[0.03] blur-[120px] rounded-full pointer-events-none" />

              {/* CONTENT LAYER */}
              <div className="relative z-40 p-5 flex flex-col xl:flex-row items-stretch gap-5 h-full min-h-[210px]">
                {/* ============================================= */}
                {/* SECTION A: IDENTITY & TELEMETRY               */}
                {/* ============================================= */}
                <div className="flex flex-col justify-between min-w-[155px] shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="relative p-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-[0_0_15px_rgba(255,255,255,0.05)] ring-1 ring-cyan-500/20 group-hover:ring-cyan-500/40 transition-all">
                      <Focus className="w-5 h-5 text-white icon-glow" />
                      <div className="absolute top-0 right-0 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_cyan] animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-white text-[12px] font-black tracking-[0.2em] uppercase leading-none mb-1 flex items-center gap-2">
                        Horizon<span className="text-cyan-400">-V</span>
                      </h2>
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-green-500/80 animate-pulse" />
                        <p className="text-white/30 text-[7px] font-mono tracking-[0.2em] font-bold">
                          SYSTEM ACTIVE
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Live Telemetry Readouts */}
                  <div className="flex flex-col gap-1.5 mt-3 px-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-white/25 text-[7px] font-bold uppercase tracking-[0.15em]">
                        Event Horizon
                      </span>
                      <span className="text-[9px] font-mono text-white/80 tabular-nums">
                        {calculatedRadii.eventHorizon.toFixed(2)}{" "}
                        <span className="text-white/30 text-[7px]">Rs</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/25 text-[7px] font-bold uppercase tracking-[0.15em]">
                        Photon Sphere
                      </span>
                      <span className="text-[9px] font-mono text-white/80 tabular-nums">
                        {calculatedRadii.photonSphere.toFixed(2)}{" "}
                        <span className="text-white/30 text-[7px]">Rp</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/25 text-[7px] font-bold uppercase tracking-[0.15em]">
                        ISCO
                      </span>
                      <span className="text-[9px] font-mono text-white/80 tabular-nums">
                        {calculatedRadii.isco.toFixed(2)}{" "}
                        <span className="text-white/30 text-[7px]">Ri</span>
                      </span>
                    </div>
                  </div>
                </div>

                <VerticalDivider />

                {/* ============================================= */}
                {/* SECTION B: DYNAMIC CONTROL DECK (3 Panels)    */}
                {/* ============================================= */}
                <div className="flex-1 min-h-[160px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ y: 8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -8, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="grid grid-cols-2 gap-7 h-full"
                    >
                      {/* ================================== */}
                      {/* PANEL 1: VARIABLES (All Sliders)   */}
                      {/* ================================== */}
                      {activeTab === "variables" && (
                        <>
                          <div className="flex flex-col">
                            <SectionHeader
                              icon={Atom}
                              label="Physics Variables"
                            />
                            {renderSlider(
                              "Black Hole Mass",
                              params.mass,
                              0.1,
                              3.0,
                              0.1,
                              (v) => handleParamChange({ ...params, mass: v }),
                              "M\u2609",
                            )}
                            {renderSlider(
                              "Kerr Spin",
                              params.spin,
                              -5.0,
                              5.0,
                              0.1,
                              (v) => handleParamChange({ ...params, spin: v }),
                              "a*",
                            )}
                            {renderSlider(
                              "Auto Rotation",
                              params.autoSpin,
                              -0.05,
                              0.05,
                              0.001,
                              (v) =>
                                handleParamChange({ ...params, autoSpin: v }),
                              "rad/s",
                              3,
                            )}
                            {renderSlider(
                              "Matter Density",
                              params.diskDensity,
                              0.0,
                              5.0,
                              0.1,
                              (v) =>
                                handleParamChange({
                                  ...params,
                                  diskDensity: v,
                                }),
                              "g/cm\u00b3",
                            )}
                          </div>
                          <div className="flex flex-col">
                            <SectionHeader
                              icon={Eye}
                              label="Optical Variables"
                            />
                            {renderSlider(
                              "Plasma Temp",
                              params.diskTemp,
                              0.5,
                              3.0,
                              0.1,
                              (v) =>
                                handleParamChange({ ...params, diskTemp: v }),
                              "KeV",
                            )}
                            {renderSlider(
                              "Lensing Strength",
                              params.lensing,
                              0.0,
                              3.0,
                              0.1,
                              (v) =>
                                handleParamChange({ ...params, lensing: v }),
                              "\u03bb",
                            )}
                            {renderSlider(
                              "Orbit Distance",
                              params.zoom,
                              2.5,
                              50.0,
                              0.5,
                              (v) => handleParamChange({ ...params, zoom: v }),
                              "AU",
                            )}
                          </div>
                        </>
                      )}

                      {/* ================================== */}
                      {/* PANEL 2: MODULES (All Toggles)     */}
                      {/* ================================== */}
                      {activeTab === "modules" && (
                        <>
                          <div className="flex flex-col">
                            <SectionHeader icon={Cpu} label="Core Modules" />
                            <div className="flex flex-col gap-2">
                              {renderToggle(
                                "Gravitational Lensing",
                                params.features?.gravitationalLensing ?? false,
                                () => toggleFeature("gravitationalLensing"),
                                Star,
                              )}
                              {renderToggle(
                                "Accretion Disk",
                                params.features?.accretionDisk ?? false,
                                () => toggleFeature("accretionDisk"),
                                Disc,
                              )}
                              {renderToggle(
                                "Doppler Beaming",
                                params.features?.dopplerBeaming ?? false,
                                () => toggleFeature("dopplerBeaming"),
                                Zap,
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <SectionHeader
                              icon={Sparkles}
                              label="Post-Processing"
                            />
                            <div className="flex flex-col gap-2">
                              {renderToggle(
                                "Photon Ring",
                                params.features?.photonSphereGlow ?? false,
                                () => toggleFeature("photonSphereGlow"),
                                Sun,
                              )}
                              {renderToggle(
                                "Background Stars",
                                params.features?.backgroundStars ?? false,
                                () => toggleFeature("backgroundStars"),
                                Star,
                              )}
                              {renderToggle(
                                "Bloom / Post FX",
                                params.features?.bloom ?? false,
                                () => toggleFeature("bloom"),
                                Sparkles,
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* ================================== */}
                      {/* PANEL 3: PERF / SYSTEM (Features)  */}
                      {/* ================================== */}
                      {activeTab === "system" && (
                        <>
                          <div className="flex flex-col">
                            <SectionHeader
                              icon={Activity}
                              label="Global Presets"
                            />
                            <div className="grid grid-cols-2 gap-1.5 mb-4">
                              {PRESETS.map((p) =>
                                renderPresetButton(
                                  p.label,
                                  params.performancePreset === p.id,
                                  () =>
                                    onParamsChange(applyPreset(p.id, params)),
                                ),
                              )}
                            </div>
                            <SectionHeader icon={Monitor} label="Viewport" />
                            <div className="flex flex-col gap-2">
                              {renderSlider(
                                "Render Scale",
                                params.renderScale ?? 1.0,
                                0.25,
                                2.0,
                                0.25,
                                (v) =>
                                  onParamsChange({ ...params, renderScale: v }),
                                "x",
                                2,
                              )}
                              {renderToggle(
                                "Adaptive Resolution",
                                params.adaptiveResolution ?? false,
                                () =>
                                  onParamsChange({
                                    ...params,
                                    adaptiveResolution:
                                      !params.adaptiveResolution,
                                  }),
                                Monitor,
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col col-span-1">
                            <SectionHeader
                              icon={Layers}
                              label="Ray Tracing Quality"
                            />
                            <div className="flex flex-col gap-1.5 h-full">
                              <div className="grid grid-cols-2 gap-1.5">
                                {QUALITY_LEVELS.slice(0, 4).map((q) =>
                                  renderPresetButton(
                                    q.label,
                                    params.features?.rayTracingQuality === q.id,
                                    () => setQuality(q.id),
                                  ),
                                )}
                              </div>
                              {renderPresetButton(
                                "Ultra Quality",
                                params.features?.rayTracingQuality === "ultra",
                                () => setQuality("ultra"),
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <VerticalDivider />

                {/* ============================================= */}
                {/* SECTION C: ACTION DECK                        */}
                {/* ============================================= */}
                <div className="xl:w-[145px] shrink-0 flex flex-col justify-between gap-3">
                  {/* Status Indicator */}
                  <div className="flex items-center justify-between p-2.5 px-3 bg-white/[0.02] rounded-xl border border-white/5 shadow-inner">
                    <div className="flex flex-col">
                      <span className="text-[6px] font-bold text-white/20 tracking-[0.2em] uppercase mb-0.5">
                        Status
                      </span>
                      <span className="text-[8px] font-bold text-white tracking-widest uppercase">
                        {params.paused ? "Paused" : "Active"}
                      </span>
                    </div>
                    <div
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-700 ${
                        params.paused
                          ? "bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                          : "bg-white shadow-[0_0_15px_rgba(255,255,255,0.8),0_0_25px_rgba(255,255,255,0.4)] animate-pulse"
                      }`}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 mt-auto">
                    <button
                      onClick={() =>
                        handleParamChange({ ...params, paused: !params.paused })
                      }
                      className={`
                        flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-[8px] tracking-[0.2em] uppercase transition-all duration-700 backdrop-blur-2xl border
                        ${
                          params.paused
                            ? "bg-white/15 text-white border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.08),inset_0_0_12px_rgba(255,255,255,0.04)] scale-[1.02]"
                            : "bg-white/[0.04] text-white/80 border-white/10 hover:bg-white/[0.08] hover:border-white/25"
                        }
                      `}
                    >
                      {params.paused ? (
                        <Power className="w-3 h-3 animate-pulse" />
                      ) : (
                        <Activity className="w-3 h-3" />
                      )}
                      {params.paused ? "Resume" : "Running"}
                    </button>

                    <div className="flex gap-1.5">
                      <button
                        onClick={handleReset}
                        className="flex-1 flex items-center justify-center py-2 bg-white/[0.04] border border-white/10 rounded-xl hover:bg-white/[0.08] transition-all group/reset"
                        title="Reset to Defaults"
                      >
                        <RefreshCcw
                          className={`w-3 h-3 text-white/50 group-hover/reset:text-white transition-colors ${isResetting ? "animate-spin text-white" : ""}`}
                        />
                      </button>
                      <button
                        onClick={() => setIsCompact(true)}
                        className="flex-1 flex items-center justify-center py-2 bg-white/[0.04] border border-dashed border-white/15 rounded-xl hover:bg-white/[0.08] hover:border-white/30 transition-all group/close"
                        title="Minimize Controls"
                      >
                        <ChevronDown className="w-3 h-3 text-white/50 group-hover/close:text-white transition-colors" />
                      </button>
                    </div>
                  </div>
                </div>

                <VerticalDivider />

                {/* ============================================= */}
                {/* SECTION D: TAB NAVIGATION RAIL (Game Coins)   */}
                {/* ============================================= */}
                <div className="flex flex-col gap-3 p-1.5 bg-white/[0.02] border border-white/5 rounded-2xl h-full shrink-0 justify-center">
                  {[
                    {
                      id: "variables",
                      icon: SlidersHorizontal,
                      label: "Variables",
                    },
                    { id: "modules", icon: Cpu, label: "Modules" },
                    { id: "system", icon: Activity, label: "System" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`
                        flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-500 group/tab relative
                        border-2 shadow-[0_4px_20px_rgba(0,0,0,0.2)]
                        ${
                          activeTab === tab.id
                            ? "bg-white/10 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)] ring-1 ring-white/10 scale-105"
                            : "bg-white/5 bg-gradient-to-b from-white/[0.08] to-transparent hover:bg-white/10 border-white/5 opacity-60 hover:opacity-100"
                        }
                      `}
                    >
                      <tab.icon
                        className={`w-4 h-4 transition-all duration-500 ${activeTab === tab.id ? "text-white scale-110 icon-glow" : "text-white/40 group-hover/tab:text-white/80"}`}
                      />
                      {activeTab === tab.id && (
                        <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10 animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
    </AnimatePresence>
  );
};
