/**
 * FeatureTogglePanel Component
 * Individual feature toggles with performance cost display
 * Requirements: 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 12.1, 12.2, 12.3
 */

import { useState } from 'react';
import { Info } from 'lucide-react';
import type { FeatureToggles, RayTracingQuality } from '@/types/features';

interface FeatureTogglePanelProps {
    features: FeatureToggles;
    onFeaturesChange: (features: FeatureToggles) => void;
}

/**
 * Performance cost estimates for each feature (in milliseconds)
 * Requirements: 12.1, 12.2
 */
const FEATURE_COSTS: Record<keyof FeatureToggles | 'rayTracingQuality', number> = {
    gravitationalLensing: 4.5,
    rayTracingQuality: 0, // Calculated based on quality level
    accretionDisk: 6.0,
    dopplerBeaming: 2.0,
    backgroundStars: 1.5,
    photonSphereGlow: 0.8,
    bloom: 3.0,
};

/**
 * Ray tracing quality cost multipliers
 */
const RAY_QUALITY_COSTS: Record<RayTracingQuality, number> = {
    off: 0,
    low: 1.0,
    medium: 3.0,
    high: 6.0,
    ultra: 10.0,
};

/**
 * Feature descriptions for tooltips
 * Requirements: 12.3
 */
const FEATURE_INFO: Record<keyof FeatureToggles, { name: string; description: string }> = {
    gravitationalLensing: {
        name: 'Gravitational Lensing',
        description: 'Ray bending around the black hole. Creates Einstein rings and distorted backgrounds. High performance cost.',
    },
    rayTracingQuality: {
        name: 'Ray Tracing Quality',
        description: 'Number of ray marching steps. Higher quality = more accurate light paths but slower rendering.',
    },
    accretionDisk: {
        name: 'Accretion Disk',
        description: 'Hot gas disk with volumetric rendering and temperature-based colors. Highest performance cost.',
    },
    dopplerBeaming: {
        name: 'Doppler Beaming',
        description: 'Relativistic brightness and color shifting. Approaching side appears brighter and bluer.',
    },
    backgroundStars: {
        name: 'Background Stars',
        description: 'Starfield rendering with optional gravitational lensing. Low performance cost.',
    },
    photonSphereGlow: {
        name: 'Photon Sphere Glow',
        description: 'Cyan-blue glow at the unstable photon orbit radius. Very low performance cost.',
    },
    bloom: {
        name: 'Bloom Effect',
        description: 'Post-processing glow around bright objects. Moderate performance cost.',
    },
};

/**
 * Ray tracing quality level descriptions
 */
const QUALITY_INFO: Record<RayTracingQuality, { label: string; steps: number; description: string }> = {
    off: { label: 'Off', steps: 0, description: 'No ray marching - simple sphere rendering' },
    low: { label: 'Low', steps: 50, description: 'Fast but less accurate' },
    medium: { label: 'Medium', steps: 150, description: 'Balanced quality and performance' },
    high: { label: 'High', steps: 300, description: 'High quality with good detail' },
    ultra: { label: 'Ultra', steps: 500, description: 'Maximum quality and detail' },
};

