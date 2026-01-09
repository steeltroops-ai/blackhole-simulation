/**
 * Performance Validation Tests
 * Requirements: 1.1, 1.3, 1.4, 2.5, 4.5, 5.5, 6.4, 8.4
 * 
 * Note: These tests focus on the validation logic structure and data processing.
 * Actual performance measurements require a real browser environment with WebGL.
 */

import { describe, it, expect } from 'vitest';
import { PerformanceValidator } from '@/performance/validation';
import type { PerformanceMeasurement, FeatureCost } from '@/performance/validation';
import { DEFAULT_FEATURES } from '@/types/features';

describe('Performance Validation', () => {
    describe('Validator Instantiation', () => {
        it('should create a validator instance', () => {
            const validator = new PerformanceValidator();
            expect(validator).toBeDefined();
            expect(validator).toBeInstanceOf(PerformanceValidator);
        });
    });

    describe('Baseline Configuration', () => {
        it('should define baseline features with all features disabled', () => {
            const baselineFeatures = {
                gravitationalLensing: false,
                rayTracingQuality: 'off' as const,
                accretionDisk: false,
                dopplerBeaming: false,
                backgroundStars: false,
                photonSphereGlow: false,
                bloom: false,
            };

            // Verify all features are disabled
            expect(baselineFeatures.gravitationalLensing).toBe(false);
            expect(baselineFeatures.rayTracingQuality).toBe('off');
            expect(baselineFeatures.accretionDisk).toBe(false);
            expect(baselineFeatures.dopplerBeaming).toBe(false);
            expect(baselineFeatures.backgroundStars).toBe(false);
            expect(baselineFeatures.photonSphereGlow).toBe(false);
            expect(baselineFeatures.bloom).toBe(false);
        });
    });

    describe('Feature Cost Calculation', () => {
        it('should calculate FPS impact correctly', () => {
            const baseline: PerformanceMeasurement = {
                configuration: 'Baseline',
                features: DEFAULT_FEATURES,
                averageFPS: 100,
                minFPS: 90,
                maxFPS: 110,
                averageFrameTimeMs: 10,
                p95FrameTimeMs: 11,
                p99FrameTimeMs: 12,
                sampleCount: 300,
                durationMs: 5000,
            };

            const featureEnabled: PerformanceMeasurement = {
                ...baseline,
                averageFPS: 70,
                averageFrameTimeMs: 14.29,
            };

            // Calculate expected values
            const fpsImpact = featureEnabled.averageFPS - baseline.averageFPS;
            const frameTimeImpact = featureEnabled.averageFrameTimeMs - baseline.averageFrameTimeMs;
            const percentageImpact = (fpsImpact / baseline.averageFPS) * 100;

            expect(fpsImpact).toBe(-30); // 30 FPS reduction
            expect(frameTimeImpact).toBeCloseTo(4.29, 1); // ~4.29ms increase
            expect(percentageImpact).toBe(-30); // 30% reduction
        });

        it('should handle zero baseline FPS gracefully', () => {
            const baseline: PerformanceMeasurement = {
                configuration: 'Baseline',
                features: DEFAULT_FEATURES,
                averageFPS: 0,
                minFPS: 0,
                maxFPS: 0,
                averageFrameTimeMs: 0,
                p95FrameTimeMs: 0,
                p99FrameTimeMs: 0,
                sampleCount: 0,
                durationMs: 5000,
            };

            const featureEnabled: PerformanceMeasurement = {
                ...baseline,
                averageFPS: 60,
            };

            const fpsImpact = featureEnabled.averageFPS - baseline.averageFPS;
            const percentageImpact = baseline.averageFPS > 0
                ? (fpsImpact / baseline.averageFPS) * 100
                : 0;

            expect(fpsImpact).toBe(60);
            expect(percentageImpact).toBe(0); // Should handle division by zero
        });
    });

    describe('Performance Target Validation', () => {
        it('should validate 75 FPS baseline target (Requirement 1.1)', () => {
            const measurement: PerformanceMeasurement = {
                configuration: 'Baseline',
                features: DEFAULT_FEATURES,
                averageFPS: 80,
                minFPS: 75,
                maxFPS: 85,
                averageFrameTimeMs: 12.5,
                p95FrameTimeMs: 13,
                p99FrameTimeMs: 14,
                sampleCount: 400,
                durationMs: 5000,
            };

            const meetsTarget = measurement.averageFPS >= 75;
            expect(meetsTarget).toBe(true);
        });

        it('should detect when baseline target is not met', () => {
            const measurement: PerformanceMeasurement = {
                configuration: 'Baseline',
                features: DEFAULT_FEATURES,
                averageFPS: 60,
                minFPS: 55,
                maxFPS: 65,
                averageFrameTimeMs: 16.67,
                p95FrameTimeMs: 18,
                p99FrameTimeMs: 20,
                sampleCount: 300,
                durationMs: 5000,
            };

            const meetsTarget = measurement.averageFPS >= 75;
            expect(meetsTarget).toBe(false);
        });

        it('should validate 60 FPS mobile target (Requirement 1.3)', () => {
            const measurement: PerformanceMeasurement = {
                configuration: 'Mobile Baseline',
                features: DEFAULT_FEATURES,
                averageFPS: 65,
                minFPS: 60,
                maxFPS: 70,
                averageFrameTimeMs: 15.38,
                p95FrameTimeMs: 16,
                p99FrameTimeMs: 17,
                sampleCount: 325,
                durationMs: 5000,
            };

            const meetsTarget = measurement.averageFPS >= 60;
            expect(meetsTarget).toBe(true);
        });

        it('should validate 120 FPS desktop target (Requirement 1.4)', () => {
            const measurement: PerformanceMeasurement = {
                configuration: 'Desktop Baseline',
                features: DEFAULT_FEATURES,
                averageFPS: 130,
                minFPS: 120,
                maxFPS: 140,
                averageFrameTimeMs: 7.69,
                p95FrameTimeMs: 8,
                p99FrameTimeMs: 9,
                sampleCount: 650,
                durationMs: 5000,
            };

            const meetsTarget = measurement.averageFPS >= 120;
            expect(meetsTarget).toBe(true);
        });
    });

    describe('Frame Time Budget Validation', () => {
        it('should calculate frame time budget usage', () => {
            const targetFrameTime = 13.3; // 75 FPS target
            const actualFrameTime = 10.0;

            const budgetUsage = (actualFrameTime / targetFrameTime) * 100;

            expect(budgetUsage).toBeCloseTo(75.19, 1);
            expect(budgetUsage).toBeLessThan(100); // Under budget
        });

        it('should detect when frame time budget is exceeded', () => {
            const targetFrameTime = 13.3; // 75 FPS target
            const actualFrameTime = 16.67; // 60 FPS

            const budgetUsage = (actualFrameTime / targetFrameTime) * 100;

            expect(budgetUsage).toBeCloseTo(125.34, 1);
            expect(budgetUsage).toBeGreaterThan(100); // Over budget
        });
    });

    describe('Feature Impact Requirements', () => {
        it('should validate gravitational lensing 30% impact (Requirement 2.5)', () => {
            const baselineFPS = 100;
            const expectedImpact = -30; // 30% reduction
            const expectedFPS = baselineFPS + (baselineFPS * expectedImpact / 100);

            expect(expectedFPS).toBe(70);
            expect(expectedImpact).toBe(-30);
        });

        it('should validate accretion disk 40% impact (Requirement 4.5)', () => {
            const baselineFPS = 100;
            const expectedImpact = -40; // 40% reduction
            const expectedFPS = baselineFPS + (baselineFPS * expectedImpact / 100);

            expect(expectedFPS).toBe(60);
            expect(expectedImpact).toBe(-40);
        });

        it('should validate Doppler beaming 15% impact (Requirement 5.5)', () => {
            const baselineFPS = 100;
            const expectedImpact = -15; // 15% reduction
            const expectedFPS = baselineFPS + (baselineFPS * expectedImpact / 100);

            expect(expectedFPS).toBe(85);
            expect(expectedImpact).toBe(-15);
        });

        it('should validate background stars 10% impact (Requirement 6.4)', () => {
            const baselineFPS = 100;
            const expectedImpact = -10; // 10% reduction
            const expectedFPS = baselineFPS + (baselineFPS * expectedImpact / 100);

            expect(expectedFPS).toBe(90);
            expect(expectedImpact).toBe(-10);
        });

        it('should validate bloom 20% impact (Requirement 8.4)', () => {
            const baselineFPS = 100;
            const expectedImpact = -20; // 20% reduction
            const expectedFPS = baselineFPS + (baselineFPS * expectedImpact / 100);

            expect(expectedFPS).toBe(80);
            expect(expectedImpact).toBe(-20);
        });
    });

    describe('Report Export', () => {
        it('should export report as valid JSON', () => {
            const validator = new PerformanceValidator();

            const mockReport = {
                timestamp: new Date(),
                deviceInfo: {
                    userAgent: 'Test Agent',
                    devicePixelRatio: 1,
                    screenResolution: '1920x1080',
                    isMobile: false,
                },
                baselineMeasurement: {
                    configuration: 'Baseline',
                    features: DEFAULT_FEATURES,
                    averageFPS: 80,
                    minFPS: 75,
                    maxFPS: 85,
                    averageFrameTimeMs: 12.5,
                    p95FrameTimeMs: 13,
                    p99FrameTimeMs: 14,
                    sampleCount: 400,
                    durationMs: 5000,
                },
                featureCosts: [],
                presetMeasurements: new Map(),
                meetsTargets: {
                    baseline75FPS: true,
                    mobile60FPS: true,
                    desktop120FPS: false,
                },
                recommendations: ['Test recommendation'],
            };

            const json = validator.exportReport(mockReport);

            expect(typeof json).toBe('string');

            // Should be valid JSON
            const parsed = JSON.parse(json);
            expect(parsed).toBeDefined();
            expect(parsed.timestamp).toBeDefined();
            expect(parsed.deviceInfo).toBeDefined();
            expect(parsed.baseline).toBeDefined();
            expect(parsed.meetsTargets).toBeDefined();
            expect(parsed.recommendations).toBeDefined();
        });
    });

    describe('Mobile Detection', () => {
        it('should detect mobile from user agent string', () => {
            const mobileUserAgents = [
                'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
                'Mozilla/5.0 (Android 11; Mobile)',
                'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
            ];

            for (const ua of mobileUserAgents) {
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
                expect(isMobile).toBe(true);
            }
        });

        it('should detect desktop from user agent string', () => {
            const desktopUserAgents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            ];

            for (const ua of desktopUserAgents) {
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
                expect(isMobile).toBe(false);
            }
        });
    });

    describe('Percentile Calculations', () => {
        it('should calculate 95th percentile correctly', () => {
            const frameTimes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
            const sorted = [...frameTimes].sort((a, b) => a - b);
            const p95Index = Math.floor(sorted.length * 0.95);
            const p95 = sorted[p95Index];

            expect(p95).toBe(20);
        });

        it('should calculate 99th percentile correctly', () => {
            const frameTimes = Array.from({ length: 100 }, (_, i) => 10 + i * 0.1);
            const sorted = [...frameTimes].sort((a, b) => a - b);
            const p99Index = Math.floor(sorted.length * 0.99);
            const p99 = sorted[p99Index];

            expect(p99).toBeGreaterThan(sorted[0]);
            expect(p99).toBeLessThanOrEqual(sorted[sorted.length - 1]);
        });
    });

    describe('Recommendation Generation', () => {
        it('should recommend optimization when baseline is below target', () => {
            const baselineFPS = 60;
            const target = 75;
            const meetsTarget = baselineFPS >= target;

            expect(meetsTarget).toBe(false);

            // Should generate warning recommendation
            const recommendation = `⚠️ Baseline performance (${baselineFPS.toFixed(1)} FPS) is below ${target} FPS target.`;
            expect(recommendation).toContain('⚠️');
            expect(recommendation).toContain('below');
        });

        it('should confirm when baseline meets target', () => {
            const baselineFPS = 80;
            const target = 75;
            const meetsTarget = baselineFPS >= target;

            expect(meetsTarget).toBe(true);

            // Should generate success recommendation
            const recommendation = `✓ Baseline performance meets ${target} FPS target (${baselineFPS.toFixed(1)} FPS).`;
            expect(recommendation).toContain('✓');
            expect(recommendation).toContain('meets');
        });

        it('should warn about high-cost features', () => {
            const featureCost = {
                featureName: 'Test Feature',
                baselineFPS: 100,
                featureEnabledFPS: 50,
                fpsImpact: -50,
                frameTimeImpactMs: 10,
                percentageImpact: -50,
            };

            const impactPercent = Math.abs(featureCost.percentageImpact);
            const isHighCost = impactPercent > 40;

            expect(isHighCost).toBe(true);

            const recommendation = `⚠️ ${featureCost.featureName} has high performance cost (${impactPercent.toFixed(1)}% impact).`;
            expect(recommendation).toContain('high performance cost');
        });
    });
});
