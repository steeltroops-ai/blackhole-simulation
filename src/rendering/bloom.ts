/**
 * Bloom Post-Processing Manager
 * 
 * Manages multi-pass bloom rendering:
 * 1. Render scene to framebuffer
 * 2. Extract bright pixels
 * 3. Apply Gaussian blur (horizontal + vertical)
 * 4. Combine with original scene
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import {
    bloomVertexShader,
    brightPassShader,
    blurShader,
    combineShader,
} from '@/shaders/postprocess/bloom.glsl';

/**
 * Bloom configuration
 */
export interface BloomConfig {
    enabled: boolean;
    intensity: number; // 0.0 to 1.0
    threshold: number; // Brightness threshold for bloom
    blurPasses: number; // Number of blur iterations
}

/**
 * Default bloom configuration
 */
export const DEFAULT_BLOOM_CONFIG: BloomConfig = {
    enabled: true,
    intensity: 0.5,
    threshold: 0.8,
    blurPasses: 2,
};

/**
 * Bloom Post-Processing Manager
 * 
 * Requirements:
 * - 8.1: Skip bloom render pass when disabled
 * - 8.2: Output fragment colors directly without post-processing when disabled
 * - 8.3: Apply multi-pass bloom with configurable intensity when enabled
 * - 8.4: Reduce frame time by at least 20% when disabled
 */
export class BloomManager {
    private gl: WebGLRenderingContext;
    private config: BloomConfig;

    // Framebuffers
    private sceneFramebuffer: WebGLFramebuffer | null = null;
    private brightFramebuffer: WebGLFramebuffer | null = null;
    private blurFramebuffer1: WebGLFramebuffer | null = null;
    private blurFramebuffer2: WebGLFramebuffer | null = null;

    // Textures
    private sceneTexture: WebGLTexture | null = null;
    private brightTexture: WebGLTexture | null = null;
    private blurTexture1: WebGLTexture | null = null;
    private blurTexture2: WebGLTexture | null = null;

    // Shader programs
    private brightPassProgram: WebGLProgram | null = null;
    private blurProgram: WebGLProgram | null = null;
    private combineProgram: WebGLProgram | null = null;

    // Vertex buffer for full-screen quad
    private quadBuffer: WebGLBuffer | null = null;

    // Canvas dimensions
    private width: number = 0;
    private height: number = 0;

    constructor(gl: WebGLRenderingContext, config: BloomConfig = DEFAULT_BLOOM_CONFIG) {
        this.gl = gl;
        this.config = { ...config };
    }

    /**
     * Initialize bloom resources
     * Requirements: 8.1, 8.3
     */
    initialize(width: number, height: number): boolean {
        this.width = width;
        this.height = height;

        try {
            // Create full-screen quad buffer
            this.quadBuffer = this.gl.createBuffer();
            if (!this.quadBuffer) {
                throw new Error('Failed to create quad buffer');
            }

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
            this.gl.bufferData(
                this.gl.ARRAY_BUFFER,
                new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
                this.gl.STATIC_DRAW
            );

            // Compile shader programs
            this.brightPassProgram = this.createProgram(bloomVertexShader, brightPassShader);
            this.blurProgram = this.createProgram(bloomVertexShader, blurShader);
            this.combineProgram = this.createProgram(bloomVertexShader, combineShader);

            if (!this.brightPassProgram || !this.blurProgram || !this.combineProgram) {
                throw new Error('Failed to compile bloom shaders');
            }

            // Create framebuffers and textures
            this.createFramebuffers();

            return true;
        } catch (error) {
            console.error('Failed to initialize bloom:', error);
            this.cleanup();
            return false;
        }
    }

