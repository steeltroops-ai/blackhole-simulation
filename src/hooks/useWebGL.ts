import { useEffect, useRef, useState } from "react";
import { vertexShaderSource } from "@/shaders/blackhole/vertex.glsl";
import { fragmentShaderSource } from "@/shaders/blackhole/fragment.glsl";
import { ShaderManager } from "@/shaders/manager";
import { DEFAULT_FEATURES } from "@/types/features";
import { BloomManager } from "@/rendering/bloom";
import { PERFORMANCE_CONFIG } from "@/configs/performance.config";

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
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const bloomManagerRef = useRef<BloomManager | null>(null);
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
      } catch (e) {
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

    // Try to create WebGL context with error handling
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl", {
        alpha: PERFORMANCE_CONFIG.context.alpha,
        antialias: PERFORMANCE_CONFIG.context.antialias,
        depth: PERFORMANCE_CONFIG.context.depth,
        stencil: PERFORMANCE_CONFIG.context.stencil,
        preserveDrawingBuffer: PERFORMANCE_CONFIG.context.preserveDrawingBuffer,
        powerPreference: PERFORMANCE_CONFIG.context.powerPreference,
        failIfMajorPerformanceCaveat: false,
      });

      if (!gl) {
        gl = canvas.getContext(
          "experimental-webgl",
        ) as WebGLRenderingContext | null;
      }
    } catch (e) {
      const errorMsg = "Failed to create WebGL context";
      setError({
        type: "context",
        message: errorMsg,
        details: e instanceof Error ? e.message : String(e),
      });
      console.error(errorMsg, e);
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
    } catch (e: any) {
      let errorData;
      try {
        errorData = JSON.parse(e.message);
      } catch {
        errorData = {
          type: "shader",
          message: "Shader Compilation Failed",
          details: e.message,
        };
      }
      setError(errorData);
      return;
    }

    const program = programRef.current;
    if (!program) return;

    // Requirement 12.3: Catch GPU memory errors and reduce resolution
    try {
      const buffer = gl.createBuffer();
      if (!buffer) {
        throw new Error("Failed to create buffer");
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0,
        ]),
        gl.STATIC_DRAW,
      );

      // Check for GPU memory errors
      const glError = gl.getError();
      if (glError !== gl.NO_ERROR) {
        throw new Error(`WebGL error: ${glError}`);
      }

      const positionLocation = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

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

    return () => {
      if (gl && program) {
        gl.deleteProgram(program);
      }
      if (bloomManagerRef.current) {
        bloomManagerRef.current.cleanup();
      }
    };
  }, [canvasRef, resolutionScale]);

  return {
    glRef,
    programRef,
    bloomManagerRef,
    error,
    resolutionScale,
    setResolutionScale,
  };
}
