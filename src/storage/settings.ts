/**
 * Settings storage and persistence using localStorage
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */

import type { FeatureToggles, PresetName } from '@/types/features';
import { validateFeatureToggles, DEFAULT_FEATURES } from '@/types/features';

/**
 * Storage keys for localStorage
 */
const STORAGE_KEYS = {
    FEATURES: 'blackhole-sim-features',
    PRESET: 'blackhole-sim-preset',
} as const;

/**
 * Settings storage class for persisting feature toggles and presets
 */
export class SettingsStorage {
    private readonly storageKey: string;
    private readonly presetKey: string;

    constructor(
        storageKey: string = STORAGE_KEYS.FEATURES,
        presetKey: string = STORAGE_KEYS.PRESET
    ) {
        this.storageKey = storageKey;
        this.presetKey = presetKey;
    }

    /**
     * Check if localStorage is available
     */
    private isLocalStorageAvailable(): boolean {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Save feature toggles to localStorage
     * Requirement 17.1: WHEN the User changes a feature toggle THEN the System SHALL save the setting to localStorage
     */
    saveFeatures(features: FeatureToggles): void {
        if (!this.isLocalStorageAvailable()) {
            return;
        }

        try {
            const serialized = JSON.stringify(features);
            localStorage.setItem(this.storageKey, serialized);
        } catch (error) {
            console.warn('Failed to save features to localStorage:', error);
        }
    }

    /**
     * Load feature toggles from localStorage
     * Requirement 17.2: WHEN the User returns to the simulation THEN the System SHALL restore previously saved feature settings
     */
    loadFeatures(): FeatureToggles | null {
        if (!this.isLocalStorageAvailable()) {
            return null;
        }

        try {
            const serialized = localStorage.getItem(this.storageKey);
            if (!serialized) {
                return null;
            }

            const parsed = JSON.parse(serialized);

            // Validate and sanitize loaded settings
            if (validateFeatureToggles(parsed)) {
                return parsed;
            }

            // Invalid data, return null to trigger fallback
            return null;
        } catch (error) {
            console.warn('Failed to load features from localStorage:', error);
            return null;
        }
    }

    /**
     * Save preset selection to localStorage
     * Requirement 17.3: WHEN the User selects a preset THEN the System SHALL save the preset choice
     */
    savePreset(preset: PresetName): void {
        if (!this.isLocalStorageAvailable()) {
            return;
        }

        try {
            localStorage.setItem(this.presetKey, preset);
        } catch (error) {
            console.warn('Failed to save preset to localStorage:', error);
        }
    }

    /**
     * Load preset selection from localStorage
     * Requirement 17.3: WHEN the User selects a preset THEN the System SHALL save the preset choice
     */
    loadPreset(): PresetName | null {
        if (!this.isLocalStorageAvailable()) {
            return null;
        }

        try {
            const preset = localStorage.getItem(this.presetKey);
            if (!preset) {
                return null;
            }

            // Validate preset name
            const validPresets: PresetName[] = [
                'maximum-performance',
                'balanced',
                'high-quality',
                'ultra-quality',
                'custom',
            ];

            if (validPresets.includes(preset as PresetName)) {
                return preset as PresetName;
            }

            return null;
        } catch (error) {
            console.warn('Failed to load preset from localStorage:', error);
            return null;
        }
    }

    /**
     * Validate and sanitize feature toggles
     * Requirement 17.5: WHEN settings are restored THEN the System SHALL validate that saved values are within acceptable ranges
     */
    validateFeatures(features: any): FeatureToggles {
        if (validateFeatureToggles(features)) {
            return features;
        }

        // Return default features as fallback
        // Requirement 17.4: WHEN the User clears browser data THEN the System SHALL fall back to default settings
        return { ...DEFAULT_FEATURES };
    }

    /**
     * Clear all stored settings
     */
    clear(): void {
        if (!this.isLocalStorageAvailable()) {
            return;
        }

        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.presetKey);
        } catch (error) {
            console.warn('Failed to clear settings from localStorage:', error);
        }
    }

    /**
     * Get default features
     * Requirement 17.4: WHEN the User clears browser data THEN the System SHALL fall back to default settings
     */
    getDefaultFeatures(): FeatureToggles {
        return { ...DEFAULT_FEATURES };
    }
}

/**
 * Singleton instance for convenience
 */
export const settingsStorage = new SettingsStorage();
