import { useEffect, useRef, useState } from 'react';
import type { SimulationParams, MouseState, QualityLevel } from '@/types/simulation';
import { getMaxRaySteps as getMaxRayStepsFromQuality, DEFAULT_FEATURES } from '@/types/features';
import type { RayTracingQuality } from '@/types/features';
import { PerformanceMonitor } from '@/performance/monitor';
import type { PerformanceMetrics } from '@/performance/monitor';
import { UniformBatcher, IdleDetector } from '@/utils/cpu-optimizations';
import type { BloomManager } from '@/rendering/bloom';

/**
 * Get max ray steps based on quality level (legacy support)
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
 * - Uniform updates for shader parameters (batched for performance)
 * - Time progression (pauses when params.paused is true)
 * - FPS monitoring using performance.now()
 * - Adaptive quality adjustment based on FPS thresholds
 * - Automatic quality reduction when FPS < 25
 * - Page visibility detection to pause when tab inactive
 * - Idle detection and frame rate reduction
 * - Bloom post-processing integration
 * - Cleanup on unmount
 * 
 * Requirements: 7.1, 7.2, 7.6, 8.1, 8.2, 8.3, 8.4, 12.5, 12.6, 14.1, 14.4, 14.5
 * 
 * @param glRef - Reference to the WebGL rendering context
 * @param programRef - Reference to the WebGL program
 * @param bloomManagerRef - Reference to the bloom manager
 * @param params - Simulation parameters
 * @param mouse - Mouse/camera state
 * @returns Performance metrics
 */
