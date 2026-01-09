/**
 * Loading Indicator Component
 * 
 * Displays loading progress for shader compilation and feature loading
 * 
 * Requirements: 18.3, 18.4
 */

'use client';

import type { ProgressiveLoadingState, FeatureCompilationState } from '@/shaders/progressive-loader';

interface LoadingIndicatorProps {
    loadingState: ProgressiveLoadingState | null;
}

/**
 * Get display name for feature
 */
function getFeatureName(key: string): string {
    const names: Record<string, string> = {
        gravitationalLensing: 'Gravitational Lensing',
        accretionDisk: 'Accretion Disk',
        dopplerBeaming: 'Doppler Beaming',
        backgroundStars: 'Background Stars',
        photonSphereGlow: 'Photon Sphere Glow',
        bloom: 'Bloom Effect',
    };
    return names[key] || key;
}

/**
 * Get status color
 */
function getStatusColor(status: FeatureCompilationState['status']): string {
    switch (status) {
        case 'pending':
            return 'text-gray-400';
        case 'compiling':
            return 'text-yellow-400';
        case 'success':
            return 'text-green-400';
        case 'failed':
            return 'text-red-400';
        default:
            return 'text-gray-400';
    }
}

/**
 * Get status icon
 */
function getStatusIcon(status: FeatureCompilationState['status']): string {
    switch (status) {
        case 'pending':
            return '⏳';
        case 'compiling':
            return '⚙️';
        case 'success':
            return '✓';
        case 'failed':
            return '✗';
        default:
            return '○';
    }
}

/**
 * Loading Indicator Component
 * 
 * Requirements:
 * - 18.3: Display loading indicator for features being compiled
 * - 18.4: Remove loading indicators when all features loaded
 */
export function LoadingIndicator({ loadingState }: LoadingIndicatorProps) {
    // Requirement 18.4: Don't show if loading is complete
    if (!loadingState || loadingState.isComplete) {
        return null;
    }

    // Don't show if basic rendering isn't ready yet
    if (!loadingState.hasBasicRendering) {
        return (
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/90 border border-white/20 rounded-lg p-6 text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    <div className="text-lg">Initializing WebGL...</div>
                </div>
            </div>
        );
    }

    const features = Array.from(loadingState.features.entries());
    const hasCompiling = features.some(([_, state]) => state.status === 'compiling');

    // Requirement 18.3: Show loading indicator while features are compiling
    if (!hasCompiling) {
        return null;
    }

    return (
        <div className="fixed top-4 right-4 bg-black/90 border border-white/20 rounded-lg p-4 text-white min-w-[300px]">
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Loading Features</h3>
                    <span className="text-xs text-gray-400">
                        {Math.round(loadingState.overallProgress * 100)}%
                    </span>
                </div>

                {/* Overall progress bar */}
                <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${loadingState.overallProgress * 100}%` }}
                    />
                </div>

                {/* Individual feature status */}
                <div className="flex flex-col gap-2 text-xs">
                    {features.map(([featureName, state]) => (
                        <div key={featureName} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={getStatusColor(state.status)}>
                                    {getStatusIcon(state.status)}
                                </span>
                                <span className="text-gray-300">
                                    {getFeatureName(featureName)}
                                </span>
                            </div>
                            {state.status === 'compiling' && (
                                <div className="animate-pulse text-yellow-400">●</div>
                            )}
                            {state.status === 'failed' && state.error && (
                                <span className="text-red-400 text-xs" title={state.error}>
                                    Failed
                                </span>
                            )}
                            {state.status === 'success' && state.compilationTimeMs && (
                                <span className="text-gray-500 text-xs">
                                    {state.compilationTimeMs.toFixed(0)}ms
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
