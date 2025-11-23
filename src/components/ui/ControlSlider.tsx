/**
 * ControlSlider Component
 * Individual slider control for simulation parameters with tooltips and bounds indication
 */

import { useState } from 'react';

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

export const ControlSlider = ({ label, value, min, max, step, onChange, unit = "", tooltip }: ControlSliderProps) => {
    const [showTooltip, setShowTooltip] = useState(false);

    // Check if value is at bounds
    const atMin = Math.abs(value - min) < step / 2;
    const atMax = Math.abs(value - max) < step / 2;
    const atBounds = atMin || atMax;

    return (
        <div className="mb-1 relative">
            <div className="flex justify-between text-[9px] uppercase tracking-widest text-gray-400 mb-1">
                <span
                    className="cursor-help relative"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                >
                    {label}
                    {tooltip && showTooltip && (
                        <div className="absolute left-0 top-full mt-1 z-50 bg-black/95 border border-white/20 rounded px-2 py-1 text-[8px] normal-case tracking-normal text-white/90 w-48 shadow-xl">
                            {tooltip}
                        </div>
                    )}
                </span>
                <span className={`font-mono transition-colors ${atBounds ? 'text-yellow-400' : 'text-white'}`}>
                    {typeof value === 'number' ? value.toFixed(1) : value}{unit}
                    {atBounds && <span className="ml-1">⚠</span>}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className={`w-full h-1 rounded-lg appearance-none cursor-pointer transition-all ${atBounds ? 'bg-yellow-600/50 hover:bg-yellow-600/70' : 'bg-gray-800 hover:bg-gray-600'
                    } accent-white`}
            />
        </div>
    );
};
