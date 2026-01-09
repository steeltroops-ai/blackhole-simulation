/**
 * Progressive Loading Hook
 * 
 * Manages progressive feature loading with shader compilation
 * 
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 */

import { useState, useEffect, useRef } from 'react';
import { ProgressiveFeatureLoader, type ProgressiveLoadingState } from '@/shaders/progressive-loader';
import { ShaderManager } from '@/shaders/manager';
import type { FeatureToggles } from '@/types/features';

interface UseProgressiveLoadingOptions {
    gl: WebGLRenderingContext | null;
    requestedFeatures: FeatureToggles;
    vertexSource: string;
    fragmentSource: string;
    enabled: boolean;
}

interface UseProgressiveLoadingResult {
    loadingState: ProgressiveLoadingState | null;
    enabledFeatures: FeatureToggles;
    isReady: boolean;
    isLoading: boolean;
}

/**
 * Hook for managing progressive feature loading
 * 
 * Requirements:
 * - 18.1: Render basic black hole within 1 second
 * - 18.2: Progressively enable features as shaders compile
 * - 18.3: Display loading indicator for features being compiled
 * - 18.4: Remove loading indicators when all features loaded
 * - 18.5: Gracefully disable features on compilation failure
 */
export function useProgressiveLoading({
    gl,
    requestedFeatures,
    vertexSource,
    fragmentSource,
    enabled,
}: UseProgressiveLoadingOptions): UseProgressiveLoadingResult {
    const [loadingState, setLoadingState] = useState<ProgressiveLoadingState | null>(null);
    const [enabledFeatures, setEnabledFeatures] = useState<FeatureToggles>(requestedFeatures);
    const [isReady, setIsReady] = useState(false);
    const loaderRef = useRef<ProgressiveFeatureLoader | null>(null);
    const shaderManagerRef = useRef<ShaderManager | null>(null);

    useEffect(() => {
        if (!gl || !enabled) {
            return;
        }

        // Initialize shader manager and loader
        if (!shaderManagerRef.current) {
            shaderManagerRef.current = new ShaderManager(gl);
        }

        if (!loaderRef.current) {
            loaderRef.current = new ProgressiveFeatureLoader(shaderManagerRef.current);
        }

        const loader = loaderRef.current;

        // Start progressive loading
        const initializeLoading = async () => {
            try {
                // Initialize and compile features
                const state = await loader.initialize(
                    requestedFeatures,
                    vertexSource,
                    fragmentSource
                );

                setLoadingState(state);

                // Update enabled features based on compilation results
                const actuallyEnabledFeatures = loader.getEnabledFeatures(requestedFeatures);
                setEnabledFeatures(actuallyEnabledFeatures);

                // Mark as ready when basic rendering is available
                if (loader.isBasicRenderingReady()) {
                    setIsReady(true);
                }

                // Poll for updates during compilation
                const pollInterval = setInterval(() => {
                    const currentState = loader.getState();
                    setLoadingState(currentState);

                    if (currentState.isComplete) {
                        clearInterval(pollInterval);
                        const finalFeatures = loader.getEnabledFeatures(requestedFeatures);
                        setEnabledFeatures(finalFeatures);
                    }
                }, 100);

                return () => {
                    clearInterval(pollInterval);
                };
            } catch (error) {
                console.error('Error during progressive loading:', error);
                setIsReady(true); // Allow rendering to continue even if loading fails
            }
        };

        initializeLoading();

        return () => {
            // Cleanup
            if (shaderManagerRef.current) {
                shaderManagerRef.current.clearCache();
            }
        };
    }, [gl, enabled, vertexSource, fragmentSource, requestedFeatures]);

    const isLoading = loadingState ? !loadingState.isComplete : false;

    return {
        loadingState,
        enabledFeatures,
        isReady,
        isLoading,
    };
}
