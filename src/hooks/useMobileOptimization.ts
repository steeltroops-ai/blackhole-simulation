/**
 * useMobileOptimization Hook
 * 
 * Manages mobile-specific performance optimizations including:
 * - Automatic balanced preset application
 * - Ray step capping at 100
 * - Bloom disabled by default
 * 
 * Requirements: 16.1, 16.3, 16.4
 */

import { useEffect, useMemo } from 'react';
import { isMobileDevice, getMobileRayStepCap } from '@/utils/device-detection';
import { getPreset, type FeatureToggles } from '@/types/features';

interface MobileOptimizationConfig {
    isMobile: boolean;
    getMobileFeatures: () => FeatureToggles;
    applyMobileRayStepCap: (requestedSteps: number) => number;
}

/**
 * Hook for managing mobile-specific optimizations
 * 
 * @returns Mobile optimization configuration and utilities
 */
export const useMobileOptimization = (): MobileOptimizationConfig => {
    // Detect if device is mobile (memoized to avoid repeated checks)
    const isMobile = useMemo(() => isMobileDevice(), []);

    /**
     * Get mobile-optimized feature configuration
     * 
     * Requirements:
     * - 16.1: Apply "Balanced" preset on mobile
     * - 16.4: Disable bloom by default on mobile
     * 
     * @returns Feature toggles optimized for mobile
     */
    const getMobileFeatures = (): FeatureToggles => {
        if (!isMobile) {
            // Return default features for non-mobile
            return getPreset('ultra-quality');
        }

        // Get balanced preset as base (Requirement 16.1)
        const balancedFeatures = getPreset('balanced');

        // Ensure bloom is disabled on mobile (Requirement 16.4)
        return {
            ...balancedFeatures,
            bloom: false,
        };
    };

    /**
     * Apply mobile ray step cap
     * 
     * Requirements: 16.3 - Cap at 100 steps on mobile
     * 
     * @param requestedSteps - The requested number of ray steps
     * @returns Capped ray steps for mobile devices
     */
    const applyMobileRayStepCap = (requestedSteps: number): number => {
        return getMobileRayStepCap(requestedSteps, isMobile);
    };

    // Log mobile detection on mount (for debugging)
    useEffect(() => {
        if (isMobile) {
            console.log('Mobile device detected - applying mobile optimizations');
        }
    }, [isMobile]);

    return {
        isMobile,
        getMobileFeatures,
        applyMobileRayStepCap,
    };
};
