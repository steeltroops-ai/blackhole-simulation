/**
 * Telemetry Component
 * Top-right telemetry display showing real-time physics calculations and performance metrics
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 12.4, 12.5
 */

import { useState } from 'react';
import type { SimulationParams } from '@/types/simulation';
import type { PerformanceMetrics } from '@/performance/monitor';
import { calculateEventHorizon, calculateTimeDilation } from '@/physics/kerr-metric';

interface TelemetryProps {
    params: SimulationParams;
    metrics?: PerformanceMetrics;
    budgetUsage?: number;
}

export const Telemetry = ({ params, metrics, budgetUsage = 0 }: TelemetryProps) => {
    const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);

    // Calculate accurate physics values
    const normalizedSpin = Math.max(-1, Math.min(1, params.spin / 5.0));
    const eventHorizonRadius = calculateEventHorizon(params.mass, normalizedSpin);

    // Calculate time dilation at a representative radius (e.g., 3x event horizon)
    const timeDilation = calculateTimeDilation(eventHorizonRadius * 3, params.mass);

    // Calculate gravitational redshift from time dilation
    const redshift = (1 / timeDilation) - 1;

    // Determine FPS color based on thresholds (Requirements 10.4, 10.5)
    const getFPSColor = (fps: number): string => {
        if (fps >= 60) return 'text-green-400';
        if (fps >= 30) return 'text-yellow-400';
        return 'text-red-400';
    };

    // Determine budget bar color
    const getBudgetColor = (usage: number): string => {
        if (usage < 80) return 'bg-green-500';
        if (usage < 100) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="flex flex-col items-end gap-4">
            <div className="flex gap-6 text-right">
                <div className="group">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 group-hover:text-blue-400 transition-colors">Event Horizon</p>
                    <p className="font-mono text-base md:text-xl">{eventHorizonRadius.toFixed(2)} <span className="text-[10px] text-gray-600">Rs</span></p>
                </div>
                <div className="group">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 group-hover:text-orange-400 transition-colors">Redshift</p>
                    <p className="font-mono text-base md:text-xl">z={redshift.toFixed(2)}</p>
                </div>
                <div className="group">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 group-hover:text-purple-400 transition-colors">Time Dilation</p>
                    <p className="font-mono text-base md:text-xl">{timeDilation.toFixed(3)}<span className="text-[10px] text-gray-600">x</span></p>
                </div>
            </div>

            {/* Performance metrics display */}
            {metrics && (
                <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/10">
                    <div className="flex gap-4 text-right">
                        {/* Current FPS with color coding (Requirements 10.1, 10.4, 10.5) */}
                        <div
                            className="group relative cursor-help"
                            onMouseEnter={() => setShowDetailedBreakdown(true)}
                            onMouseLeave={() => setShowDetailedBreakdown(false)}
                        >
                            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 group-hover:text-green-400 transition-colors">FPS</p>
                            <p className={`font-mono text-sm ${getFPSColor(metrics.currentFPS)}`}>
                                {metrics.currentFPS}
                            </p>
                        </div>

                        {/* Frame time in milliseconds (Requirement 10.2) */}
                        <div className="group">
                            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 group-hover:text-blue-400 transition-colors">Frame Time</p>
                            <p className="font-mono text-sm text-blue-400">
                                {metrics.frameTimeMs.toFixed(1)}<span className="text-[10px] text-gray-600">ms</span>
                            </p>
                        </div>

                        {/* Rolling average FPS (Requirement 10.3) */}
                        <div className="group">
                            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 group-hover:text-purple-400 transition-colors">Avg FPS</p>
                            <p className={`font-mono text-sm ${getFPSColor(metrics.rollingAverageFPS)}`}>
                                {metrics.rollingAverageFPS}
                            </p>
                        </div>

                        <div className="group">
                            <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 group-hover:text-cyan-400 transition-colors">Quality</p>
                            <p className="font-mono text-sm text-cyan-400 uppercase">{metrics.quality}</p>
                        </div>
                    </div>

                    {/* Performance budget visualization (Requirement 12.4) */}
                    <div className="mt-1">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-[9px] text-gray-500 uppercase tracking-wider">Frame Budget</p>
                            <p className="text-[9px] font-mono text-gray-400">{Math.round(budgetUsage)}%</p>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${getBudgetColor(budgetUsage)}`}
                                style={{ width: `${Math.min(100, budgetUsage)}%` }}
                            />
                        </div>
                        <p className="text-[8px] text-gray-600 mt-0.5">Target: 13.3ms (75 FPS)</p>
                    </div>

                    {/* Detailed breakdown tooltip (Requirement 10.6, 12.5) */}
                    {showDetailedBreakdown && (
                        <div className="absolute top-full right-0 mt-2 bg-black/90 backdrop-blur-md border border-white/20 rounded-lg p-3 min-w-[200px] shadow-xl z-50 pointer-events-none">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Performance Breakdown</p>
                            <div className="space-y-1.5 text-[11px]">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Current FPS:</span>
                                    <span className={`font-mono ${getFPSColor(metrics.currentFPS)}`}>{metrics.currentFPS}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Rolling Avg:</span>
                                    <span className={`font-mono ${getFPSColor(metrics.rollingAverageFPS)}`}>{metrics.rollingAverageFPS}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Frame Time:</span>
                                    <span className="font-mono text-blue-400">{metrics.frameTimeMs.toFixed(2)}ms</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Target Time:</span>
                                    <span className="font-mono text-gray-500">13.3ms</span>
                                </div>
                                <div className="h-px bg-white/10 my-1.5" />
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Budget Usage:</span>
                                    <span className={`font-mono ${budgetUsage > 100 ? 'text-red-400' : budgetUsage > 80 ? 'text-yellow-400' : 'text-green-400'}`}>
                                        {Math.round(budgetUsage)}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Resolution:</span>
                                    <span className="font-mono text-cyan-400">{Math.round(metrics.renderResolution * 100)}%</span>
                                </div>
                                {metrics.gpuMemoryUsageMB && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">GPU Memory:</span>
                                        <span className="font-mono text-purple-400">{metrics.gpuMemoryUsageMB.toFixed(0)}MB</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
