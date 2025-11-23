/**
 * WebGL type definitions for shader programs and uniforms
 */

/**
 * Uniform locations for all shader uniforms used in the black hole simulation
 */
export interface UniformLocations {
    /** Screen resolution (width, height) */
    resolution: WebGLUniformLocation | null;

    /** Simulation time in seconds */
    time: WebGLUniformLocation | null;

    /** Black hole mass in solar masses */
    mass: WebGLUniformLocation | null;

    /** Accretion disk density */
    diskDensity: WebGLUniformLocation | null;

    /** Accretion disk temperature */
    diskTemp: WebGLUniformLocation | null;

    /** Mouse/camera position (x, y) */
    mouse: WebGLUniformLocation | null;

    /** Accretion disk spin rate */
    spin: WebGLUniformLocation | null;

    /** Gravitational lensing strength */
    lensing: WebGLUniformLocation | null;

    /** Camera zoom distance */
    zoom: WebGLUniformLocation | null;
}

/**
 * WebGL program information including the program and its uniform locations
 */
export interface WebGLProgramInfo {
    /** Compiled and linked WebGL program */
    program: WebGLProgram;

    /** Uniform locations for shader parameters */
    uniformLocations: UniformLocations;
}
