/**
 * ControlSlider Component
 * Individual slider control for simulation parameters with tooltips and bounds indication
 */

import { useState } from "react";

interface ControlSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
  tooltip?: string;
}

export const ControlSlider = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = "",
  tooltip,
}: ControlSliderProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Check if value is at bounds
  const atMin = Math.abs(value - min) < step / 2;
  const atMax = Math.abs(value - max) < step / 2;
  const atBounds = atMin || atMax;

  return (
    <div className="mb-5 group">
      <div className="flex justify-between items-center mb-3">
        <span
          className="cursor-help relative flex items-center gap-1.5"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <span className="text-[10px] uppercase tracking-wider text-white/50 font-medium group-hover:text-white/80 transition-colors duration-300">
            {label}
          </span>
          {tooltip && showTooltip && (
            <div className="absolute left-0 bottom-full mb-2 z-50 bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg px-3 py-2 text-[10px] leading-relaxed tracking-wide text-white/90 w-48 shadow-[0_10px_20px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200">
              {tooltip}
            </div>
          )}
        </span>
        <span
          className={`font-mono text-[10px] tracking-tight transition-colors duration-300 ${atBounds ? "text-amber-400" : "text-white/90"}`}
        >
          {typeof value === "number" ? value.toFixed(1) : value}
          <span className="text-white/30 ml-0.5 text-[9px]">{unit}</span>
          {atBounds && (
            <span className="ml-1.5 inline-block animate-pulse">⚠️</span>
          )}
        </span>
      </div>

      <div className="relative h-6 w-full flex items-center">
        {/* Track Background */}
        <div className="absolute left-0 right-0 h-1 bg-white/[0.06] rounded-full overflow-hidden group-hover:bg-white/[0.1] transition-colors duration-300">
          <div
            className="h-full bg-white/20 rounded-full transition-all duration-100 ease-out"
            style={{ width: `${((value - min) / (max - min)) * 100}%` }}
          />
        </div>

        {/* Interactive Input (Invisible but reachable) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          aria-label={label}
        />

        {/* Custom Thumb Visual */}
        <div
          className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] pointer-events-none transition-all duration-100 ease-out border border-white/50 z-10"
          style={{
            left: `calc(${((value - min) / (max - min)) * 100}% - 6px)`,
          }}
        />
      </div>
    </div>
  );
};