    /**
     * Create framebuffers and textures for bloom passes
     */
    private createFramebuffers(): void {
        const gl = this.gl;

        // Scene framebuffer (full resolution)
        this.sceneTexture = this.createTexture(this.width, this.height);
        this.sceneFramebuffer = this.createFramebuffer(this.sceneTexture);

        // Bright pass framebuffer (half resolution for performance)
        const halfWidth = Math.floor(this.width / 2);
        const halfHeight = Math.floor(this.height / 2);

        this.brightTexture = this.createTexture(halfWidth, halfHeight);
        this.brightFramebuffer = this.createFramebuffer(this.brightTexture);

        // Blur framebuffers (half resolution)
        this.blurTexture1 = this.createTexture(halfWidth, halfHeight);
        this.blurFramebuffer1 = this.createFramebuffer(this.blurTexture1);

        this.blurTexture2 = this.createTexture(halfWidth, halfHeight);
        this.blurFramebuffer2 = this.createFramebuffer(this.blurTexture2);
    }

    /**
     * Create a texture
     */
    private createTexture(width: number, height: number): WebGLTexture | null {
        const gl = this.gl;
        const texture = gl.createTexture();

        if (!texture) return null;

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null
        );

        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        return texture;
    }

    /**
     * Create a framebuffer with attached texture
     */
    private createFramebuffer(texture: WebGLTexture): WebGLFramebuffer | null {
        const gl = this.gl;
        const framebuffer = gl.createFramebuffer();

        if (!framebuffer) return null;

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            texture,
            0
        );

        // Check framebuffer status
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Framebuffer incomplete:', status);
            return null;
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return framebuffer;
    }

    /**
     * Compile shader program
     */
    private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
        const gl = this.gl;

        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);

        if (!vertexShader || !fragmentShader) return null;

        const program = gl.createProgram();
        if (!program) return null;

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    /**
     * Compile shader
     */
    private compileShader(type: number, source: string): WebGLShader | null {
        const gl = this.gl;
        const shader = gl.createShader(type);

        if (!shader) return null;

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }

    /**
     * Begin scene rendering
     * Requirements: 8.1, 8.2
     * 
     * @returns Framebuffer to render to (null for direct rendering when bloom disabled)
     */
    beginScene(): WebGLFramebuffer | null {
        // Requirement 8.1: Skip bloom render pass when disabled
        // Requirement 8.2: Output fragment colors directly without post-processing
        if (!this.config.enabled) {
            return null; // Render directly to screen
        }

        // Render to scene framebuffer for post-processing
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.sceneFramebuffer);
        return this.sceneFramebuffer;
    }

    /**
     * Apply bloom post-processing
     * Requirements: 8.3
     */
    applyBloom(): void {
        // Requirement 8.1: Skip bloom when disabled
        if (!this.config.enabled) {
            return;
        }

        const gl = this.gl;

        // Save current viewport
        // Optimization: Avoid gl.getParameter(gl.VIEWPORT) which causes pipeline stall
        // We know the viewport matches our canvas dimensions
        const viewport = [0, 0, this.width, this.height];

        // Bind quad buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);

        // === PASS 1: Extract bright pixels ===
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.brightFramebuffer);
        gl.viewport(0, 0, Math.floor(this.width / 2), Math.floor(this.height / 2));

        gl.useProgram(this.brightPassProgram);

        const brightPosLoc = gl.getAttribLocation(this.brightPassProgram!, 'position');
        gl.enableVertexAttribArray(brightPosLoc);
        gl.vertexAttribPointer(brightPosLoc, 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.sceneTexture);
        gl.uniform1i(gl.getUniformLocation(this.brightPassProgram!, 'u_texture'), 0);
        gl.uniform1f(gl.getUniformLocation(this.brightPassProgram!, 'u_threshold'), this.config.threshold);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // === PASS 2: Blur passes ===
        const halfWidth = Math.floor(this.width / 2);
        const halfHeight = Math.floor(this.height / 2);

        gl.useProgram(this.blurProgram);

        const blurPosLoc = gl.getAttribLocation(this.blurProgram!, 'position');
        gl.enableVertexAttribArray(blurPosLoc);
        gl.vertexAttribPointer(blurPosLoc, 2, gl.FLOAT, false, 0, 0);

        const resolutionLoc = gl.getUniformLocation(this.blurProgram!, 'u_resolution');
        const directionLoc = gl.getUniformLocation(this.blurProgram!, 'u_direction');
        const textureLoc = gl.getUniformLocation(this.blurProgram!, 'u_texture');

        gl.uniform2f(resolutionLoc, halfWidth, halfHeight);

        let sourceTexture = this.brightTexture;
        let targetFramebuffer = this.blurFramebuffer1;
        let targetTexture = this.blurTexture1;

        for (let i = 0; i < this.config.blurPasses; i++) {
            // Horizontal blur
            gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
            gl.uniform1i(textureLoc, 0);
            gl.uniform2f(directionLoc, 1.0, 0.0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            // Vertical blur
            sourceTexture = targetTexture;
            targetFramebuffer = i % 2 === 0 ? this.blurFramebuffer2 : this.blurFramebuffer1;
            targetTexture = i % 2 === 0 ? this.blurTexture2 : this.blurTexture1;

            gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
            gl.uniform1i(textureLoc, 0);
            gl.uniform2f(directionLoc, 0.0, 1.0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            sourceTexture = targetTexture;
        }

        // === PASS 3: Combine with original scene ===
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(viewport[0], viewport[1], viewport[2], viewport[3]);

        gl.useProgram(this.combineProgram);

        const combinePosLoc = gl.getAttribLocation(this.combineProgram!, 'position');
        gl.enableVertexAttribArray(combinePosLoc);
        gl.vertexAttribPointer(combinePosLoc, 2, gl.FLOAT, false, 0, 0);

        // Bind scene texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.sceneTexture);
        gl.uniform1i(gl.getUniformLocation(this.combineProgram!, 'u_sceneTexture'), 0);

        // Bind bloom texture
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
        gl.uniform1i(gl.getUniformLocation(this.combineProgram!, 'u_bloomTexture'), 1);

        // Set bloom intensity
        gl.uniform1f(gl.getUniformLocation(this.combineProgram!, 'u_bloomIntensity'), this.config.intensity);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    /**
     * Update bloom configuration
     */
    updateConfig(config: Partial<BloomConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Resize framebuffers
     */
    resize(width: number, height: number): void {
        if (this.width === width && this.height === height) {
            return;
        }

        this.width = width;
        this.height = height;

        // Recreate framebuffers with new size
        this.cleanupFramebuffers();
        this.createFramebuffers();
    }

    /**
     * Cleanup framebuffers
     */
    private cleanupFramebuffers(): void {
        const gl = this.gl;

        if (this.sceneFramebuffer) gl.deleteFramebuffer(this.sceneFramebuffer);
        if (this.brightFramebuffer) gl.deleteFramebuffer(this.brightFramebuffer);
        if (this.blurFramebuffer1) gl.deleteFramebuffer(this.blurFramebuffer1);
        if (this.blurFramebuffer2) gl.deleteFramebuffer(this.blurFramebuffer2);

        if (this.sceneTexture) gl.deleteTexture(this.sceneTexture);
        if (this.brightTexture) gl.deleteTexture(this.brightTexture);
        if (this.blurTexture1) gl.deleteTexture(this.blurTexture1);
        if (this.blurTexture2) gl.deleteTexture(this.blurTexture2);

        this.sceneFramebuffer = null;
        this.brightFramebuffer = null;
        this.blurFramebuffer1 = null;
        this.blurFramebuffer2 = null;

        this.sceneTexture = null;
        this.brightTexture = null;
        this.blurTexture1 = null;
        this.blurTexture2 = null;
    }

    /**
     * Cleanup all resources
     */
    cleanup(): void {
        const gl = this.gl;

        this.cleanupFramebuffers();

        if (this.brightPassProgram) gl.deleteProgram(this.brightPassProgram);
        if (this.blurProgram) gl.deleteProgram(this.blurProgram);
        if (this.combineProgram) gl.deleteProgram(this.combineProgram);
        if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer);

        this.brightPassProgram = null;
        this.blurProgram = null;
        this.combineProgram = null;
        this.quadBuffer = null;
    }
}
