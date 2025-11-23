import { useState } from 'react';
import type { MouseState, SimulationParams } from '@/types/simulation';

/**
 * Custom hook for camera control interactions
 * 
 * Handles:
 * - Mouse movement for camera orbit
 * - Mouse wheel for zoom control
 * - Touch movement for mobile camera control
 * 
 * @param params - Simulation parameters (for zoom state)
 * @param setParams - Function to update simulation parameters
 * @returns Mouse state and event handlers
 */
export function useCamera(
    params: SimulationParams,
    setParams: React.Dispatch<React.SetStateAction<SimulationParams>>
) {
    const [mouse, setMouse] = useState<MouseState>({ x: 0.5, y: 0.28 });

    const handleMouseMove = (e: React.MouseEvent) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        setMouse({ x, y });
    };

    const handleWheel = (e: React.WheelEvent) => {
        const sensitivity = 0.005;
        setParams(prev => {
            const newZoom = prev.zoom + e.deltaY * sensitivity;
            return { ...prev, zoom: Math.max(2.5, Math.min(50.0, newZoom)) };
        });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length > 0) {
            const x = e.touches[0].clientX / window.innerWidth;
            const y = e.touches[0].clientY / window.innerHeight;
            setMouse({ x, y });
        }
    };

    return {
        mouse,
        handleMouseMove,
        handleWheel,
        handleTouchMove,
    };
}
