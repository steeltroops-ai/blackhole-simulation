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
  const diskLUTTextureRef = useRef<WebGLTexture | null>(null);
  const spectrumLUTTextureRef = useRef<WebGLTexture | null>(null);
  const [error, setError] = useState<WebGLError | null>(null);
  const [resolutionScale, setResolutionScale] = useState(1.0);

  // Version to trigger full context recreation (e.g. on error retry or context restoration)
  const [contextVersion, setContextVersion] = useState(0);

  // Effect 1: Context Initialization & Heavy Resource Creation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      // eslint-disable-next-line no-console
      console.error("Canvas not available");
      return;
    }

    // Check WebGL support before attempting context creation
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
      const errorMsg =
        "WebGL is required but not supported by your browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.";
      setError({
        type: "context",
        message: errorMsg,
        details:
          "Your browser or device does not support WebGL, which is required for GPU-accelerated graphics.",
      });
      // eslint-disable-next-line no-console
      console.error(errorMsg);
      return;
    }

    // Try to create WebGL2 context
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
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.error(errorMsg);
      return;
    }

    const floatExt = gl.getExtension("EXT_color_buffer_float");
    if (!floatExt) {
      // eslint-disable-next-line no-console
      console.warn(
        "EXT_color_buffer_float not supported. HDR rendering may be disabled or fallback to LDR.",
      );
    }

    const shaderManager = new ShaderManager(gl);
    const features = DEFAULT_FEATURES;

    try {
      const variant = shaderManager.compileShaderVariant(
        vertexShaderSource,
        fragmentShaderSource,
        features,
      );

      if (!variant) {
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

    try {
      const buffer = getSharedQuadBuffer(gl);
      if (!buffer) {
        throw new Error("Failed to create shared quad buffer");
      }

      setupPositionAttribute(gl, program, "position", buffer);

      const glError = gl.getError();
      if (glError !== gl.NO_ERROR && glError !== 1282) {
        throw new Error(`WebGL error: ${glError}`);
      }

      setError(null);

      // Initialize Managers
      // WARNING: Bloom/Reprojection managers create TEXTURES which are resolution dependent.
      // However, they have .resize() methods. We initialize them with CURRENT canvas size.
      // Note: If canvas size was not yet updated by resolutionScale, they might be init at native size.
      // That is fine, the resizing effect below will catch it.

      const bloomManager = new BloomManager(gl);
      const bloomInitialized = bloomManager.initialize(
        canvas.width,
        canvas.height,
      );

      if (bloomInitialized) {
        bloomManagerRef.current = bloomManager;
      } else {
        // eslint-disable-next-line no-console
        console.warn("Failed to initialize bloom post-processing");
      }

      const repoManager = new ReprojectionManager(gl);
      repoManager.resize(canvas.width, canvas.height);
      reprojectionManagerRef.current = repoManager;

      const noiseTex = createNoiseTexture(gl, 256);
      if (noiseTex) {
        noiseTextureRef.current = noiseTex;
      } else {
        // eslint-disable-next-line no-console
        console.warn("Failed to create noise texture");
      }

      const blueNoiseTex = createBlueNoiseTexture(gl, 256);
      if (blueNoiseTex) {
        blueNoiseTextureRef.current = blueNoiseTex;
      } else {
        // eslint-disable-next-line no-console
        console.warn("Failed to create blue noise texture");
      }
    } catch (e) {
      const errorMsg = "GPU memory error detected";
      // eslint-disable-next-line no-console
      console.error(errorMsg, e);

      // Reduce resolution on error
      if (resolutionScale > 0.5) {
        const newScale = resolutionScale * 0.5;
        setResolutionScale(newScale);
        setContextVersion((v) => v + 1); // Trigger RE-INIT with lower scale (implicitly, next render cycle)

        setError({
          type: "memory",
          message: "Insufficient GPU memory",
          details: `Reducing resolution to ${Math.round(newScale * 100)}% and retrying...`,
        });

        // eslint-disable-next-line no-console
        console.warn(
          `Reducing resolution to ${Math.round(newScale * 100)}% due to GPU memory constraints`,
        );

        // Note: Canvas resize happens in the Resolution Effect or explicitly here?
        // Resolution Effect depends on [resolutionScale], so it will run too.
      } else {
        setError({
          type: "memory",
          message: "Insufficient GPU memory",
          details:
            "Unable to initialize WebGL with reduced resolution. Your device may not have enough GPU memory.",
        });
      }
    }

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      // eslint-disable-next-line no-console
      console.warn("WebGL context lost -- invalidating all GPU resources");
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
      // eslint-disable-next-line no-console
      console.warn("WebGL context restored -- re-initialization required");
      setError(null);
      setContextVersion((v) => v + 1); // Trigger RE-INIT
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
  }, [canvasRef, contextVersion, resolutionScale]); // Initial Setup depends ONLY on Canvas + Manual Re-init Trigger

  // Effect 2: Handle Resolution Changes (LIGHTWEIGHT)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !glRef.current) return;

    // Calculate new dimensions
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0) * resolutionScale;
    const newWidth = window.innerWidth * dpr;
    const newHeight = window.innerHeight * dpr;

    // Only resize if dimensions actually changed
    if (
      Math.abs(canvas.width - newWidth) > 1 ||
      Math.abs(canvas.height - newHeight) > 1
    ) {
      canvas.width = newWidth;
      canvas.height = newHeight;

      // Resize managers (reallocate internal FBOs)
      if (bloomManagerRef.current) {
        bloomManagerRef.current.resize(newWidth, newHeight);
      }
      if (reprojectionManagerRef.current) {
        reprojectionManagerRef.current.resize(newWidth, newHeight);
      }
    }
  }, [
    resolutionScale,
    canvasRef,
    glRef,
    bloomManagerRef,
    reprojectionManagerRef,
  ]);

  return {
    glRef,
    programRef,
    bloomManagerRef,
    reprojectionManagerRef,
    noiseTextureRef,
    blueNoiseTextureRef,
    diskLUTTextureRef,
    spectrumLUTTextureRef,
    error,
    resolutionScale,
    setResolutionScale,
  };
}
