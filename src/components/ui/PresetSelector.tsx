/**
 * PresetSelector Component
 * Dropdown selector for performance presets
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { useState } from 'react';
import { Zap, ChevronDown } from 'lucide-react';
import type { PresetName } from '@/types/features';

interface PresetSelectorProps {
    currentPreset: PresetName;
    onPresetChange: (preset: PresetName) => void;
}

const PRESET_INFO: Record<PresetName, { label: string; description: string; icon: string }> = {
    'maximum-performance': {
        label: 'Maximum Performance',
        description: 'All features disabled, lowest quality - best FPS',
        icon: '⚡',
    },
    'balanced': {
        label: 'Balanced',
        description: 'Core features enabled, medium quality - good balance',
        icon: '⚖️',
    },
    'high-quality': {
        label: 'High Quality',
        description: 'Most features enabled, high quality - great visuals',
        icon: '✨',
    },
    'ultra-quality': {
        label: 'Ultra Quality',
        description: 'All features enabled, maximum quality - best visuals',
        icon: '💎',
    },
    'custom': {
        label: 'Custom',
        description: 'User-defined settings',
        icon: '🎛️',
    },
};

export const PresetSelector = ({ currentPreset, onPresetChange }: PresetSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const handlePresetSelect = (preset: PresetName) => {
        onPresetChange(preset);
        setIsOpen(false);
    };

    const currentInfo = PRESET_INFO[currentPreset];

    return (
        <div className="relative">
            {/* Dropdown Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] font-medium tracking-wide transition-all"
                aria-label="Select performance preset"
            >
                <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-cyan-400" />
                    <span className="text-[9px] uppercase tracking-widest text-gray-400">Preset:</span>
                    <span className="text-white">{currentInfo.icon} {currentInfo.label}</span>
                </div>
                <ChevronDown className={`w-3 h-3 text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Menu */}
                    <div className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-black/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl overflow-hidden">
                        {(Object.keys(PRESET_INFO) as PresetName[])
                            .filter(preset => preset !== 'custom')
                            .map((preset) => {
                                const info = PRESET_INFO[preset];
                                const isSelected = preset === currentPreset;

                                return (
                                    <button
                                        key={preset}
                                        onClick={() => handlePresetSelect(preset)}
                                        className={`w-full px-3 py-2 text-left transition-colors ${isSelected
                                            ? 'bg-cyan-500/20 border-l-2 border-cyan-400'
                                            : 'hover:bg-white/10 border-l-2 border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm">{info.icon}</span>
                                            <span className="text-[10px] font-medium text-white">{info.label}</span>
                                            {isSelected && (
                                                <span className="ml-auto text-[8px] text-cyan-400">✓ ACTIVE</span>
                                            )}
                                        </div>
                                        <p className="text-[8px] text-gray-400 leading-tight">{info.description}</p>
                                    </button>
                                );
                            })}
                    </div>
                </>
            )}
        </div>
    );
};
