/**
 * ControlSlider Component
 * Individual slider control for simulation parameters
 */

interface ControlSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    unit?: string;
}

export const ControlSlider = ({ label, value, min, max, step, onChange, unit = "" }: ControlSliderProps) => (
    <div className="mb-1">
        <div className="flex justify-between text-[9px] uppercase tracking-widest text-gray-400 mb-1">
            <span>{label}</span>
            <span className="text-white font-mono">{typeof value === 'number' ? value.toFixed(1) : value}{unit}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer hover:bg-gray-600 accent-white transition-colors"
        />
    </div>
);
