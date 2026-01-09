/**
 * Feature toggle type definitions for performance optimization
 */

/**
 * Ray tracing quality levels
 * - off: No ray marching, simple sphere rendering
 * - low: Maximum 50 ray marching steps
 * - medium: Maximum 150 ray marching steps
 * - high: Maximum 300 ray marching steps
 * - ultra: Maximum 500 ray marching steps
 */
export type RayTracingQuality = 'off' | 'low' | 'medium' | 'high' | 'ultra';

/**
 * Feature toggles for controlling rendering features
 * Each feature can be independently enabled/disabled for performance tuning
 */
export interface FeatureToggles {
    /** Enable/disable gravitational lensing calculations */
    gravitationalLensing: boolean;

    /** Ray tracing quality level */
    rayTracingQuality: RayTracingQuality;

    /** Enable/disable accretion disk rendering */
    accretionDisk: boolean;

    /** Enable/disable Doppler beaming effects */
    dopplerBeaming: boolean;

    /** Enable/disable background stars */
    backgroundStars: boolean;

    /** Enable/disable photon sphere glow */
    photonSphereGlow: boolean;

    /** Enable/disable bloom post-processing */
    bloom: boolean;
}

/**
 * Performance preset configurations
 */
export type PresetName = 'maximum-performance' | 'balanced' | 'high-quality' | 'ultra-quality' | 'custom';

/**
 * Performance preset with name and feature configuration
 */
export interface PerformancePreset {
    name: PresetName;
    features: FeatureToggles;
}

/**
 * Performance cost information for a feature
 */
export interface FeaturePerformanceCost {
    featureName: keyof FeatureToggles;
    estimatedFrameTimeMs: number;
    actualFrameTimeMs?: number;
}

/**
 * Default feature toggles (all features enabled, ultra quality)
 */
export const DEFAULT_FEATURES: FeatureToggles = {
    gravitationalLensing: true,
    rayTracingQuality: 'ultra',
    accretionDisk: true,
    dopplerBeaming: true,
    backgroundStars: true,
    photonSphereGlow: true,
    bloom: true,
};

/**
 * Map ray tracing quality to maximum ray steps
 * Requirements: 3.2, 3.3, 3.4, 3.5
 */
export function getMaxRaySteps(quality: RayTracingQuality): number {
    switch (quality) {
        case 'off':
            return 0;
        case 'low':
            return 50;
        case 'medium':
            return 150;
        case 'high':
            return 300;
        case 'ultra':
            return 500;
        default:
            return 500;
    }
}

/**
 * Validate feature toggles object
 * Ensures all required properties exist and have valid values
 */
export function validateFeatureToggles(features: any): features is FeatureToggles {
    if (!features || typeof features !== 'object') {
        return false;
    }

    const requiredBooleans: (keyof FeatureToggles)[] = [
        'gravitationalLensing',
        'accretionDisk',
        'dopplerBeaming',
        'backgroundStars',
        'photonSphereGlow',
        'bloom',
    ];

    for (const key of requiredBooleans) {
        if (typeof features[key] !== 'boolean') {
            return false;
        }
    }

    const validQualities: RayTracingQuality[] = ['off', 'low', 'medium', 'high', 'ultra'];
    if (!validQualities.includes(features.rayTracingQuality)) {
        return false;
    }

    return true;
}

/**
 * Performance presets
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */
export const PERFORMANCE_PRESETS: Record<PresetName, FeatureToggles> = {
    'maximum-performance': {
        gravitationalLensing: false,
        rayTracingQuality: 'low',
        accretionDisk: false,
        dopplerBeaming: false,
        backgroundStars: false,
        photonSphereGlow: false,
        bloom: false,
    },
    'balanced': {
        gravitationalLensing: true,
        rayTracingQuality: 'medium',
        accretionDisk: true,
        dopplerBeaming: false,
        backgroundStars: true,
        photonSphereGlow: false,
        bloom: false,
    },
    'high-quality': {
        gravitationalLensing: true,
        rayTracingQuality: 'high',
        accretionDisk: true,
        dopplerBeaming: true,
        backgroundStars: true,
        photonSphereGlow: true,
        bloom: false,
    },
    'ultra-quality': {
        gravitationalLensing: true,
        rayTracingQuality: 'ultra',
        accretionDisk: true,
        dopplerBeaming: true,
        backgroundStars: true,
        photonSphereGlow: true,
        bloom: true,
    },
    'custom': DEFAULT_FEATURES,
};

/**
 * Get preset by name
 */
export function getPreset(name: PresetName): FeatureToggles {
    return { ...PERFORMANCE_PRESETS[name] };
}

/**
 * Check if feature toggles match a preset
 */
export function matchesPreset(features: FeatureToggles): PresetName {
    const presetNames: PresetName[] = ['maximum-performance', 'balanced', 'high-quality', 'ultra-quality'];

    for (const presetName of presetNames) {
        const preset = PERFORMANCE_PRESETS[presetName];
        if (JSON.stringify(features) === JSON.stringify(preset)) {
            return presetName;
        }
    }

    return 'custom';
}

/**
 * Get mobile-optimized feature configuration
 * 
 * Requirements:
 * - 16.1: Apply "Balanced" preset on mobile
 * - 16.4: Disable bloom by default on mobile
 * 
 * @returns Feature toggles optimized for mobile devices
 */
export function getMobilePreset(): FeatureToggles {
    // Get balanced preset as base (Requirement 16.1)
    const balancedFeatures = getPreset('balanced');

    // Ensure bloom is disabled on mobile (Requirement 16.4)
    return {
        ...balancedFeatures,
        bloom: false,
    };
}
