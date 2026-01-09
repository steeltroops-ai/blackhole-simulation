/**
 * ControlPanel Component
 * Bottom control panel with parameter sliders and action buttons
 * Enhanced with tooltips, bounds indication, smooth animations, and pause/resume
 */

import { useState, useEffect } from 'react';
import { Activity, Power, RefreshCcw, ChevronDown, Atom, Settings, Zap } from 'lucide-react';
import { ControlSlider } from './ControlSlider';
import { PresetSelector } from './PresetSelector';
import { FeatureTogglePanel } from './FeatureTogglePanel';
import { calculateEventHorizon, calculatePhotonSphere, calculateISCO } from '@/physics/kerr-metric';
import { clampAndValidate } from '@/utils/validation';
import { usePresets } from '@/hooks/usePresets';
import type { PresetName, FeatureToggles } from '@/types/features';
import { matchesPreset } from '@/types/features';

interface SimulationParams {
    mass: number;
    spin: number;
    diskDensity: number;
    diskTemp: number;
    lensing: number;
    paused: boolean;
    zoom: number;
    features?: FeatureToggles;
    performancePreset?: string;
    adaptiveResolution?: boolean;
    renderScale?: number;
}

interface ControlPanelProps {
    params: SimulationParams;
    onParamsChange: (params: SimulationParams) => void;
    showUI: boolean;
    onToggleUI: (show: boolean) => void;
    onStartBenchmark?: () => void;
    onCancelBenchmark?: () => void;
    isBenchmarkRunning?: boolean;
}

// Default parameter values
const DEFAULT_PARAMS = {
    mass: 1.2,
    spin: 1.5,
    diskDensity: 3.5,
    diskTemp: 1.3,
    lensing: 1.0,
    paused: false,
    zoom: 14.0
};

