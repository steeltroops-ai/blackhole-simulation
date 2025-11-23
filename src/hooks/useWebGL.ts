import { useEffect, useRef, useState } from 'react';
import { vertexShaderSource } from '@/shaders/blackhole/vertex.glsl';
import { fragmentShaderSource } from '@/shaders/blackhole/fragment.glsl';
import type { WebGLProgramInfo } from '@/types/webgl';

/**
 * WebGL error information
 */
export interface WebGLError {
    type: 'context' | 'shader' | 'program' | 'memory';
    message: string;
    details?: string;
}

/**
 * Custom hook for WebGL context initialization and management
 * 
 * Handles:
 * - WebGL context creation with error handling
 * - Shader compilation and program linking with detailed error logging
 * - Buffer creation and attribute setup
 * - GPU memory error handling with resolution reduction
 * - Cleanup on unmount
 * 
 * Requirements: 12.1, 12.2, 12.3
 * 
 * @param canvasRef - Reference to the canvas element
 * @returns WebGL context, program, error state, and retry function
 */
export function useWebGL(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
    const glRef = useRef<WebGLRenderingContext | null>(null);
    const programRef = useRef<WebGLProgram | null>(null);
    const [error, setError] = useState<WebGLError | null>(null);
    const [resolutionScale, setResolutionScale] = useState(1.0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            console.error("Canvas not available");
            return;
        }

        // Check WebGL support before attempting context creation
        // Requirement 12.1: Check WebGL support before context creation
        const isWebGLSupported = (() => {
            try {
                const testCanvas = document.createElement('canvas');
                return !!(
                    testCanvas.getContext('webgl') ||
                    testCanvas.getContext('webgl2') ||
                    testCanvas.getContext('experimental-webgl')
                );
            } catch (e) {
                return false;
            }
        })();

        if (!isWebGLSupported) {
            // Requirement 12.1: Display user-friendly error message for missing WebGL
            const errorMsg = 'WebGL is required but not supported by your browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.';
            setError({
                type: 'context',
                message: errorMsg,
                details: 'Your browser or device does not support WebGL, which is required for GPU-accelerated graphics.'
            });
            console.error(errorMsg);
            return;
        }

        // Try to create WebGL context with error handling
        let gl: WebGLRenderingContext | null = null;
        try {
            gl = canvas.getContext('webgl', {
                alpha: false,
                antialias: true,
                depth: false,
                stencil: false,
                preserveDrawingBuffer: false,
                failIfMajorPerformanceCaveat: false
            });

            if (!gl) {
                gl = canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
            }
        } catch (e) {
            const errorMsg = 'Failed to create WebGL context';
            setError({
                type: 'context',
                message: errorMsg,
                details: e instanceof Error ? e.message : String(e)
            });
            console.error(errorMsg, e);
            return;
        }

        glRef.current = gl;

        if (!gl) {
            const errorMsg = 'WebGL context could not be initialized';
            setError({
                type: 'context',
                message: errorMsg,
                details: 'The browser supports WebGL but failed to create a rendering context.'
            });
            console.error(errorMsg);
            return;
        }

        // Requirement 12.2: Catch and log shader compilation errors with details
        const createShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
            const shader = gl.createShader(type);
            if (!shader) {
                const shaderType = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
                console.error(`Failed to create ${shaderType} shader object`);
                return null;
            }

            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            // Check compilation status
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                const shaderType = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
                const errorLog = gl.getShaderInfoLog(shader);
                const errorMsg = `${shaderType.charAt(0).toUpperCase() + shaderType.slice(1)} shader compilation failed`;

                setError({
                    type: 'shader',
                    message: errorMsg,
                    details: errorLog || 'Unknown shader compilation error'
                });

                console.error(errorMsg);
                console.error('Shader compilation error log:', errorLog);
                console.error('Shader source:', source);

                gl.deleteShader(shader);
                return null;
            }

            return shader;
        };

        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) {
            // Error already set in createShader
            return;
        }

        // Requirement 12.2: Handle program linking failures gracefully
        const program = gl.createProgram();
        if (!program) {
            const errorMsg = 'Failed to create WebGL program';
            setError({
                type: 'program',
                message: errorMsg,
                details: 'Could not create program object'
            });
            console.error(errorMsg);
            return;
        }
        programRef.current = program;

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        // Check program linking status
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const errorLog = gl.getProgramInfoLog(program);
            const errorMsg = 'WebGL program linking failed';

            setError({
                type: 'program',
                message: errorMsg,
                details: errorLog || 'Unknown program linking error'
            });

            console.error(errorMsg);
            console.error('Program linking error log:', errorLog);

            gl.deleteProgram(program);
            programRef.current = null;
            return;
        }

        // Requirement 12.3: Catch GPU memory errors and reduce resolution
        try {
            const buffer = gl.createBuffer();
            if (!buffer) {
                throw new Error('Failed to create buffer');
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0
            ]), gl.STATIC_DRAW);

            // Check for GPU memory errors
            const glError = gl.getError();
            if (glError !== gl.NO_ERROR) {
                throw new Error(`WebGL error: ${glError}`);
            }

            const positionLocation = gl.getAttribLocation(program, 'position');
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

            // Clear any error state on success
            setError(null);
        } catch (e) {
            // Requirement 12.3: Reduce resolution and retry on GPU memory error
            const errorMsg = 'GPU memory error detected';
            console.error(errorMsg, e);

            if (resolutionScale > 0.5) {
                const newScale = resolutionScale * 0.5;
                setResolutionScale(newScale);

                setError({
                    type: 'memory',
                    message: 'Insufficient GPU memory',
                    details: `Reducing resolution to ${Math.round(newScale * 100)}% and retrying...`
                });

                console.warn(`Reducing resolution to ${Math.round(newScale * 100)}% due to GPU memory constraints`);

                // Adjust canvas resolution
                if (canvas) {
                    const dpr = Math.min(window.devicePixelRatio || 1, 2.0) * newScale;
                    canvas.width = window.innerWidth * dpr;
                    canvas.height = window.innerHeight * dpr;
                }
            } else {
                setError({
                    type: 'memory',
                    message: 'Insufficient GPU memory',
                    details: 'Unable to initialize WebGL with reduced resolution. Your device may not have enough GPU memory.'
                });
            }
        }

        return () => {
            if (gl && program) {
                gl.deleteProgram(program);
            }
        };
    }, [canvasRef, resolutionScale]);

    return { glRef, programRef, error, resolutionScale };
}
