/**
 * WebGLCanvas Component
 * Canvas element with WebGL context management and event handlers
 * Enhanced with error handling and user-friendly error messages
 */

import { useRef, useEffect } from 'react';
import { useWebGL } from '@/hooks/useWebGL';
import { useAnimation } from '@/hooks/useAnimation';
import { AlertCircle } from 'lucide-react';
import type { SimulationParams, MouseState } from '@/types/simulation';
import type { PerformanceMetrics } from '@/performance/monitor';

interface WebGLCanvasProps {
    params: SimulationParams;
    mouse: MouseState;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
    onWheel: (e: React.WheelEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export const WebGLCanvas = ({
    params,
    mouse,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onWheel,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMetricsUpdate,
}: WebGLCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Initialize WebGL context and program with error handling
    // Requirements: 12.1, 12.2, 12.3
    const { glRef, programRef, bloomManagerRef, error, resolutionScale } = useWebGL(canvasRef);

    // Start animation loop with performance monitoring
    const { metrics } = useAnimation(glRef, programRef, bloomManagerRef, params, mouse);

    // Pass metrics to parent component
    useEffect(() => {
        if (onMetricsUpdate && metrics) {
            onMetricsUpdate(metrics);
        }
    }, [metrics, onMetricsUpdate]);

    // Handle canvas resize with DPR capping
    // Requirements: 7.3 - Cap DPR to 2.0 maximum to prevent excessive GPU load
    const handleResize = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            // Cap device pixel ratio to 2.0 maximum, apply resolution scale for memory constraints
            const dpr = Math.min(window.devicePixelRatio || 1, 2.0) * resolutionScale;
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
        }
    };

    useEffect(() => {
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, [resolutionScale]);

    return (
        <>
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full z-0 cursor-move"
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onWheel={onWheel}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            />

            {/* Error overlay - Requirements: 12.1, 12.2 */}
            {error && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                    <div className="max-w-md mx-4 p-6 bg-red-950/50 border border-red-500/30 rounded-xl shadow-2xl">
                        <div className="flex items-start gap-4">
                            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                            <div className="flex-1">
                                <h2 className="text-lg font-bold text-red-300 mb-2">
                                    {error.type === 'context' && 'WebGL Not Available'}
                                    {error.type === 'shader' && 'Shader Compilation Error'}
                                    {error.type === 'program' && 'Program Linking Error'}
                                    {error.type === 'memory' && 'GPU Memory Error'}
                                </h2>
                                <p className="text-sm text-gray-300 mb-3">
                                    {error.message}
                                </p>
                                {error.details && (
                                    <details className="text-xs text-gray-400 bg-black/30 p-3 rounded border border-white/10">
                                        <summary className="cursor-pointer font-medium text-gray-300 mb-2">
                                            Technical Details
                                        </summary>
                                        <pre className="whitespace-pre-wrap font-mono">
                                            {error.details}
                                        </pre>
                                    </details>
                                )}
                                {error.type === 'context' && (
                                    <div className="mt-4 text-xs text-gray-400">
                                        <p className="mb-2">To use this application, you need:</p>
                                        <ul className="list-disc list-inside space-y-1 ml-2">
                                            <li>A modern browser (Chrome, Firefox, Safari, or Edge)</li>
                                            <li>Hardware acceleration enabled in browser settings</li>
                                            <li>Updated graphics drivers</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
