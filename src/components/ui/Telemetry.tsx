/**
 * Telemetry Component
 * Top-right telemetry display showing real-time physics calculations
 */

interface SimulationParams {
    mass: number;
    spin: number;
    diskDensity: number;
    diskTemp: number;
    lensing: number;
    paused: boolean;
    zoom: number;
}

interface TelemetryProps {
    params: SimulationParams;
}

export const Telemetry = ({ params }: TelemetryProps) => {
    return (
        <div className="flex flex-col items-end gap-4">
            <div className="flex gap-6 text-right">
                <div className="group">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 group-hover:text-blue-400 transition-colors">Event Horizon</p>
                    <p className="font-mono text-base md:text-xl">{(params.mass * 2.95).toFixed(2)} <span className="text-[10px] text-gray-600">km</span></p>
                </div>
                <div className="group">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 group-hover:text-orange-400 transition-colors">Redshift</p>
                    <p className="font-mono text-base md:text-xl">z={(params.mass * 0.8).toFixed(2)}</p>
                </div>
                <div className="group">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 group-hover:text-purple-400 transition-colors">Time Dilation</p>
                    <p className="font-mono text-base md:text-xl">{(1.0 / Math.sqrt(1 - 1 / 3)).toFixed(3)}<span className="text-[10px] text-gray-600">x</span></p>
                </div>
            </div>
        </div>
    );
};
