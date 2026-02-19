"use client";

import { useRef, useEffect, useState } from "react";
import { WebGLRenderer } from "@/rendering/webgl/renderer";
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
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const paramsRef = useRef(params);
  const mouseRef = useRef(mouse);
  const [error, setError] = useState<any>(null);
  const requestRef = useRef<number>(0);

  const startLoop = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    const loop = () => {
      try {
        if (rendererRef.current) {
          rendererRef.current.render(paramsRef.current, mouseRef.current);
        }
      } catch (e: any) {
        // CRITICAL: Without this try/catch, any throw inside render() silently
        // kills the entire rAF loop. The user sees a black screen with no error.
        console.error("[WebGLCanvas] Render loop crash:", e);
        setError({
          type: "shader" as const,
          message: `Render loop crashed: ${e.message || e}`,
          details: e.stack || String(e),
        });
        // Stop the loop on crash to prevent infinite error spam
        return;
      }
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    mouseRef.current = mouse;
  }, [mouse]);

  useEffect(() => {
    if (!canvasRef.current || rendererRef.current) return;

    // Ensure canvas has initial size before renderer init
    const canvas = canvasRef.current;
    canvas.width =
      window.innerWidth * Math.min(window.devicePixelRatio || 1, 2.0);
    canvas.height =
      window.innerHeight * Math.min(window.devicePixelRatio || 1, 2.0);

    const renderer = new WebGLRenderer();
    renderer.onMetricsUpdate = onMetricsUpdate;
    const success = renderer.init(canvas);

    if (success) {
      rendererRef.current = renderer;
      startLoop();
    } else {
      setError(
        renderer.error || { type: "context", message: "WebGL Init Failed" },
      );
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (rendererRef.current) rendererRef.current.cleanup();
      // CRITICAL FIX: Must null the ref so React 18 Strict Mode's
      // second mount can re-initialize. Without this, the guard at
      // the top of this effect (`if (rendererRef.current) return`)
      // skips init on the second mount, leaving a dead renderer.
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
        const newWidth = window.innerWidth * dpr;
        const newHeight = window.innerHeight * dpr;

        if (canvas.width !== newWidth || canvas.height !== newHeight) {
          canvas.width = newWidth;
          canvas.height = newHeight;
          if (rendererRef.current)
            rendererRef.current.resize(newWidth, newHeight);
        }
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