export const FeatureTogglePanel = ({ features, onFeaturesChange }: FeatureTogglePanelProps) => {
    const [hoveredFeature, setHoveredFeature] = useState<keyof FeatureToggles | null>(null);

    /**
     * Calculate total frame time budget usage
     * Requirements: 12.4
     */
    const calculateBudgetUsage = (): { totalMs: number; percentage: number } => {
        let totalMs = 0;

        // Add costs for enabled boolean features
        const booleanFeatures: (keyof FeatureToggles)[] = [
            'gravitationalLensing',
            'accretionDisk',
            'dopplerBeaming',
            'backgroundStars',
            'photonSphereGlow',
            'bloom',
        ];

        for (const feature of booleanFeatures) {
            if (features[feature] === true) {
                totalMs += FEATURE_COSTS[feature];
            }
        }

        // Add ray tracing quality cost
        totalMs += RAY_QUALITY_COSTS[features.rayTracingQuality];

        // Target frame time for 75 FPS is 13.3ms
        const targetFrameTime = 13.3;
        const percentage = (totalMs / targetFrameTime) * 100;

        return { totalMs, percentage };
    };

    const { totalMs, percentage } = calculateBudgetUsage();

    /**
     * Handle toggle change for boolean features
     */
    const handleToggle = (feature: keyof FeatureToggles) => {
        if (feature === 'rayTracingQuality') return; // Handle separately

        onFeaturesChange({
            ...features,
            [feature]: !features[feature],
        });
    };

    /**
     * Handle ray tracing quality change
     */
    const handleQualityChange = (quality: RayTracingQuality) => {
        onFeaturesChange({
            ...features,
            rayTracingQuality: quality,
        });
    };

    return (
        <div className="space-y-3">
            {/* Performance Budget Display */}
            <div className="p-3 bg-white/5 rounded border border-white/5">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] uppercase tracking-widest text-gray-400">Frame Time Budget</span>
                    <span className={`text-[10px] font-mono font-bold ${percentage > 100 ? 'text-red-400' : percentage > 80 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                        {totalMs.toFixed(1)}ms / 13.3ms ({percentage.toFixed(0)}%)
                    </span>
                </div>

                {/* Budget Bar */}
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${percentage > 100 ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>

                {percentage > 100 && (
                    <p className="text-[8px] text-red-400 mt-1">
                        ⚠ Over budget - consider disabling features for better performance
                    </p>
                )}
            </div>

            {/* Ray Tracing Quality Selector */}
            <div className="p-3 bg-white/5 rounded border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] uppercase tracking-widest text-gray-400">
                        {FEATURE_INFO.rayTracingQuality.name}
                    </span>
                    <div
                        className="relative group cursor-help"
                        onMouseEnter={() => setHoveredFeature('rayTracingQuality')}
                        onMouseLeave={() => setHoveredFeature(null)}
                    >
                        <Info className="w-3 h-3 text-gray-500 hover:text-gray-300" />
                        {hoveredFeature === 'rayTracingQuality' && (
                            <div className="absolute left-0 top-full mt-1 z-50 bg-black/95 border border-white/20 rounded px-2 py-1 text-[8px] text-white/90 w-56 shadow-xl">
                                {FEATURE_INFO.rayTracingQuality.description}
                            </div>
                        )}
                    </div>
                    <span className="ml-auto text-[9px] font-mono text-cyan-400">
                        ~{RAY_QUALITY_COSTS[features.rayTracingQuality].toFixed(1)}ms
                    </span>
                </div>

                {/* Quality Buttons */}
                <div className="grid grid-cols-5 gap-1">
                    {(Object.keys(QUALITY_INFO) as RayTracingQuality[]).map((quality) => {
                        const info = QUALITY_INFO[quality];
                        const isSelected = features.rayTracingQuality === quality;

                        return (
                            <button
                                key={quality}
                                onClick={() => handleQualityChange(quality)}
                                className={`px-2 py-1.5 rounded text-[8px] font-medium transition-all ${isSelected
                                    ? 'bg-cyan-500 text-black'
                                    : 'bg-white/5 hover:bg-white/10 text-white/80'
                                    }`}
                                title={`${info.description} (${info.steps} steps)`}
                            >
                                {info.label}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-1 text-[8px] text-gray-400">
                    {QUALITY_INFO[features.rayTracingQuality].steps} ray marching steps
                </div>
            </div>

            {/* Individual Feature Toggles */}
            <div className="space-y-2">
                {(Object.keys(FEATURE_INFO) as (keyof FeatureToggles)[])
                    .filter(key => key !== 'rayTracingQuality')
                    .map((feature) => {
                        const info = FEATURE_INFO[feature];
                        const isEnabled = features[feature] as boolean;
                        const cost = FEATURE_COSTS[feature];

                        return (
                            <div
                                key={feature}
                                className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/5 hover:bg-white/10 transition-colors"
                            >
                                <div className="flex items-center gap-2 flex-1">
                                    {/* Toggle Switch */}
                                    <button
                                        onClick={() => handleToggle(feature)}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${isEnabled ? 'bg-cyan-500' : 'bg-gray-700'
                                            }`}
                                        aria-label={`Toggle ${info.name}`}
                                    >
                                        <div
                                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                        />
                                    </button>

                                    {/* Feature Name */}
                                    <span className="text-[10px] font-medium text-white">
                                        {info.name}
                                    </span>

                                    {/* Info Icon with Tooltip */}
                                    <div
                                        className="relative group cursor-help"
                                        onMouseEnter={() => setHoveredFeature(feature)}
                                        onMouseLeave={() => setHoveredFeature(null)}
                                    >
                                        <Info className="w-3 h-3 text-gray-500 hover:text-gray-300" />
                                        {hoveredFeature === feature && (
                                            <div className="absolute left-0 top-full mt-1 z-50 bg-black/95 border border-white/20 rounded px-2 py-1 text-[8px] text-white/90 w-56 shadow-xl">
                                                {info.description}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Performance Cost */}
                                <div className="flex items-center gap-1">
                                    <span className={`text-[9px] font-mono ${isEnabled ? 'text-cyan-400' : 'text-gray-500'
                                        }`}>
                                        {isEnabled ? `~${cost.toFixed(1)}ms` : '—'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};