export function useAnimation(
    glRef: React.RefObject<WebGLRenderingContext | null>,
    programRef: React.RefObject<WebGLProgram | null>,
    bloomManagerRef: React.RefObject<BloomManager | null>,
    params: SimulationParams,
    mouse: MouseState
) {
    const requestRef = useRef<number | null>(null);
    const timeRef = useRef(0);
    const paramsRef = useRef(params);
    const mouseRef = useRef(mouse);

    // Performance monitoring with PerformanceMonitor class
    const performanceMonitor = useRef(new PerformanceMonitor());
    const [metrics, setMetrics] = useState<PerformanceMetrics>({
        currentFPS: 60,
        frameTimeMs: 16.67,
        rollingAverageFPS: 60,
        quality: params.quality || 'high',
        renderResolution: params.renderScale || 1.0,
    });

    // FPS calculation state
    const lastFrameTime = useRef(performance.now());
    const lowFPSCounter = useRef(0);

    // Page visibility state
    const isVisible = useRef(true);

    // CPU optimizations
    // Requirements: 14.1 - Batch uniform updates
    const uniformBatcher = useRef(new UniformBatcher());
    // Requirements: 14.5 - Idle detection for frame rate reduction
    const idleDetector = useRef(new IdleDetector(5000)); // 5 second threshold
    const targetFrameTime = useRef(16.67); // 60 FPS default

    useEffect(() => { paramsRef.current = params; }, [params]);
    useEffect(() => {
        mouseRef.current = mouse;
        // Record activity when mouse state changes
        // Requirements: 14.5 - Track user activity for idle detection
        idleDetector.current.recordActivity();
    }, [mouse]);

    // Page visibility detection
    useEffect(() => {
        const handleVisibilityChange = () => {
            isVisible.current = !document.hidden;

            // Reset frame time tracking when becoming visible again
            if (isVisible.current) {
                lastFrameTime.current = performance.now();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // User activity tracking for idle detection
    // Requirements: 14.5 - Record user activity
    useEffect(() => {
        const recordActivity = () => {
            idleDetector.current.recordActivity();
        };

        // Track various user interactions
        window.addEventListener('mousemove', recordActivity);
        window.addEventListener('mousedown', recordActivity);
        window.addEventListener('keydown', recordActivity);
        window.addEventListener('wheel', recordActivity);
        window.addEventListener('touchstart', recordActivity);
        window.addEventListener('touchmove', recordActivity);

        return () => {
            window.removeEventListener('mousemove', recordActivity);
            window.removeEventListener('mousedown', recordActivity);
            window.removeEventListener('keydown', recordActivity);
            window.removeEventListener('wheel', recordActivity);
            window.removeEventListener('touchstart', recordActivity);
            window.removeEventListener('touchmove', recordActivity);
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
        let lastIdleCheck = performance.now();

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

            // Calculate frame time and update performance monitor
            const frameStartTime = performance.now();
            const deltaTime = currentTime - lastFrameTime.current;
            lastFrameTime.current = currentTime;

            // Requirements: 14.5 - Check idle state and adjust frame rate
            const isIdle = idleDetector.current.isIdle();
            if (isIdle) {
                targetFrameTime.current = 33.33; // 30 FPS when idle
            } else {
                targetFrameTime.current = 16.67; // 60 FPS when active
            }

            // Skip frame if we're idle and haven't reached target frame time
            if (isIdle && deltaTime < targetFrameTime.current) {
                requestRef.current = requestAnimationFrame(animate);
                return;
            }

            // Update performance metrics using PerformanceMonitor
            const updatedMetrics = performanceMonitor.current.updateMetrics(deltaTime);
            const currentFPS = updatedMetrics.currentFPS;

            // Update time (only if not paused)
            if (!currentParams.paused) {
                timeRef.current += 0.01;
            }

            if (gl && program) {
                // Get feature toggles or use defaults
                const features = currentParams.features || DEFAULT_FEATURES;

                // Get current quality level (use feature toggles if available, otherwise legacy quality)
                const currentQuality = currentParams.quality || metrics.quality;

                // Adjust quality based on performance
                const newQuality = adjustQuality(currentFPS, currentQuality);

                // Get max ray steps from feature toggles
                // Requirements: 3.6 - Update u_maxRaySteps uniform when quality changes
                const maxRaySteps = getMaxRayStepsFromQuality(features.rayTracingQuality);

                // Update performance monitor quality and resolution
                performanceMonitor.current.setQuality(newQuality);
                performanceMonitor.current.setRenderResolution(currentParams.renderScale || 1.0);

                // Update metrics state
                setMetrics({
                    ...updatedMetrics,
                    quality: newQuality,
                });

                // === BLOOM POST-PROCESSING INTEGRATION ===
                // Requirements: 8.1, 8.2, 8.3, 8.4
                const bloomManager = bloomManagerRef.current;

                // Update bloom configuration
                if (bloomManager) {
                    bloomManager.updateConfig({
                        enabled: features.bloom,
                        intensity: 0.5,
                        threshold: 0.8,
                        blurPasses: 2,
                    });

                    // Resize bloom framebuffers if canvas size changed
                    bloomManager.resize(gl.canvas.width, gl.canvas.height);
                }

                // Begin scene rendering
                // Requirement 8.1: Skip bloom render pass when disabled
                // Requirement 8.2: Output fragment colors directly without post-processing when disabled
                const targetFramebuffer = bloomManager ? bloomManager.beginScene() : null;
                gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer);

                // Render frame
                gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
                gl.useProgram(program);

                // Requirements: 14.1 - Batch uniform updates into single WebGL call per frame
                // Queue all uniform updates
                const cpuStartTime = performance.now();

                uniformBatcher.current.set('u_resolution', [gl.canvas.width, gl.canvas.height]);
                uniformBatcher.current.set('u_time', timeRef.current);
                uniformBatcher.current.set('u_mass', currentParams.mass);
                uniformBatcher.current.set('u_disk_density', currentParams.diskDensity);
                uniformBatcher.current.set('u_disk_temp', currentParams.diskTemp);
                uniformBatcher.current.set('u_mouse', [currentMouse.x, currentMouse.y]);
                uniformBatcher.current.set('u_spin', currentParams.spin);
                uniformBatcher.current.set('u_lensing_strength', currentParams.lensing);
                uniformBatcher.current.set('u_zoom', currentParams.zoom);

                // Pass quality as integer: 0=low, 1=medium, 2=high
                const qualityInt = newQuality === 'low' ? 0 : newQuality === 'medium' ? 1 : 2;
                uniformBatcher.current.set('u_quality', qualityInt);

                // Set max ray steps uniform
                // Requirements: 3.6 - Update u_maxRaySteps uniform immediately when quality changes
                uniformBatcher.current.set('u_maxRaySteps', maxRaySteps);

                // Track uniform update count for debug metrics
                const uniformCount = uniformBatcher.current.size();
                performanceMonitor.current.recordUniformUpdates(uniformCount);

                // Flush all batched uniforms
                uniformBatcher.current.flush(gl, program);

                const cpuEndTime = performance.now();
                performanceMonitor.current.recordCPUTime(cpuEndTime - cpuStartTime);

                // Track draw calls for debug metrics
                performanceMonitor.current.recordDrawCalls(1);

                const gpuStartTime = performance.now();
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                // Note: Actual GPU time measurement requires WebGL extensions
                // This is an approximation based on synchronous execution
                const gpuEndTime = performance.now();
                performanceMonitor.current.recordGPUTime(gpuEndTime - gpuStartTime);

                // Apply bloom post-processing
                // Requirement 8.3: Apply multi-pass bloom with configurable intensity when enabled
                if (bloomManager) {
                    const bloomStartTime = performance.now();
                    bloomManager.applyBloom();
                    const bloomEndTime = performance.now();
                    performanceMonitor.current.recordBufferSwapTime(bloomEndTime - bloomStartTime);
                }

                // Calculate idle time (time not spent on CPU or GPU work)
                const frameEndTime = performance.now();
                const totalFrameTime = frameEndTime - frameStartTime;
                const workTime = (cpuEndTime - cpuStartTime) + (gpuEndTime - gpuStartTime);
                const idleTime = Math.max(0, totalFrameTime - workTime);
                performanceMonitor.current.recordIdleTime(idleTime);
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
