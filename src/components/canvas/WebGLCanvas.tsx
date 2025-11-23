/**
 * WebGLCanvas Component
 * Canvas element with WebGL context management and event handlers
 */

import { useRef, useEffect } from 'react';
import { useWebGL } from '@/hooks/useWebGL';
import { useAnimation } from '@/hooks/useAnimation';
import type { SimulationParams, MouseState } from '@/types/simulation';

interface WebGLCanvasProps {
    params: SimulationParams;
    mouse: MouseState;
    onMouseMove: (e: React.MouseEvent) => void;
    onWheel: (e: React.WheelEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
}

export const WebGLCanvas = ({ params, mouse, onMouseMove, onWheel, onTouchMove }: WebGLCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Initialize WebGL context and program
    const { glRef, programRef } = useWebGL(canvasRef);

    // Start animation loop
    useAnimation(glRef, programRef, params, mouse);

    // Handle canvas resize
    const handleResize = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
        }
    };

    useEffect(() => {
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full z-0 cursor-move"
            onMouseMove={onMouseMove}
            onWheel={onWheel}
            onTouchMove={onTouchMove}
        />
    );
};
