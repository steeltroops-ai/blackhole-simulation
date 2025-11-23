/**
 * WebGL Utility Functions
 * 
 * This module provides utility functions for WebGL shader compilation,
 * program linking, and buffer setup. These functions are extracted from
 * the main application to improve code organization and reusability.
 */

/**
 * Creates and compiles a WebGL shader from source code.
 * 
 * @param gl - The WebGL rendering context
 * @param type - The type of shader (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
 * @param source - The GLSL shader source code as a string
 * @returns The compiled WebGLShader, or null if compilation failed
 * 
 * @example
 * const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
 * if (!vertexShader) {
 *   console.error('Failed to compile vertex shader');
 * }
 */
export function createShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string
): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

/**
 * Creates and links a WebGL program from vertex and fragment shaders.
 * 
 * @param gl - The WebGL rendering context
 * @param vertexShader - The compiled vertex shader
 * @param fragmentShader - The compiled fragment shader
 * @returns The linked WebGLProgram, or null if linking failed
 * 
 * @example
 * const program = createProgram(gl, vertexShader, fragmentShader);
 * if (!program) {
 *   console.error('Failed to create WebGL program');
 * }
 */
export function createProgram(
    gl: WebGLRenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
): WebGLProgram | null {
    const program = gl.createProgram();
    if (!program) {
        console.error('Failed to create program');
        return null;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    return program;
}

/**
 * Creates a buffer with vertex data for a full-screen quad.
 * This is commonly used for fragment shader-based rendering where
 * all computation happens in the fragment shader.
 * 
 * @param gl - The WebGL rendering context
 * @returns The WebGLBuffer containing the quad vertices, or null if creation failed
 * 
 * @example
 * const buffer = createQuadBuffer(gl);
 * if (buffer) {
 *   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
 * }
 */
export function createQuadBuffer(gl: WebGLRenderingContext): WebGLBuffer | null {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
            -1.0, -1.0,
            1.0, -1.0,
            -1.0, 1.0,
            -1.0, 1.0,
            1.0, -1.0,
            1.0, 1.0
        ]),
        gl.STATIC_DRAW
    );
    return buffer;
}

/**
 * Sets up vertex attribute pointer for a position attribute.
 * This configures how WebGL should read vertex data from the buffer.
 * 
 * @param gl - The WebGL rendering context
 * @param program - The WebGL program containing the attribute
 * @param attributeName - The name of the attribute in the shader (e.g., 'position')
 * 
 * @example
 * setupPositionAttribute(gl, program, 'position');
 */
export function setupPositionAttribute(
    gl: WebGLRenderingContext,
    program: WebGLProgram,
    attributeName: string
): void {
    const positionLocation = gl.getAttribLocation(program, attributeName);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
}