export const ControlPanel = ({
    params,
    onParamsChange,
    showUI,
    onToggleUI,
    onStartBenchmark,
    onCancelBenchmark,
    isBenchmarkRunning = false
}: ControlPanelProps) => {
    const [isResetting, setIsResetting] = useState(false);
    const [showFeatureToggles, setShowFeatureToggles] = useState(false);
    const [calculatedRadii, setCalculatedRadii] = useState({
        eventHorizon: 0,
        photonSphere: 0,
        isco: 0
    });

    const { applyPreset } = usePresets();

    // Recalculate dependent radii when mass or spin changes
    useEffect(() => {
        // Normalize spin to [-1, 1] range for physics calculations
        const normalizedSpin = Math.max(-1, Math.min(1, params.spin / 5.0));

        const eventHorizon = calculateEventHorizon(params.mass, normalizedSpin);
        const photonSphere = calculatePhotonSphere(params.mass, normalizedSpin);
        const isco = calculateISCO(params.mass, normalizedSpin, true); // prograde orbit

        setCalculatedRadii({
            eventHorizon,
            photonSphere,
            isco
        });
    }, [params.mass, params.spin]);

    // Handle reset with smooth animation
    const handleReset = () => {
        setIsResetting(true);
        onParamsChange(DEFAULT_PARAMS);

        // Reset animation state after transition
        setTimeout(() => {
            setIsResetting(false);
        }, 500);
    };

    // Handle parameter changes with real-time updates (no lag)
    // Requirement 8.3: Clamp all parameter inputs to valid ranges and validate numeric inputs
    const handleParamChange = (newParams: SimulationParams) => {
        // Validate and clamp all parameters to their valid ranges
        const validatedParams: SimulationParams = {
            mass: clampAndValidate(newParams.mass, 0.1, 3.0, DEFAULT_PARAMS.mass),
            spin: clampAndValidate(newParams.spin, -5.0, 5.0, DEFAULT_PARAMS.spin),
            diskDensity: clampAndValidate(newParams.diskDensity, 0.0, 5.0, DEFAULT_PARAMS.diskDensity),
            diskTemp: clampAndValidate(newParams.diskTemp, 0.5, 3.0, DEFAULT_PARAMS.diskTemp),
            lensing: clampAndValidate(newParams.lensing, 0.0, 3.0, DEFAULT_PARAMS.lensing),
            zoom: clampAndValidate(newParams.zoom, 2.5, 50.0, DEFAULT_PARAMS.zoom),
            paused: newParams.paused,
        };

        onParamsChange(validatedParams);
    };

    // Handle preset change
    const handlePresetChange = (preset: PresetName) => {
        const updatedParams = applyPreset(preset, params);
        onParamsChange(updatedParams);
    };

    // Handle feature toggles change
    const handleFeaturesChange = (features: FeatureToggles) => {
        // Detect if features match a preset
        const detectedPreset = matchesPreset(features);

        onParamsChange({
            ...params,
            features,
            performancePreset: detectedPreset,
        });
    };

    return (
        <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-30 transition-all duration-500 ease-out w-[95%] max-w-3xl ${showUI ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
            <div className={`bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl relative overflow-hidden transition-all duration-500 ${isResetting ? 'scale-[0.98] opacity-80' : 'scale-100 opacity-100'}`}>

                {/* Header & Minimize */}
                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                        <Atom className="w-3 h-3 text-cyan-400" />
                        <h2 className="text-[10px] font-bold tracking-widest uppercase">Relativistic Physics Engine</h2>
                    </div>
                    <button
                        onClick={() => onToggleUI(false)}
                        className="p-1 rounded-full hover:bg-white/10 transition-colors"
                        aria-label="Minimize control panel"
                    >
                        <ChevronDown className="w-3 h-3 text-white/60" />
                    </button>
                </div>

                {/* Calculated Radii Display */}
                <div className="mb-3 p-2 bg-white/5 rounded border border-white/5">
                    <div className="text-[8px] uppercase tracking-widest text-gray-400 mb-1">Calculated Radii</div>
                    <div className="grid grid-cols-3 gap-2 text-[9px]">
                        <div>
                            <span className="text-gray-400">Event Horizon:</span>
                            <span className="ml-1 text-cyan-400 font-mono">{calculatedRadii.eventHorizon.toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="text-gray-400">Photon Sphere:</span>
                            <span className="ml-1 text-blue-400 font-mono">{calculatedRadii.photonSphere.toFixed(2)}</span>
                        </div>
                        <div>
                            <span className="text-gray-400">ISCO:</span>
                            <span className="ml-1 text-purple-400 font-mono">{calculatedRadii.isco.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Performance Preset Selector */}
                <div className="mb-3">
                    <PresetSelector
                        currentPreset={params.performancePreset as PresetName}
                        onPresetChange={handlePresetChange}
                    />
                </div>

                {/* Feature Toggles Section */}
                <div className="mb-3">
                    <button
                        onClick={() => setShowFeatureToggles(!showFeatureToggles)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] font-medium tracking-wide transition-all"
                        aria-label="Toggle feature settings"
                    >
                        <div className="flex items-center gap-2">
                            <Settings className="w-3 h-3 text-purple-400" />
                            <span className="text-[9px] uppercase tracking-widest text-gray-400">Advanced Features</span>
                        </div>
                        <ChevronDown className={`w-3 h-3 text-white/60 transition-transform ${showFeatureToggles ? 'rotate-180' : ''}`} />
                    </button>

                    {showFeatureToggles && params.features && (
                        <div className="mt-2 p-3 bg-black/40 rounded border border-white/5">
                            <FeatureTogglePanel
                                features={params.features}
                                onFeaturesChange={handleFeaturesChange}
                            />
                        </div>
                    )}
                </div>

                {/* Parameters Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                    <ControlSlider
                        label="Camera Zoom"
                        value={params.zoom}
                        min={2.5}
                        max={50.0}
                        step={0.1}
                        onChange={(v) => handleParamChange({ ...params, zoom: v })}
                        unit=" AU"
                        tooltip="Distance from the black hole. Closer values show more detail, farther values show the full system."
                    />
                    <ControlSlider
                        label="Mass (M☉)"
                        value={params.mass}
                        min={0.1}
                        max={3.0}
                        step={0.1}
                        onChange={(v) => handleParamChange({ ...params, mass: v })}
                        tooltip="Black hole mass in solar masses. Higher mass increases the event horizon, photon sphere, and ISCO radii."
                    />
                    <ControlSlider
                        label="Lensing"
                        value={params.lensing}
                        min={0.0}
                        max={3.0}
                        step={0.1}
                        onChange={(v) => handleParamChange({ ...params, lensing: v })}
                        unit="x"
                        tooltip="Gravitational lensing strength multiplier. Higher values create stronger light bending and more dramatic Einstein rings."
                    />
                    <ControlSlider
                        label="Accretion Spin"
                        value={params.spin}
                        min={-5.0}
                        max={5.0}
                        step={0.1}
                        onChange={(v) => handleParamChange({ ...params, spin: v })}
                        unit=" c"
                        tooltip="Rotation speed of the accretion disk. Positive values spin clockwise, negative counter-clockwise. Affects Doppler beaming."
                    />
                    <ControlSlider
                        label="Density"
                        value={params.diskDensity}
                        min={0.0}
                        max={5.0}
                        step={0.1}
                        onChange={(v) => handleParamChange({ ...params, diskDensity: v })}
                        unit=" g"
                        tooltip="Accretion disk density. Higher values make the disk more opaque and brighter."
                    />
                    <ControlSlider
                        label="Temp (K)"
                        value={params.diskTemp}
                        min={0.5}
                        max={3.0}
                        step={0.1}
                        onChange={(v) => handleParamChange({ ...params, diskTemp: v })}
                        tooltip="Temperature profile multiplier. Higher values shift disk colors toward blue (hotter), lower toward red (cooler)."
                    />
                </div>

                {/* Actions Footer */}
                <div className="mt-3 flex justify-center gap-3 border-t border-white/5 pt-3">
                    <button
                        onClick={() => handleParamChange({ ...params, paused: !params.paused })}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded text-[10px] font-medium tracking-wide transition-all ${params.paused
                            ? 'bg-white text-black hover:bg-gray-200'
                            : 'bg-white/5 hover:bg-white/10 border border-white/10'
                            }`}
                        aria-label={params.paused ? 'Resume simulation' : 'Pause simulation'}
                        disabled={isBenchmarkRunning}
                    >
                        {params.paused ? <Activity className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                        {params.paused ? 'RESUME' : 'PAUSE'}
                    </button>

                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] font-medium tracking-wide transition-all hover:scale-105 active:scale-95"
                        aria-label="Reset to default parameters"
                        disabled={isBenchmarkRunning}
                    >
                        <RefreshCcw className={`w-3 h-3 ${isResetting ? 'animate-spin' : ''}`} />
                        RESET
                    </button>

                    {/* Benchmark Button */}
                    {onStartBenchmark && onCancelBenchmark && (
                        <button
                            onClick={isBenchmarkRunning ? onCancelBenchmark : onStartBenchmark}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded text-[10px] font-medium tracking-wide transition-all ${isBenchmarkRunning
                                    ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300'
                                    : 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300'
                                }`}
                            aria-label={isBenchmarkRunning ? 'Cancel benchmark' : 'Start benchmark'}
                        >
                            <Zap className="w-3 h-3" />
                            {isBenchmarkRunning ? 'CANCEL' : 'BENCHMARK'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
