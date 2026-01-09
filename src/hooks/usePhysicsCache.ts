/**
 * Hook for caching expensive physics calculations
 * 
 * Requirements: 14.2 - Implement physics value caching for unchanged inputs
 */

import { useRef } from 'react';
import { PhysicsCache } from '@/utils/cpu-optimizations';
import { calculateEventHorizon, calculatePhotonSphere, calculateISCO } from '@/physics/kerr-metric';

interface PhysicsInput {
    mass: number;
    spin: number;
}

interface PhysicsResults {
    eventHorizon: number;
    photonSphere: number;
    isco: number;
}

/**
 * Custom hook for caching physics calculations
 * 
 * Caches expensive calculations like event horizon, photon sphere, and ISCO
 * to avoid recomputing when inputs haven't changed
 * 
 * Requirements: 14.2 - Cache computed values that don't change between frames
 */
export function usePhysicsCache() {
    // Create cache for physics calculations
    const cache = useRef(new PhysicsCache<PhysicsInput, PhysicsResults>());

    /**
     * Get cached or compute physics results
     * 
     * @param mass - Black hole mass in solar masses
     * @param spin - Normalized spin parameter [-1, 1]
     * @returns Cached or computed physics results
     */
    const getPhysicsResults = (mass: number, spin: number): PhysicsResults => {
        // Normalize spin to [-1, 1] range for physics calculations
        const normalizedSpin = Math.max(-1, Math.min(1, spin / 5.0));

        const input: PhysicsInput = { mass, spin: normalizedSpin };

        // Use cache to get or compute results
        // Requirements: 14.2 - Return cached result if inputs haven't changed
        return cache.current.get(
            input,
            (input) => {
                // Compute all physics values
                const eventHorizon = calculateEventHorizon(input.mass, input.spin);
                const photonSphere = calculatePhotonSphere(input.mass, input.spin);
                const isco = calculateISCO(input.mass, input.spin, true); // prograde orbit

                return {
                    eventHorizon,
                    photonSphere,
                    isco,
                };
            }
        );
    };

    /**
     * Clear the physics cache
     */
    const clearCache = () => {
        cache.current.clear();
    };

    return {
        getPhysicsResults,
        clearCache,
    };
}
