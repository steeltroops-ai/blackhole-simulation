/**
 * Device Detection Utilities
 *
 * Provides functions for detecting mobile devices and integrated GPUs
 * to apply appropriate performance optimizations.
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
 */

/**
 * Hardware information for the current device
 */
export interface HardwareInfo {
  isMobile: boolean;
  hasIntegratedGPU: boolean;
  devicePixelRatio: number;
}

/**
 * Detects if the current device is a mobile device
 *
 * Uses user agent string and screen width to determine mobile status
 * Requirements: 16.1
 *
 * @returns true if device is mobile, false otherwise
 */
export function isMobileDevice(): boolean {
  // Check user agent for mobile device indicators
  const mobileUserAgentPattern =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUserAgent = mobileUserAgentPattern.test(navigator.userAgent);

  // Check screen width (mobile devices typically < 768px)
  const isMobileWidth =
    typeof window !== "undefined" && window.innerWidth < 768;

  return isMobileUserAgent || isMobileWidth;
}

/**
 * Detects if the current device has an integrated GPU
 *
 * Uses WebGL debug renderer info to identify integrated graphics
 * Requirements: 16.2
 *
 * @param gl - WebGL rendering context (optional)
 * @returns true if device has integrated GPU, false otherwise or if detection fails
 */
export function hasIntegratedGPU(gl?: WebGL2RenderingContext | null): boolean {
  if (!gl) {
    // Conservative default if no context provided
    return false;
  }

  try {
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      if (typeof renderer === "string") {
        // Check for common integrated GPU identifiers
        const integratedGPUPattern =
          /Intel|AMD.*Integrated|Mali|Adreno|PowerVR|VideoCore/i;
        return integratedGPUPattern.test(renderer);
      }
    }
  } catch (error) {
    // If detection fails, return conservative default
    console.warn("Failed to detect GPU type:", error);
  }

  return false;
}

/**
 * Gets comprehensive hardware information for the current device
 *
 * @param gl - WebGL rendering context (optional)
 * @returns Hardware information object
 */
export function getHardwareInfo(
  gl?: WebGL2RenderingContext | null,
): HardwareInfo {
  return {
    isMobile: isMobileDevice(),
    hasIntegratedGPU: hasIntegratedGPU(gl),
    devicePixelRatio:
      typeof window !== "undefined" ? window.devicePixelRatio : 1,
  };
}

/**
 * Gets the maximum ray steps for mobile devices
 *
 * Requirements: 16.3 - Mobile devices capped at 100 ray steps
 *
 * @param requestedSteps - The requested number of ray steps
 * @param isMobile - Whether the device is mobile
 * @returns The capped ray steps (100 max for mobile)
 */
export function getMobileRayStepCap(
  requestedSteps: number,
  isMobile: boolean,
): number {
  if (isMobile) {
    return Math.min(requestedSteps, 100);
  }
  return requestedSteps;
}
