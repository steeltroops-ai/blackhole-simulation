import { useEffect, useRef, useState } from "react";
import { vertexShaderSource } from "@/shaders/blackhole/vertex.glsl";
import { fragmentShaderSource } from "@/shaders/blackhole/fragment.glsl";
import { ShaderManager } from "@/shaders/manager";
import { DEFAULT_FEATURES } from "@/types/features";
import { BloomManager } from "@/rendering/bloom";
import { ReprojectionManager } from "@/rendering/reprojection";
import { PERFORMANCE_CONFIG } from "@/configs/performance.config";
import {
  createNoiseTexture,
  createBlueNoiseTexture,
  getSharedQuadBuffer,
  setupPositionAttribute,
} from "@/utils/webgl-utils";

/**
 * WebGL error information
 */
export interface WebGLError {
  type: "context" | "shader" | "program" | "memory";
  message: string;
  details?: string;
}

/**
 * Custom hook for WebGL context initialization and management
 *
 * Handles:
 * - WebGL context creation with error handling
 * - Shader compilation and program linking with detailed error logging
 * - Buffer creation and attribute setup
 * - GPU memory error handling with resolution reduction
 * - Cleanup on unmount
 *
 * Requirements: 12.1, 12.2, 12.3
 *
 * @param canvasRef - Reference to the canvas element
 * @returns WebGL context, program, error state, and retry function
 */
