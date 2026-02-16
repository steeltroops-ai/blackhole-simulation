/**
 * Debug Performance Overlay Component
 * 
 * Displays detailed performance breakdown for debugging and optimization
 * 
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5
 */

import { X } from 'lucide-react';

/**
 * Detailed performance metrics for debugging
 */
export interface DebugMetrics {
    /** GPU time in milliseconds */
    gpuTimeMs?: number;
    /** CPU time in milliseconds */
    cpuTimeMs?: number;
    /** Idle time in milliseconds */
    idleTimeMs?: number;
    /** Shader compilation times by variant */
    shaderCompilationTimes?: Map<string, number>;
    /** Number of uniform updates per frame */
    uniformUpdateCount?: number;
    /** Buffer swap time in milliseconds */
    bufferSwapTimeMs?: number;
    /** Total frame time in milliseconds */
    totalFrameTimeMs: number;
    /** Current FPS */
    currentFPS: number;
    /** Rolling average FPS */
    rollingAverageFPS: number;
    /** Render resolution percentage */
    renderResolution: number;
    /** Number of draw calls */
    drawCalls?: number;
    /** Number of shader switches */
    shaderSwitches?: number;
    /** GPU memory usage in MB */
    gpuMemoryUsageMB?: number;
}

interface DebugOverlayProps {
    /** Whether the debug overlay is visible */
    enabled: boolean;
    /** Callback to toggle the debug overlay */
    onToggle: (enabled: boolean) => void;
    /** Debug performance metrics */
    metrics: DebugMetrics;
    /** Active backend name */
    backend?: string;
}

/**
 * DebugOverlay Component
 * 
 * Displays comprehensive performance breakdown including:
 * - Frame time breakdown by render stage (Requirement 20.1)
 * - GPU time, CPU time, and idle time separately (Requirement 20.2)
 * - Shader compilation times (Requirement 20.3)
 * - Uniform update counts and buffer swap times (Requirement 20.4)
 * - Toggle to enable/disable debug overlay (Requirement 20.5)
 */
