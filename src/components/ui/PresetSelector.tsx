/**
 * PresetSelector Component
 * Dropdown selector for performance presets
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { useState } from "react";
import { Zap, ChevronDown } from "lucide-react";
import type { PresetName } from "@/types/features";

interface PresetSelectorProps {
  currentPreset: PresetName;
  onPresetChange: (preset: PresetName) => void;
}

const PRESET_INFO: Record<
  PresetName,
  { label: string; description: string; icon: string }
> = {
  "maximum-performance": {
    label: "Maximum Performance",
    description: "All features disabled, lowest quality - best FPS",
    icon: "⚡",
  },
  balanced: {
    label: "Balanced",
    description: "Core features enabled, medium quality - good balance",
    icon: "⚖️",
  },
  "high-quality": {
    label: "High Quality",
    description: "Most features enabled, high quality - great visuals",
    icon: "✨",
  },
  "ultra-quality": {
    label: "Ultra Quality",
    description: "All features enabled, maximum quality - best visuals",
    icon: "💎",
  },
  custom: {
    label: "Custom",
    description: "User-defined settings",
    icon: "🎛️",
  },
};

export const PresetSelector = ({
  currentPreset,
  onPresetChange,
}: PresetSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetSelect = (preset: PresetName) => {
    onPresetChange(preset);
    setIsOpen(false);
  };

  const currentInfo = PRESET_INFO[currentPreset] || PRESET_INFO["balanced"];

  return (
    <div className="relative">
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] rounded-xl transition-all duration-300 group"
        aria-label="Select performance preset"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 group-hover:bg-cyan-500/20 transition-colors">
            <Zap className="w-3 h-3 text-cyan-300" />
          </div>
          <span className="text-[10px] uppercase tracking-wider text-white/50 font-medium group-hover:text-white/80 transition-colors">
            Performance Profile
          </span>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <span className="text-[10px] font-medium text-white/90 tracking-wide flex items-center gap-1.5">
            {/* Using a cleaner dot indicator instead of emoji for selected state */}
            <span
              className={`w-1.5 h-1.5 rounded-full ${currentPreset === "custom" ? "bg-amber-400" : "bg-green-400"} shadow-[0_0_8px_currentColor]`}
            />
            {currentInfo.label}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-white/30 transition-transform duration-500 ${isOpen ? "rotate-180 text-white/60" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 w-full mb-2 z-50">
          {/* Click outside handler overlay is handled by parent or specific hook in prod, but keeping simple here */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative z-50 bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden p-1.5 animate-in slide-in-from-bottom-2 duration-200">
            {(Object.keys(PRESET_INFO) as PresetName[])
              .filter((preset) => preset !== "custom")
              .map((preset) => {
                const info = PRESET_INFO[preset];
                const isSelected = preset === currentPreset;

                return (
                  <button
                    key={preset}
                    onClick={() => handlePresetSelect(preset)}
                    className={`w-full px-3 py-2.5 text-left transition-all duration-200 rounded-xl mb-1 last:mb-0 group ${
                      isSelected
                        ? "bg-white/[0.08] border border-white/[0.05]"
                        : "hover:bg-white/[0.04] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-1.5 rounded-lg ${isSelected ? "bg-cyan-500/20 text-cyan-300" : "bg-white/5 text-white/40 group-hover:text-white/70"}`}
                      >
                        {/* We can maps string icons to Lucide icons later, for now simulate with text or just use the emoji subtly */}
                        <span className="text-sm leading-none grayscale-[0.5] group-hover:grayscale-0 transition-all">
                          {info.icon}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span
                          className={`text-[10px] font-semibold tracking-wide ${isSelected ? "text-white" : "text-white/70 group-hover:text-white"}`}
                        >
                          {info.label}
                        </span>
                        <span className="text-[9px] text-white/30 group-hover:text-white/50">
                          {info.description}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="ml-auto">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