export function useWebGL(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const bloomManagerRef = useRef<BloomManager | null>(null);
  const reprojectionManagerRef = useRef<ReprojectionManager | null>(null);
  const noiseTextureRef = useRef<WebGLTexture | null>(null);
  const blueNoiseTextureRef = useRef<WebGLTexture | null>(null);
  const [error, setError] = useState<WebGLError | null>(null);
  const [resolutionScale, setResolutionScale] = useState(1.0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas not available");
      return;
    }

    // Check WebGL support before attempting context creation
    // Requirement 12.1: Check WebGL support before context creation
    const isWebGLSupported = (() => {
      try {
        const testCanvas = document.createElement("canvas");
        return !!(
          testCanvas.getContext("webgl") ||
          testCanvas.getContext("webgl2") ||
          testCanvas.getContext("experimental-webgl")
        );
      } catch {
        return false;
      }
    })();

    if (!isWebGLSupported) {
      // Requirement 12.1: Display user-friendly error message for missing WebGL
      const errorMsg =
        "WebGL is required but not supported by your browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.";
      setError({
        type: "context",
        message: errorMsg,
        details:
          "Your browser or device does not support WebGL, which is required for GPU-accelerated graphics.",
      });
      console.error(errorMsg);
      return;
    }

    // Try to create WebGL2 context (required for GLSL 300 es, RGBA16F, HDR pipeline)
    let gl: WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl2", {
        alpha: PERFORMANCE_CONFIG.context.alpha,
        antialias: PERFORMANCE_CONFIG.context.antialias,
        depth: PERFORMANCE_CONFIG.context.depth,
        stencil: PERFORMANCE_CONFIG.context.stencil,
        preserveDrawingBuffer: PERFORMANCE_CONFIG.context.preserveDrawingBuffer,
        powerPreference: PERFORMANCE_CONFIG.context.powerPreference,
        failIfMajorPerformanceCaveat: false,
      });
    } catch {
      const errorMsg = "Failed to create WebGL2 context";
      setError({
        type: "context",
        message: errorMsg,
        details:
          "An unknown error occurred while trying to create the WebGL2 context.",
      });
      console.error(errorMsg);
      return;
    }

    glRef.current = gl;

    if (!gl) {
      const errorMsg = "WebGL context could not be initialized";
      setError({
        type: "context",
        message: errorMsg,
        details:
          "The browser supports WebGL but failed to create a rendering context.",
      });
      console.error(errorMsg);
      return;
    }

    // Enable float texture rendering support (required for HDR buffers)
    const floatExt = gl.getExtension("EXT_color_buffer_float");
    if (!floatExt) {
      console.warn(
        "EXT_color_buffer_float not supported. HDR rendering may be disabled or fallback to LDR.",
      );
    }

    // Initialize shader manager and compile initial variant
    const shaderManager = new ShaderManager(gl);
    const features = DEFAULT_FEATURES;

    try {
      const variant = shaderManager.compileShaderVariant(
        vertexShaderSource,
        fragmentShaderSource,
        features,
      );

      if (!variant) {
        // If it returns null but didn't throw (shouldn't happen with our updated utils)
        setError({
          type: "program",
          message: "Shader initialization failed",
          details: "Unknown error during shader variant compilation",
        });
        return;
      }

      programRef.current = variant.program;
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      let errorData;
      try {
        errorData = JSON.parse(error.message);
      } catch {
        errorData = {
          type: "shader",
          message: "Shader Compilation Failed",
          details: error.message,
        };
      }
      setError(errorData);
      return;
    }

    const program = programRef.current;
    if (!program) return;

    // Requirement 12.3: Catch GPU memory errors and reduce resolution
    try {
      // Use shared quad buffer to ensure consistency with other managers
      const buffer = getSharedQuadBuffer(gl);
      if (!buffer) {
        throw new Error("Failed to create shared quad buffer");
      }

      // Initial setup of attribute pointer (will be reinforced in useAnimation)
      setupPositionAttribute(gl, program, "position", buffer);

      // Check for GPU memory errors
      const glError = gl.getError();
      if (glError !== gl.NO_ERROR && glError !== 1282) {
        throw new Error(`WebGL error: ${glError}`);
      }

      // Clear any error state on success
      setError(null);

      // Initialize bloom manager
      // Requirements: 8.1, 8.2, 8.3, 8.4
      const bloomManager = new BloomManager(gl);
      const bloomInitialized = bloomManager.initialize(
        canvas.width,
        canvas.height,
      );

      if (bloomInitialized) {
        bloomManagerRef.current = bloomManager;
      } else {
        console.warn("Failed to initialize bloom post-processing");
      }

      // Initialize Reprojection Manager (Phase 2)
      const repoManager = new ReprojectionManager(gl);
      repoManager.resize(canvas.width, canvas.height); // Initial size
      reprojectionManagerRef.current = repoManager;

      // Phase 1 Optimization: Pre-computed Noise Textures
      const noiseTex = createNoiseTexture(gl, 256);
      if (noiseTex) {
        noiseTextureRef.current = noiseTex;
      } else {
        console.warn("Failed to create noise texture");
      }

      const blueNoiseTex = createBlueNoiseTexture(gl, 256);
      if (blueNoiseTex) {
        blueNoiseTextureRef.current = blueNoiseTex;
      } else {
        console.warn("Failed to create blue noise texture");
      }
    } catch (e) {
      // Requirement 12.3: Reduce resolution and retry on GPU memory error
      const errorMsg = "GPU memory error detected";
      console.error(errorMsg, e);

      if (resolutionScale > 0.5) {
        const newScale = resolutionScale * 0.5;
        setResolutionScale(newScale);

        setError({
          type: "memory",
          message: "Insufficient GPU memory",
          details: `Reducing resolution to ${Math.round(newScale * 100)}% and retrying...`,
        });

        console.warn(
          `Reducing resolution to ${Math.round(newScale * 100)}% due to GPU memory constraints`,
        );

        // Adjust canvas resolution
        if (canvas) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2.0) * newScale;
          canvas.width = window.innerWidth * dpr;
          canvas.height = window.innerHeight * dpr;
        }
      } else {
        setError({
          type: "memory",
          message: "Insufficient GPU memory",
          details:
            "Unable to initialize WebGL with reduced resolution. Your device may not have enough GPU memory.",
        });
      }
    }

    // Context loss/restore handlers (Bug 3.10)
    // Mobile tab switches, driver resets, and GPU watchdog timeouts
    // invalidate all WebGL resources. We must detect this and clean up.
    const handleContextLost = (e: Event) => {
      e.preventDefault(); // Allow browser to attempt automatic restore
      console.warn("WebGL context lost -- invalidating all GPU resources");
      // Invalidate all refs to prevent using stale handles
      programRef.current = null;
      noiseTextureRef.current = null;
      blueNoiseTextureRef.current = null;
      bloomManagerRef.current = null;
      reprojectionManagerRef.current = null;
      glRef.current = null;
      setError({
        type: "context",
        message: "GPU context lost",
        details:
          "The GPU context was lost (driver reset or resource pressure). Attempting recovery...",
      });
    };

    const handleContextRestored = () => {
      console.warn("WebGL context restored -- re-initialization required");
      // Clear error to allow the effect to re-run on next dependency change
      // The user can also refresh to fully reinitialize
      setError(null);
    };

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);

      if (gl) {
        if (programRef.current) {
          gl.deleteProgram(programRef.current);
          programRef.current = null;
        }
        if (noiseTextureRef.current) {
          gl.deleteTexture(noiseTextureRef.current);
          noiseTextureRef.current = null;
        }
        if (blueNoiseTextureRef.current) {
          gl.deleteTexture(blueNoiseTextureRef.current);
          blueNoiseTextureRef.current = null;
        }
      }
      if (bloomManagerRef.current) {
        bloomManagerRef.current.cleanup();
        bloomManagerRef.current = null;
      }
      if (reprojectionManagerRef.current) {
        reprojectionManagerRef.current.cleanup();
        reprojectionManagerRef.current = null;
      }
    };
  }, [canvasRef, resolutionScale]);

  return {
    glRef,
    programRef,
    bloomManagerRef,
    reprojectionManagerRef,
    noiseTextureRef,
    blueNoiseTextureRef,
    error,
    resolutionScale,
    setResolutionScale,
  };
}