export const DebugOverlay = ({ enabled, onToggle, metrics, backend }: DebugOverlayProps) => {
    if (!enabled) {
        return null;
    }

    // Calculate percentages for frame time breakdown
    const gpuPercent = metrics.gpuTimeMs
        ? (metrics.gpuTimeMs / metrics.totalFrameTimeMs) * 100
        : 0;
    const cpuPercent = metrics.cpuTimeMs
        ? (metrics.cpuTimeMs / metrics.totalFrameTimeMs) * 100
        : 0;
    const idlePercent = metrics.idleTimeMs
        ? (metrics.idleTimeMs / metrics.totalFrameTimeMs) * 100
        : 0;

    // Get color based on performance
    const getTimeColor = (timeMs: number): string => {
        if (timeMs < 8) return 'text-green-400';
        if (timeMs < 13.3) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getFPSColor = (fps: number): string => {
        if (fps >= 60) return 'text-green-400';
        if (fps >= 30) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="absolute top-20 left-6 z-30 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-4 min-w-[320px] max-w-[400px] shadow-2xl font-mono text-xs">
            {/* Header */}
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        Debug Performance
                    </h3>
                </div>
                {backend && (
                    <div className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-cyan-300 font-medium tracking-wide">
                        {backend}
                    </div>
                )}
                <button
                    onClick={() => onToggle(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
                    aria-label="Close debug overlay"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Frame Time Breakdown (Requirement 20.1) */}
            <div className="mb-4">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                    Frame Time Breakdown
                </p>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-300">Total Frame Time:</span>
                        <span className={`font-bold ${getTimeColor(metrics.totalFrameTimeMs)}`}>
                            {metrics.totalFrameTimeMs.toFixed(2)}ms
                        </span>
                    </div>

                    {/* GPU Time (Requirement 20.2) */}
                    {metrics.gpuTimeMs !== undefined && (
                        <div className="flex justify-between items-center">
                            <span className="text-gray-300">GPU Time:</span>
                            <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500"
                                        style={{ width: `${Math.min(100, gpuPercent)}%` }}
                                    />
                                </div>
                                <span className={`font-bold ${getTimeColor(metrics.gpuTimeMs)}`}>
                                    {metrics.gpuTimeMs.toFixed(2)}ms
                                </span>
                            </div>
                        </div>
                    )}

                    {/* CPU Time (Requirement 20.2) */}
                    {metrics.cpuTimeMs !== undefined && (
                        <div className="flex justify-between items-center">
                            <span className="text-gray-300">CPU Time:</span>
                            <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500"
                                        style={{ width: `${Math.min(100, cpuPercent)}%` }}
                                    />
                                </div>
                                <span className={`font-bold ${getTimeColor(metrics.cpuTimeMs)}`}>
                                    {metrics.cpuTimeMs.toFixed(2)}ms
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Idle Time (Requirement 20.2) */}
                    {metrics.idleTimeMs !== undefined && (
                        <div className="flex justify-between items-center">
                            <span className="text-gray-300">Idle Time:</span>
                            <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gray-500"
                                        style={{ width: `${Math.min(100, idlePercent)}%` }}
                                    />
                                </div>
                                <span className="font-bold text-gray-400">
                                    {metrics.idleTimeMs.toFixed(2)}ms
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Performance Metrics */}
            <div className="mb-4 pb-4 border-b border-white/10">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                    Performance Metrics
                </p>
                <div className="space-y-1.5">
                    <div className="flex justify-between">
                        <span className="text-gray-300">Current FPS:</span>
                        <span className={`font-bold ${getFPSColor(metrics.currentFPS)}`}>
                            {metrics.currentFPS}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-300">Rolling Avg FPS:</span>
                        <span className={`font-bold ${getFPSColor(metrics.rollingAverageFPS)}`}>
                            {metrics.rollingAverageFPS}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-300">Resolution:</span>
                        <span className="font-bold text-cyan-400">
                            {Math.round(metrics.renderResolution * 100)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Shader Compilation Times (Requirement 20.3) */}
            {metrics.shaderCompilationTimes && metrics.shaderCompilationTimes.size > 0 && (
                <div className="mb-4 pb-4 border-b border-white/10">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                        Shader Compilation Times
                    </p>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {Array.from(metrics.shaderCompilationTimes.entries()).map(([variant, time]) => (
                            <div key={variant} className="flex justify-between">
                                <span className="text-gray-300 truncate mr-2" title={variant}>
                                    {variant.length > 20 ? `${variant.substring(0, 20)}...` : variant}
                                </span>
                                <span className={`font-bold ${time > 100 ? 'text-red-400' : 'text-green-400'}`}>
                                    {time.toFixed(1)}ms
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* WebGL Statistics (Requirement 20.4) */}
            <div className="mb-4 pb-4 border-b border-white/10">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                    WebGL Statistics
                </p>
                <div className="space-y-1.5">
                    {/* Uniform Update Count (Requirement 20.4) */}
                    {metrics.uniformUpdateCount !== undefined && (
                        <div className="flex justify-between">
                            <span className="text-gray-300">Uniform Updates:</span>
                            <span className="font-bold text-blue-400">
                                {metrics.uniformUpdateCount}
                            </span>
                        </div>
                    )}

                    {/* Buffer Swap Time (Requirement 20.4) */}
                    {metrics.bufferSwapTimeMs !== undefined && (
                        <div className="flex justify-between">
                            <span className="text-gray-300">Buffer Swap:</span>
                            <span className={`font-bold ${getTimeColor(metrics.bufferSwapTimeMs)}`}>
                                {metrics.bufferSwapTimeMs.toFixed(2)}ms
                            </span>
                        </div>
                    )}

                    {metrics.drawCalls !== undefined && (
                        <div className="flex justify-between">
                            <span className="text-gray-300">Draw Calls:</span>
                            <span className="font-bold text-purple-400">
                                {metrics.drawCalls}
                            </span>
                        </div>
                    )}

                    {metrics.shaderSwitches !== undefined && (
                        <div className="flex justify-between">
                            <span className="text-gray-300">Shader Switches:</span>
                            <span className="font-bold text-orange-400">
                                {metrics.shaderSwitches}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Memory Usage */}
            {metrics.gpuMemoryUsageMB !== undefined && (
                <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                        Memory Usage
                    </p>
                    <div className="flex justify-between">
                        <span className="text-gray-300">GPU Memory:</span>
                        <span className="font-bold text-purple-400">
                            {metrics.gpuMemoryUsageMB.toFixed(1)}MB
                        </span>
                    </div>
                </div>
            )}

            {/* Footer Note */}
            <div className="mt-4 pt-3 border-t border-white/10">
                <p className="text-[9px] text-gray-500 text-center">
                    Debug overlay may impact performance
                </p>
            </div>
        </div>
    );
};
