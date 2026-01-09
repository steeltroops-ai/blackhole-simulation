/**
 * Hook for debounced parameter updates
 * 
 * Requirements: 14.3 - Add parameter change debouncing (100ms)
 */

import { useRef, useCallback } from 'react';
import { debounce } from '@/utils/cpu-optimizations';
import type { SimulationParams } from '@/types/simulation';

/**
 * Custom hook for debouncing parameter changes
 * 
 * This prevents excessive recalculation when users rapidly adjust sliders
 * 
 * @param onParamsChange - Callback to update parameters
 * @param debounceMs - Debounce delay in milliseconds (default: 100ms)
 * @returns Debounced parameter change handler
 */
export function useDebouncedParams(
    onParamsChange: (params: SimulationParams) => void,
    debounceMs: number = 100
) {
    // Create debounced version of the callback
    // Requirements: 14.3 - Debounce rapid changes to prevent excessive recalculation
    const debouncedCallback = useRef(
        debounce((params: SimulationParams) => {
            onParamsChange(params);
        }, debounceMs)
    );

    // Immediate update handler (for critical changes like pause/play)
    const handleImmediateChange = useCallback((params: SimulationParams) => {
        onParamsChange(params);
    }, [onParamsChange]);

    // Debounced update handler (for slider changes)
    const handleDebouncedChange = useCallback((params: SimulationParams) => {
        debouncedCallback.current(params);
    }, []);

    return {
        handleImmediateChange,
        handleDebouncedChange,
    };
}
