/**
 * Property-based tests for device detection utilities
 * 
 * Tests mobile device detection, GPU detection, and mobile optimizations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
    isMobileDevice,
    hasIntegratedGPU,
    getHardwareInfo,
    getMobileRayStepCap,
} from '@/utils/device-detection';

describe('Device Detection', () => {
    beforeEach(() => {
        // Reset any mocks
        vi.restoreAllMocks();
    });

    describe('isMobileDevice', () => {
        it('detects mobile user agents', () => {
            const mobileUserAgents = [
                'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
                'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
                'Mozilla/5.0 (Linux; Android 10)',
                'Mozilla/5.0 (Linux; Android 11; SM-G991B)',
                'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900)',
                'Opera/9.80 (J2ME/MIDP; Opera Mini/9.80)',
            ];

            mobileUserAgents.forEach((ua) => {
                Object.defineProperty(navigator, 'userAgent', {
                    value: ua,
                    configurable: true,
                    writable: true,
                });
                expect(isMobileDevice()).toBe(true);
            });
        });

        it('detects desktop user agents', () => {
            const desktopUserAgents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                'Mozilla/5.0 (X11; Linux x86_64)',
            ];

            // Mock window.innerWidth to be > 768
            Object.defineProperty(global, 'window', {
                value: { innerWidth: 1920 },
                configurable: true,
                writable: true,
            });

            desktopUserAgents.forEach((ua) => {
                Object.defineProperty(navigator, 'userAgent', {
                    value: ua,
                    configurable: true,
                    writable: true,
                });
                expect(isMobileDevice()).toBe(false);
            });
        });

        it('detects mobile based on screen width', () => {
            // Desktop user agent but mobile width
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                configurable: true,
                writable: true,
            });

            Object.defineProperty(global, 'window', {
                value: { innerWidth: 375 },
                configurable: true,
                writable: true,
            });

            expect(isMobileDevice()).toBe(true);
        });
    });

    describe('hasIntegratedGPU', () => {
        it('returns false when no context provided', () => {
            expect(hasIntegratedGPU(null)).toBe(false);
            expect(hasIntegratedGPU(undefined)).toBe(false);
        });

        it('detects integrated GPUs', () => {
            const integratedGPUNames = [
                'Intel(R) HD Graphics 620',
                'AMD Radeon(TM) Vega 8 Integrated Graphics',
                'Mali-G76',
                'Adreno (TM) 640',
                'PowerVR SGX 543',
            ];

            integratedGPUNames.forEach((gpuName) => {
                const UNMASKED_RENDERER_WEBGL = 37446;
                const debugExtension = {
                    UNMASKED_RENDERER_WEBGL,
                };

                const mockGL = {
                    getExtension: vi.fn((name: string) => {
                        if (name === 'WEBGL_debug_renderer_info') {
                            return debugExtension;
                        }
                        return null;
                    }),
                    getParameter: vi.fn((param: number) => {
                        if (param === UNMASKED_RENDERER_WEBGL) {
                            return gpuName;
                        }
                        return null;
                    }),
                } as unknown as WebGL2RenderingContext;

                const result = hasIntegratedGPU(mockGL);
                expect(result).toBe(true);
            });
        });

        it('detects dedicated GPUs', () => {
            const dedicatedGPUNames = [
                'NVIDIA GeForce RTX 3080',
                'AMD Radeon RX 6800 XT',
                'NVIDIA GeForce GTX 1660',
            ];

            dedicatedGPUNames.forEach((gpuName) => {
                const UNMASKED_RENDERER_WEBGL = 37446;
                const debugExtension = {
                    UNMASKED_RENDERER_WEBGL,
                };

                const mockGL = {
                    getExtension: vi.fn((name: string) => {
                        if (name === 'WEBGL_debug_renderer_info') {
                            return debugExtension;
                        }
                        return null;
                    }),
                    getParameter: vi.fn((param: number) => {
                        if (param === UNMASKED_RENDERER_WEBGL) {
                            return gpuName;
                        }
                        return null;
                    }),
                } as unknown as WebGL2RenderingContext;

                const result = hasIntegratedGPU(mockGL);
                expect(result).toBe(false);
            });
        });

        it('handles missing debug extension gracefully', () => {
            const mockGL = {
                getExtension: vi.fn().mockReturnValue(null),
                getParameter: vi.fn(),
            } as unknown as WebGL2RenderingContext;

            expect(hasIntegratedGPU(mockGL)).toBe(false);
        });
    });

    describe('getHardwareInfo', () => {
        it('returns complete hardware information', () => {
            // Mock window with devicePixelRatio
            Object.defineProperty(global, 'window', {
                value: { innerWidth: 1920, devicePixelRatio: 2 },
                configurable: true,
                writable: true,
            });

            const mockGL = {
                getExtension: vi.fn().mockReturnValue(null),
                getParameter: vi.fn(),
            } as unknown as WebGL2RenderingContext;

            const info = getHardwareInfo(mockGL);

            expect(info).toHaveProperty('isMobile');
            expect(info).toHaveProperty('hasIntegratedGPU');
            expect(info).toHaveProperty('devicePixelRatio');
            expect(typeof info.isMobile).toBe('boolean');
            expect(typeof info.hasIntegratedGPU).toBe('boolean');
            expect(typeof info.devicePixelRatio).toBe('number');
            expect(info.devicePixelRatio).toBe(2);
        });
    });

    describe('getMobileRayStepCap', () => {
        /**
         * Feature: performance-optimization, Property 20: Mobile ray step cap
         * Validates: Requirements 16.3
         * 
         * For any mobile device, the maximum ray steps should be capped at 100
         * regardless of the selected quality level.
         */
        it('caps ray steps at 100 for mobile devices', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 1000 }),
                    (requestedSteps) => {
                        const cappedSteps = getMobileRayStepCap(requestedSteps, true);

                        // Mobile devices should never exceed 100 steps
                        expect(cappedSteps).toBeLessThanOrEqual(100);

                        // Should return the minimum of requested and 100
                        expect(cappedSteps).toBe(Math.min(requestedSteps, 100));
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Non-mobile devices should not be capped
         * 
         * For any non-mobile device, ray steps should not be capped
         */
        it('does not cap ray steps for non-mobile devices', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 1000 }),
                    (requestedSteps) => {
                        const cappedSteps = getMobileRayStepCap(requestedSteps, false);

                        // Non-mobile devices should get exactly what they request
                        expect(cappedSteps).toBe(requestedSteps);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
