/**
 * Property-Based Tests for Shader Manager
 * 
 * Tests shader variant caching and conditional compilation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { ShaderManager } from '@/shaders/manager';
import type { FeatureToggles, RayTracingQuality } from '@/types/features';

// Mock WebGL context for testing
function createMockWebGLContext(): WebGLRenderingContext {
    const shaders = new Map<WebGLShader, { type: number; source: string }>();
    const programs = new Map<WebGLProgram, { vertex: WebGLShader; fragment: WebGLShader }>();
    let shaderIdCounter = 1;
    let programIdCounter = 1;

    const gl = {
        VERTEX_SHADER: 35633,
        FRAGMENT_SHADER: 35632,
        COMPILE_STATUS: 35713,
        LINK_STATUS: 35714,

        createShader(type: number): WebGLShader {
            const shader = { id: shaderIdCounter++ } as WebGLShader;
            shaders.set(shader, { type, source: '' });
            return shader;
        },

        shaderSource(shader: WebGLShader, source: string): void {
            const shaderData = shaders.get(shader);
            if (shaderData) {
                shaderData.source = source;
            }
        },

        compileShader(shader: WebGLShader): void {
            // Mock compilation - always succeeds
        },

        getShaderParameter(shader: WebGLShader, pname: number): boolean {
            if (pname === gl.COMPILE_STATUS) {
                return true; // Always successful compilation
            }
            return false;
        },

        deleteShader(shader: WebGLShader): void {
            shaders.delete(shader);
        },

        createProgram(): WebGLProgram {
            const program = { id: programIdCounter++ } as WebGLProgram;
            programs.set(program, { vertex: null as any, fragment: null as any });
            return program;
        },

        attachShader(program: WebGLProgram, shader: WebGLShader): void {
            const programData = programs.get(program);
            const shaderData = shaders.get(shader);
            if (programData && shaderData) {
                if (shaderData.type === gl.VERTEX_SHADER) {
                    programData.vertex = shader;
                } else {
                    programData.fragment = shader;
                }
            }
        },

        linkProgram(program: WebGLProgram): void {
            // Mock linking - always succeeds
        },

        getProgramParameter(program: WebGLProgram, pname: number): boolean {
            if (pname === gl.LINK_STATUS) {
                return true; // Always successful linking
            }
            return false;
        },

        deleteProgram(program: WebGLProgram): void {
            programs.delete(program);
        },
    } as unknown as WebGLRenderingContext;

    return gl;
}

// Arbitrary for generating random FeatureToggles
const featureTogglesArbitrary = fc.record({
    gravitationalLensing: fc.boolean(),
    rayTracingQuality: fc.constantFrom<RayTracingQuality>('off', 'low', 'medium', 'high', 'ultra'),
    accretionDisk: fc.boolean(),
    dopplerBeaming: fc.boolean(),
    backgroundStars: fc.boolean(),
    photonSphereGlow: fc.boolean(),
    bloom: fc.boolean(),
});

describe('ShaderManager', () => {
    let gl: WebGLRenderingContext;
    let manager: ShaderManager;

    beforeEach(() => {
        gl = createMockWebGLContext();
        manager = new ShaderManager(gl);
    });

    afterEach(() => {
        manager.clearCache();
    });

    describe('Property 14: Shader variant caching', () => {
        /**
         * Feature: performance-optimization, Property 14: Shader variant caching
         * Validates: Requirements 13.5
         * 
         * For any feature toggle combination that has been compiled before,
         * requesting the same combination again should return the cached shader
         * variant without recompilation.
         */
        it('should return cached variant for previously compiled feature combinations', () => {
            fc.assert(
                fc.property(featureTogglesArbitrary, (features) => {
                    const vertexSource = 'precision highp float;\nvoid main() { gl_Position = vec4(0.0); }';
                    const fragmentSource = 'precision highp float;\nvoid main() { gl_FragColor = vec4(1.0); }';

                    // First compilation
                    const variant1 = manager.compileShaderVariant(vertexSource, fragmentSource, features);
                    expect(variant1).not.toBeNull();

                    // Second compilation with same features should return cached variant
                    const variant2 = manager.compileShaderVariant(vertexSource, fragmentSource, features);
                    expect(variant2).not.toBeNull();

                    // Should be the exact same object (cached)
                    expect(variant2).toBe(variant1);

                    // Verify it's actually cached
                    const cached = manager.getCachedVariant(features);
                    expect(cached).toBe(variant1);
                }),
                { numRuns: 100 }
            );
        });

        it('should create different variants for different feature combinations', () => {
            fc.assert(
                fc.property(
                    featureTogglesArbitrary,
                    featureTogglesArbitrary,
                    (features1, features2) => {
                        // Skip if features are identical
                        if (JSON.stringify(features1) === JSON.stringify(features2)) {
                            return true;
                        }

                        const vertexSource = 'precision highp float;\nvoid main() { gl_Position = vec4(0.0); }';
                        const fragmentSource = 'precision highp float;\nvoid main() { gl_FragColor = vec4(1.0); }';

                        const variant1 = manager.compileShaderVariant(vertexSource, fragmentSource, features1);
                        const variant2 = manager.compileShaderVariant(vertexSource, fragmentSource, features2);

                        expect(variant1).not.toBeNull();
                        expect(variant2).not.toBeNull();

                        // Different feature combinations should produce different variants
                        expect(variant1).not.toBe(variant2);

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should maintain cache across multiple requests', () => {
            fc.assert(
                fc.property(
                    fc.array(featureTogglesArbitrary, { minLength: 1, maxLength: 10 }),
                    (featuresList) => {
                        const vertexSource = 'precision highp float;\nvoid main() { gl_Position = vec4(0.0); }';
                        const fragmentSource = 'precision highp float;\nvoid main() { gl_FragColor = vec4(1.0); }';

                        // Compile all variants
                        const variants = featuresList.map(features =>
                            manager.compileShaderVariant(vertexSource, fragmentSource, features)
                        );

                        // Request them again - should all be cached
                        const cachedVariants = featuresList.map(features =>
                            manager.compileShaderVariant(vertexSource, fragmentSource, features)
                        );

                        // Each cached variant should be the same object as the original
                        for (let i = 0; i < variants.length; i++) {
                            expect(cachedVariants[i]).toBe(variants[i]);
                        }

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Shader source generation', () => {
        it('should generate shader source with correct preprocessor directives', () => {
            fc.assert(
                fc.property(featureTogglesArbitrary, (features) => {
                    const baseSource = 'precision highp float;\nvoid main() { gl_FragColor = vec4(1.0); }';
                    const generated = manager.generateShaderSource(baseSource, features);

                    // Check that defines are present
                    if (features.gravitationalLensing) {
                        expect(generated).toContain('#define ENABLE_LENSING 1');
                    } else {
                        expect(generated).toContain('#define ENABLE_LENSING 0');
                    }

                    if (features.accretionDisk) {
                        expect(generated).toContain('#define ENABLE_DISK 1');
                    } else {
                        expect(generated).toContain('#define ENABLE_DISK 0');
                    }

                    if (features.dopplerBeaming) {
                        expect(generated).toContain('#define ENABLE_DOPPLER 1');
                    } else {
                        expect(generated).toContain('#define ENABLE_DOPPLER 0');
                    }

                    if (features.backgroundStars) {
                        expect(generated).toContain('#define ENABLE_STARS 1');
                    } else {
                        expect(generated).toContain('#define ENABLE_STARS 0');
                    }

                    if (features.photonSphereGlow) {
                        expect(generated).toContain('#define ENABLE_PHOTON_GLOW 1');
                    } else {
                        expect(generated).toContain('#define ENABLE_PHOTON_GLOW 0');
                    }

                    if (features.bloom) {
                        expect(generated).toContain('#define ENABLE_BLOOM 1');
                    } else {
                        expect(generated).toContain('#define ENABLE_BLOOM 0');
                    }

                    // Check quality define
                    const qualityDefine = `#define RAY_QUALITY_${features.rayTracingQuality.toUpperCase()} 1`;
                    expect(generated).toContain(qualityDefine);

                    return true;
                }),
                { numRuns: 100 }
            );
        });
    });

    describe('Cache management', () => {
        it('should clear all cached variants', () => {
            const features: FeatureToggles = {
                gravitationalLensing: true,
                rayTracingQuality: 'medium',
                accretionDisk: true,
                dopplerBeaming: false,
                backgroundStars: true,
                photonSphereGlow: true,
                bloom: false,
            };

            const vertexSource = 'precision highp float;\nvoid main() { gl_Position = vec4(0.0); }';
            const fragmentSource = 'precision highp float;\nvoid main() { gl_FragColor = vec4(1.0); }';

            manager.compileShaderVariant(vertexSource, fragmentSource, features);
            expect(manager.getCacheSize()).toBe(1);

            manager.clearCache();
            expect(manager.getCacheSize()).toBe(0);

            // After clearing, should not find cached variant
            const cached = manager.getCachedVariant(features);
            expect(cached).toBeNull();
        });

        it('should track cache size correctly', () => {
            fc.assert(
                fc.property(
                    fc.array(featureTogglesArbitrary, { minLength: 1, maxLength: 5 }),
                    (featuresList) => {
                        manager.clearCache();

                        const vertexSource = 'precision highp float;\nvoid main() { gl_Position = vec4(0.0); }';
                        const fragmentSource = 'precision highp float;\nvoid main() { gl_FragColor = vec4(1.0); }';

                        // Compile unique variants
                        const uniqueFeatures = new Set<string>();
                        for (const features of featuresList) {
                            manager.compileShaderVariant(vertexSource, fragmentSource, features);
                            uniqueFeatures.add(JSON.stringify(features));
                        }

                        // Cache size should match number of unique feature combinations
                        expect(manager.getCacheSize()).toBe(uniqueFeatures.size);

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
