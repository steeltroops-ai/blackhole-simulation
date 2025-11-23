/**
 * ControlPanel Component
 * Bottom control panel with parameter sliders and action buttons
 */

import { Activity, Power, RefreshCcw, ChevronDown, Atom } from 'lucide-react';
import { ControlSlider } from './ControlSlider';

interface SimulationParams {
    mass: number;
    spin: number;
    diskDensity: number;
    diskTemp: number;
    lensing: number;
    paused: boolean;
    zoom: number;
}

interface ControlPanelProps {
    params: SimulationParams;
    onParamsChange: (params: SimulationParams) => void;
    showUI: boolean;
    onToggleUI: (show: boolean) => void;
}

export const ControlPanel = ({ params, onParamsChange, showUI, onToggleUI }: ControlPanelProps) => {
    return (
        <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-30 transition-all duration-500 ease-out w-[95%] max-w-3xl ${showUI ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl relative overflow-hidden">

                {/* Header & Minimize */}
                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                        <Atom className="w-3 h-3 text-cyan-400" />
                        <h2 className="text-[10px] font-bold tracking-widest uppercase">Relativistic Physics Engine</h2>
                    </div>
                    <button
                        onClick={() => onToggleUI(false)}
                        className="p-1 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <ChevronDown className="w-3 h-3 text-white/60" />
                    </button>
                </div>

                {/* Parameters Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                    <ControlSlider
                        label="Camera Zoom" value={params.zoom} min={2.5} max={50.0} step={0.1}
                        onChange={(v) => onParamsChange({ ...params, zoom: v })} unit=" AU"
                    />
                    <ControlSlider
                        label="Mass (M☉)" value={params.mass} min={0.1} max={3.0} step={0.1}
                        onChange={(v) => onParamsChange({ ...params, mass: v })}
                    />
                    <ControlSlider
                        label="Lensing" value={params.lensing} min={0.0} max={3.0} step={0.1}
                        onChange={(v) => onParamsChange({ ...params, lensing: v })} unit="x"
                    />
                    <ControlSlider
                        label="Accretion Spin" value={params.spin} min={-5.0} max={5.0} step={0.1}
                        onChange={(v) => onParamsChange({ ...params, spin: v })} unit=" c"
                    />
                    <ControlSlider
                        label="Density" value={params.diskDensity} min={0.0} max={5.0} step={0.1}
                        onChange={(v) => onParamsChange({ ...params, diskDensity: v })} unit=" g"
                    />
                    <ControlSlider
                        label="Temp (K)" value={params.diskTemp} min={0.5} max={3.0} step={0.1}
                        onChange={(v) => onParamsChange({ ...params, diskTemp: v })}
                    />
                </div>

                {/* Actions Footer */}
                <div className="mt-3 flex justify-center gap-3 border-t border-white/5 pt-3">
                    <button
                        onClick={() => onParamsChange({ ...params, paused: !params.paused })}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded text-[10px] font-medium tracking-wide transition-all ${params.paused ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}
                    >
                        {params.paused ? <Activity className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                        {params.paused ? 'RESUME' : 'FREEZE'}
                    </button>

                    <button
                        onClick={() => onParamsChange({
                            mass: 1.2, spin: 1.5, diskDensity: 3.5, diskTemp: 1.3, lensing: 1.0, paused: false, zoom: 14.0
                        })}
                        className="flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] font-medium tracking-wide transition-colors"
                    >
                        <RefreshCcw className="w-3 h-3" />
                        RESET
                    </button>
                </div>
            </div>
        </div>
    );
};
