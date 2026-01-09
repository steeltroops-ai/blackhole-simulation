/**
 * Property-based tests for SettingsStorage
 * Feature: performance-optimization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { SettingsStorage } from '@/storage/settings';
import type { FeatureToggles, PresetName } from '@/types/features';
import { DEFAULT_FEATURES } from '@/types/features';

/**
 * Mock localStorage for testing
 */
class LocalStorageMock {
    private store: Map<string, string> = new Map();

    getItem(key: string): string | null {
        return this.store.get(key) || null;
    }

    setItem(key: string, value: string): void {
        this.store.set(key, value);
    }

    removeItem(key: string): void {
        this.store.delete(key);
    }

    clear(): void {
        this.store.clear();
    }
}

// Set up global localStorage mock
global.localStorage = new LocalStorageMock() as any;

/**
 * Arbitrary generator for RayTracingQuality
 */
const rayTracingQualityArbitrary = fc.constantFrom('off', 'low', 'medium', 'high', 'ultra');

/**
 * Arbitrary generator for valid FeatureToggles
 */
const featureTogglesArbitrary: fc.Arbitrary<FeatureToggles> = fc.record({
    gravitationalLensing: fc.boolean(),
    rayTracingQuality: rayTracingQualityArbitrary,
    accretionDisk: fc.boolean(),
    dopplerBeaming: fc.boolean(),
    backgroundStars: fc.boolean(),
    photonSphereGlow: fc.boolean(),
    bloom: fc.boolean(),
});

/**
 * Arbitrary generator for PresetName
 */
const presetNameArbitrary = fc.constantFrom(
    'maximum-performance',
    'balanced',
    'high-quality',
    'ultra-quality',
    'custom'
);

describe('SettingsStorage', () => {
    let storage: SettingsStorage;
    const testStorageKey = 'test-features';
    const testPresetKey = 'test-preset';

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        storage = new SettingsStorage(testStorageKey, testPresetKey);
    });

    afterEach(() => {
        // Clean up after each test
        localStorage.clear();
    });

    /**
     * Feature: performance-optimization, Property 22: Feature toggle persistence
     * Validates: Requirements 17.1
     * 
     * For any feature toggle change, the new state should be saved to localStorage immediately.
     */
    it('Property 22: Feature toggle persistence - saved features can be retrieved', () => {
        fc.assert(
            fc.property(featureTogglesArbitrary, (features) => {
                // Save features
                storage.saveFeatures(features);

                // Load features back
                const loaded = storage.loadFeatures();

                // Should match what was saved
                expect(loaded).toEqual(features);
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: performance-optimization, Property 23: Settings restoration
     * Validates: Requirements 17.2
     * 
     * For any page load, if valid settings exist in localStorage, they should be restored and applied.
     */
    it('Property 23: Settings restoration - valid settings are restored correctly', () => {
        fc.assert(
            fc.property(featureTogglesArbitrary, (features) => {
                // Save features with first storage instance
                storage.saveFeatures(features);

                // Create new storage instance (simulating page reload)
                const newStorage = new SettingsStorage(testStorageKey, testPresetKey);
                const restored = newStorage.loadFeatures();

                // Should restore the same features
                expect(restored).toEqual(features);
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: performance-optimization, Property 24: Preset persistence
     * Validates: Requirements 17.3
     * 
     * For any preset selection, the preset name should be saved to localStorage.
     */
    it('Property 24: Preset persistence - saved preset can be retrieved', () => {
        fc.assert(
            fc.property(presetNameArbitrary, (preset) => {
                // Save preset
                storage.savePreset(preset);

                // Load preset back
                const loaded = storage.loadPreset();

                // Should match what was saved
                expect(loaded).toBe(preset);
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: performance-optimization, Property 25: Settings fallback
     * Validates: Requirements 17.4
     * 
     * For any missing or invalid localStorage data, the system should fall back to default settings without errors.
     */
    it('Property 25: Settings fallback - returns null for missing data', () => {
        fc.assert(
            fc.property(fc.constant(null), () => {
                // Don't save anything, localStorage is empty
                const loaded = storage.loadFeatures();

                // Should return null (caller will use defaults)
                expect(loaded).toBeNull();
            }),
            { numRuns: 100 }
        );
    });

    it('Property 25: Settings fallback - returns null for corrupted data', () => {
        fc.assert(
            fc.property(fc.string(), (corruptedData) => {
                // Save corrupted data directly to localStorage
                try {
                    localStorage.setItem(testStorageKey, corruptedData);
                } catch {
                    // If we can't even save it, skip this test case
                    return true;
                }

                const loaded = storage.loadFeatures();

                // Should return null for invalid data
                expect(loaded).toBeNull();
            }),
            { numRuns: 100 }
        );
    });

    it('Property 25: Settings fallback - getDefaultFeatures returns valid defaults', () => {
        fc.assert(
            fc.property(fc.constant(null), () => {
                const defaults = storage.getDefaultFeatures();

                // Should return default features
                expect(defaults).toEqual(DEFAULT_FEATURES);
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Feature: performance-optimization, Property 26: Settings validation
     * Validates: Requirements 17.5
     * 
     * For any settings loaded from localStorage, all values should be validated and clamped to acceptable ranges before application.
     */
    it('Property 26: Settings validation - valid features pass validation', () => {
        fc.assert(
            fc.property(featureTogglesArbitrary, (features) => {
                const validated = storage.validateFeatures(features);

                // Valid features should be returned as-is
                expect(validated).toEqual(features);
            }),
            { numRuns: 100 }
        );
    });

    it('Property 26: Settings validation - invalid features return defaults', () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.constant(null),
                    fc.constant(undefined),
                    fc.constant({}),
                    fc.constant({ invalid: 'data' }),
                    fc.record({
                        gravitationalLensing: fc.string(), // Wrong type
                        rayTracingQuality: fc.string(),
                        accretionDisk: fc.boolean(),
                        dopplerBeaming: fc.boolean(),
                        backgroundStars: fc.boolean(),
                        photonSphereGlow: fc.boolean(),
                        bloom: fc.boolean(),
                    }),
                    fc.record({
                        gravitationalLensing: fc.boolean(),
                        rayTracingQuality: fc.string().filter(s => !['off', 'low', 'medium', 'high', 'ultra'].includes(s)), // Invalid quality
                        accretionDisk: fc.boolean(),
                        dopplerBeaming: fc.boolean(),
                        backgroundStars: fc.boolean(),
                        photonSphereGlow: fc.boolean(),
                        bloom: fc.boolean(),
                    })
                ),
                (invalidFeatures) => {
                    const validated = storage.validateFeatures(invalidFeatures);

                    // Invalid features should return defaults
                    expect(validated).toEqual(DEFAULT_FEATURES);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('Property 26: Settings validation - preset validation rejects invalid names', () => {
        fc.assert(
            fc.property(
                fc.string().filter(s => !['maximum-performance', 'balanced', 'high-quality', 'ultra-quality', 'custom'].includes(s)),
                (invalidPreset) => {
                    // Save invalid preset directly to localStorage
                    localStorage.setItem(testPresetKey, invalidPreset);

                    const loaded = storage.loadPreset();

                    // Should return null for invalid preset
                    expect(loaded).toBeNull();
                }
            ),
            { numRuns: 100 }
        );
    });
});
