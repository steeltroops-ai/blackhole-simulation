/**
 * Telemetry Component
 * Top-right telemetry display showing real-time physics calculations and performance metrics
 */

import type { SimulationParams, PerformanceMetrics } from '@/types/simulation';
import { calculateEventHorizon, calculateTimeDilation } from '@/physics/kerr-metric';

interface TelemetryProps {
    params: SimulationParams;
    metrics?: PerformanceMetrics;
}

export const Telemetry = ({ params, metrics }: TelemetryProps) => {
    // Calculate accurate physics values
    const normalizedSpin = Math.max(-1, Math.min(1, params.spin / 5.0));
    const eventHorizonRadius = calculateEventHorizon(params.mass, normalizedSpin);

    // Calculate time dilation at a representative radius (e.g., 3x event horizon)
    const timeDilation = calculateTimeDilation(eventHorizonRadius * 3, params.mass);

    // Calculate gravitational redshift from time dilation
    const redshift = (1 / timeDilation) - 1;

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
                <div className="flex gap-4 text-right mt-2 pt-2 border-t border-white/10">
                    <div className="group">
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 group-hover:text-green-400 transition-colors">FPS</p>
                        <p className={`font-mono text-sm ${metrics.fps >= 50 ? 'text-green-400' : metrics.fps >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {metrics.fps}
                        </p>
                    </div>
                    <div className="group">
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 group-hover:text-cyan-400 transition-colors">Quality</p>
                        <p className="font-mono text-sm text-cyan-400 uppercase">{metrics.quality}</p>
                    </div>
                </div>
            )}
        </div>
    );
};
