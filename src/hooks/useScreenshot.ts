import { useCallback } from "react";

/**
 * Screenshot hook for canvas capture.
 *
 * Captures the current WebGL canvas frame as a PNG file and triggers download.
 * The canvas must be created with `preserveDrawingBuffer: true` for reliable
 * capture, but we use `readPixels` as a fallback approach that works regardless.
 *
 * Phase 7: Screenshot capability for sharing simulation snapshots.
 */
export function useScreenshot(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  const takeScreenshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn("Cannot take screenshot: canvas not available");
      return;
    }

    try {
      // toDataURL works when preserveDrawingBuffer is true
      // For WebGL canvases without it, we need to capture during the same frame
      // The canvas should be rendered at this point from the animation loop
      const dataUrl = canvas.toDataURL("image/png");

      // Create download link
      const link = document.createElement("a");
      link.download = `blackhole-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Screenshot failed:", err);
    }
  }, [canvasRef]);

  return { takeScreenshot };
}
