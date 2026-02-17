import { useRef, useEffect } from "react";
import { useWebGL } from "@/hooks/useWebGL";
import { useAnimation } from "@/hooks/useAnimation";
import { AlertCircle } from "lucide-react";
import type { SimulationParams, MouseState } from "@/types/simulation";
import type { PerformanceMetrics } from "@/performance/monitor";

interface WebGLCanvasProps {
  params: SimulationParams;
  mouse: MouseState;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onWheel: (e: React.WheelEvent | WheelEvent) => void;
  onTouchStart: (e: React.TouchEvent | TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent | TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent | TouchEvent) => void;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export const WebGLCanvas = ({
  params,
  mouse,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onMetricsUpdate,
}: WebGLCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
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
  } = useWebGL(canvasRef);
  useAnimation(
    {
      glRef,
      programRef,
      bloomManagerRef,
      reprojectionManagerRef,
      noiseTextureRef,
      blueNoiseTextureRef,
      diskLUTTextureRef,
      spectrumLUTTextureRef,
    },
    params,
    mouse,
    setResolutionScale,
    onMetricsUpdate,
  );

  useEffect(() => {
    let debounceTimer: number | null = null;

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        requestAnimationFrame(() => {
          const dpr =
            Math.min(window.devicePixelRatio || 1, 2.0) * resolutionScale;
          const newWidth = window.innerWidth * dpr;
          const newHeight = window.innerHeight * dpr;

          // Only resize if dimensions actually changed to prevent flicker
          if (canvas.width !== newWidth || canvas.height !== newHeight) {
            canvas.width = newWidth;
            canvas.height = newHeight;

            // Resize managers to match new canvas resolution
            if (bloomManagerRef.current) {
              bloomManagerRef.current.resize(newWidth, newHeight);
            }
            if (reprojectionManagerRef.current) {
              reprojectionManagerRef.current.resize(newWidth, newHeight);
            }
          }
        });
      }
    };

    // Debounce resize using requestAnimationFrame to avoid forced reflows and align with paint cycle.
    const debouncedResize = () => {
      if (debounceTimer) cancelAnimationFrame(debounceTimer);
      debounceTimer = requestAnimationFrame(handleResize);
    };

    window.addEventListener("resize", debouncedResize);
    // Initial resize fires immediately (no debounce)
    handleResize();

    return () => {
      window.removeEventListener("resize", debouncedResize);
      if (debounceTimer) cancelAnimationFrame(debounceTimer);
    };
  }, [resolutionScale, bloomManagerRef, reprojectionManagerRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Attach listeners with passive: false to allow preventDefault()
    const options: AddEventListenerOptions = { passive: false };

    const wheelHandler = (e: WheelEvent) => onWheel(e);
    const touchStartHandler = (e: TouchEvent) => onTouchStart(e);
    const touchMoveHandler = (e: TouchEvent) => onTouchMove(e);
    const touchEndHandler = (e: TouchEvent) => onTouchEnd(e);

    canvas.addEventListener("wheel", wheelHandler, options);
    canvas.addEventListener("touchstart", touchStartHandler, options);
    canvas.addEventListener("touchmove", touchMoveHandler, options);
    canvas.addEventListener("touchend", touchEndHandler, options);

    return () => {
      canvas.removeEventListener("wheel", wheelHandler);
      canvas.removeEventListener("touchstart", touchStartHandler);
      canvas.removeEventListener("touchmove", touchMoveHandler);
      canvas.removeEventListener("touchend", touchEndHandler);
    };
  }, [onWheel, onTouchStart, onTouchMove, onTouchEnd]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full z-0 cursor-move"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      />

      {error && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm select-text">
          <div className="max-w-2xl mx-4 p-6 bg-red-950/50 border border-red-500/30 rounded-xl shadow-2xl">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold text-red-300">
                    {error.type === "context" && "WebGL Not Available"}
                    {error.type === "shader" && "Shader Error"}
                    {error.type === "program" && "Link Error"}
                    {error.type === "memory" && "GPU Memory Error"}
                  </h2>
                  <button
                    onClick={() => {
                      const text = `${error.message}\n\n${error.details || ""}`;
                      navigator.clipboard.writeText(text);
                    }}
                    className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-1 rounded border border-white/10 text-white transition-colors"
                  >
                    Copy Full Error
                  </button>
                </div>
                <p className="text-sm text-gray-300 mb-3">{error.message}</p>
                {error.details && (
                  <div className="text-xs text-gray-400 bg-black/30 p-3 rounded border border-white/10 max-h-[400px] overflow-auto">
                    <div className="font-medium text-gray-300 mb-2">
                      Technical Details:
                    </div>
                    <pre className="whitespace-pre-wrap font-mono break-all">
                      {error.details}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
