import { useEffect, useRef } from 'react';
import type { SimulationParams, MouseState } from '@/types/simulation';

/**
 * Custom hook for managing the WebGL animation loop
 * 
 * Handles:
 * - Animation frame loop with requestAnimationFrame
 * - Uniform updates for shader parameters
 * - Time progression (pauses when params.paused is true)
 * - Cleanup on unmount
 * 
 * @param glRef - Reference to the WebGL rendering context
 * @param programRef - Reference to the WebGL program
 * @param params - Simulation parameters
 * @param mouse - Mouse/camera state
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

    useEffect(() => { paramsRef.current = params; }, [params]);
    useEffect(() => { mouseRef.current = mouse; }, [mouse]);

    useEffect(() => {
        const animate = () => {
            const gl = glRef.current;
            const program = programRef.current;
            const currentParams = paramsRef.current;
            const currentMouse = mouseRef.current;

            if (!currentParams.paused) {
                timeRef.current += 0.01;
            }

            if (gl && program) {
                gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
                gl.useProgram(program);

                const uResolution = gl.getUniformLocation(program, 'u_resolution');
                const uTime = gl.getUniformLocation(program, 'u_time');
                const uMass = gl.getUniformLocation(program, 'u_mass');
                const uDensity = gl.getUniformLocation(program, 'u_disk_density');
                const uTemp = gl.getUniformLocation(program, 'u_disk_temp');
                const uMouse = gl.getUniformLocation(program, 'u_mouse');
                const uSpin = gl.getUniformLocation(program, 'u_spin');
                const uLensing = gl.getUniformLocation(program, 'u_lensing_strength');
                const uZoom = gl.getUniformLocation(program, 'u_zoom');

                gl.uniform2f(uResolution, gl.canvas.width, gl.canvas.height);
                gl.uniform1f(uTime, timeRef.current);
                gl.uniform1f(uMass, currentParams.mass);
                gl.uniform1f(uDensity, currentParams.diskDensity);
                gl.uniform1f(uTemp, currentParams.diskTemp);
                gl.uniform2f(uMouse, currentMouse.x, currentMouse.y);
                gl.uniform1f(uSpin, currentParams.spin);
                gl.uniform1f(uLensing, currentParams.lensing);
                gl.uniform1f(uZoom, currentParams.zoom);

                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }
        };

        const loop = () => {
            animate();
            requestRef.current = requestAnimationFrame(loop);
        };
        requestRef.current = requestAnimationFrame(loop);

        return () => {
            if (requestRef.current !== null) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [glRef, programRef]);

    return { timeRef };
}
