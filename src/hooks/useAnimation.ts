import { useEffect, useRef, useState } from 'react';
import type { SimulationParams, MouseState, PerformanceMetrics, QualityLevel } from '@/types/simulation';

/**
 * Get max ray steps based on quality level
 */
function getMaxRaySteps(quality: QualityLevel): number {
    switch (quality) {
        case 'low': return 100;
        case 'medium': return 300;
        case 'high': return 500;
    }
}

/**
 * Custom hook for managing the WebGL animation loop with performance optimization
 * 
 * Handles:
 * - Animation frame loop with requestAnimationFrame
 * - Uniform updates for shader parameters
 * - Time progression (pauses when params.paused is true)
 * - FPS monitoring using performance.now()
 * - Adaptive quality adjustment based on FPS thresholds
 * - Automatic quality reduction when FPS < 25
 * - Page visibility detection to pause when tab inactive
 * - Cleanup on unmount
 * 
 * Requirements: 7.1, 7.2, 7.6, 12.5, 12.6
 * 
 * @param glRef - Reference to the WebGL rendering context
 * @param programRef - Reference to the WebGL program
 * @param params - Simulation parameters
 * @param mouse - Mouse/camera state
 * @returns Performance metrics
 */
export function useAnimation(
    glRef: React.RefObject<WebGLRenderingContext | null>,
    programRef: React.RefObject<WebGLProgram | null>,
    params: SimulationParams,
    mouse: MouseState
) {
    const requestRef = useRef<number | null>(null);
    const timeRef = useRef(0);
    const paramsRef = useRef(params);
    const mouseRef = useRef(mouse);

    // Performance monitoring state
    const [metrics, setMetrics] = useState<PerformanceMetrics>({
        fps: 60,
        frameTime: 16.67,
        quality: params.quality || 'high',
        rayStepsUsed: getMaxRaySteps(params.quality || 'high'),
        pixelsRendered: 0,
    });

    // FPS calculation state
    const lastFrameTime = useRef(performance.now());
    const frameTimes = useRef<number[]>([]);
    const lowFPSCounter = useRef(0);

    // Page visibility state
    const isVisible = useRef(true);

    useEffect(() => { paramsRef.current = params; }, [params]);
    useEffect(() => { mouseRef.current = mouse; }, [mouse]);

    // Page visibility detection
    useEffect(() => {
        const handleVisibilityChange = () => {
            isVisible.current = !document.hidden;

            // Reset frame time tracking when becoming visible again
            if (isVisible.current) {
                lastFrameTime.current = performance.now();
                frameTimes.current = [];
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Adaptive quality adjustment
    const adjustQuality = (currentFPS: number, currentQuality: QualityLevel): QualityLevel => {
        // If FPS is consistently below 25, reduce quality
        if (currentFPS < 25) {
            lowFPSCounter.current++;

            // Wait for 3 seconds (approximately 75 frames at 25 FPS) before reducing quality
            if (lowFPSCounter.current > 75) {
                lowFPSCounter.current = 0;

                if (currentQuality === 'high') {
                    return 'medium';
                } else if (currentQuality === 'medium') {
                    return 'low';
                }
            }
        } else {
            // Reset counter if FPS is good
            lowFPSCounter.current = 0;
        }

        return currentQuality;
    };

    useEffect(() => {
        const animate = (currentTime: number) => {
            // Pause animation when tab is not visible
            if (!isVisible.current) {
                requestRef.current = requestAnimationFrame(animate);
                return;
            }

            const gl = glRef.current;
            const program = programRef.current;
            const currentParams = paramsRef.current;
            const currentMouse = mouseRef.current;

            // Calculate frame time and FPS
            const deltaTime = currentTime - lastFrameTime.current;
            lastFrameTime.current = currentTime;

            // Store frame times for rolling average (last 60 frames)
            frameTimes.current.push(deltaTime);
            if (frameTimes.current.length > 60) {
                frameTimes.current.shift();
            }

            // Calculate average FPS
            const avgFrameTime = frameTimes.current.reduce((a, b) => a + b, 0) / frameTimes.current.length;
            const currentFPS = 1000 / avgFrameTime;

            // Update time (only if not paused)
            if (!currentParams.paused) {
                timeRef.current += 0.01;
            }

            if (gl && program) {
                // Get current quality level
                const currentQuality = currentParams.quality || metrics.quality;

                // Adjust quality based on performance
                const newQuality = adjustQuality(currentFPS, currentQuality);
                const maxRaySteps = getMaxRaySteps(newQuality);

                // Calculate pixels rendered
                const pixelsRendered = gl.canvas.width * gl.canvas.height;

                // Update metrics
                setMetrics({
                    fps: Math.round(currentFPS),
                    frameTime: avgFrameTime,
                    quality: newQuality,
                    rayStepsUsed: maxRaySteps,
                    pixelsRendered,
                });

                // Render frame
                gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
                gl.useProgram(program);

                // Set uniforms
                const uResolution = gl.getUniformLocation(program, 'u_resolution');
                const uTime = gl.getUniformLocation(program, 'u_time');
                const uMass = gl.getUniformLocation(program, 'u_mass');
                const uDensity = gl.getUniformLocation(program, 'u_disk_density');
                const uTemp = gl.getUniformLocation(program, 'u_disk_temp');
                const uMouse = gl.getUniformLocation(program, 'u_mouse');
                const uSpin = gl.getUniformLocation(program, 'u_spin');
                const uLensing = gl.getUniformLocation(program, 'u_lensing_strength');
                const uZoom = gl.getUniformLocation(program, 'u_zoom');
                const uQuality = gl.getUniformLocation(program, 'u_quality');

                gl.uniform2f(uResolution, gl.canvas.width, gl.canvas.height);
                gl.uniform1f(uTime, timeRef.current);
                gl.uniform1f(uMass, currentParams.mass);
                gl.uniform1f(uDensity, currentParams.diskDensity);
                gl.uniform1f(uTemp, currentParams.diskTemp);
                gl.uniform2f(uMouse, currentMouse.x, currentMouse.y);
                gl.uniform1f(uSpin, currentParams.spin);
                gl.uniform1f(uLensing, currentParams.lensing);
                gl.uniform1f(uZoom, currentParams.zoom);

                // Pass quality as integer: 0=low, 1=medium, 2=high
                const qualityInt = newQuality === 'low' ? 0 : newQuality === 'medium' ? 1 : 2;
                gl.uniform1i(uQuality, qualityInt);

                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current !== null) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [glRef, programRef]);

    return { metrics, timeRef };
}
