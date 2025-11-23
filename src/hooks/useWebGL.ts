import { useEffect, useRef } from 'react';
import { vertexShaderSource } from '@/shaders/blackhole/vertex.glsl';
import { fragmentShaderSource } from '@/shaders/blackhole/fragment.glsl';
import type { WebGLProgramInfo } from '@/types/webgl';

/**
 * Custom hook for WebGL context initialization and management
 * 
 * Handles:
 * - WebGL context creation
 * - Shader compilation and program linking
 * - Buffer creation and attribute setup
 * - Cleanup on unmount
 * 
 * @param canvasRef - Reference to the canvas element
 * @returns WebGL context, program, and uniform locations
 */
export function useWebGL(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
    const glRef = useRef<WebGLRenderingContext | null>(null);
    const programRef = useRef<WebGLProgram | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            console.error("Canvas not available");
            return;
        }

        const gl = canvas.getContext('webgl');
        glRef.current = gl;

        if (!gl) {
            console.error("WebGL not supported");
            return;
        }

        const createShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
            const shader = gl.createShader(type);
            if (!shader) return null;
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        if (!vertexShader || !fragmentShader) {
            console.error("Failed to create shaders");
            return;
        }

        const program = gl.createProgram();
        if (!program) {
            console.error("Failed to create program");
            return;
        }
        programRef.current = program;

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0
        ]), gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        return () => {
            if (gl && program) gl.deleteProgram(program);
        };
    }, [canvasRef]);

    return { glRef, programRef };
}
