import { useState, useRef, useEffect, useMemo } from "react";
import { clampAndValidate, isValidNumber } from "@/utils/validation";
import type { MouseState, SimulationParams } from "@/types/simulation";
import { SCHWARZSCHILD_RADIUS_SOLAR } from "@/physics/constants";
// Geometric Units: G = c = 1

/**
 * Camera state with spherical coordinates and velocity for momentum
 */
export interface CameraState {
  /** Azimuthal angle (0 - 2π) */
  theta: number;
  /** Polar angle (0 - π) */
  phi: number;
  /** Velocity for theta (momentum) */
  thetaVelocity: number;
  /** Velocity for phi (momentum) */
  phiVelocity: number;
  /** Velocity for zoom (momentum) */
  zoomVelocity: number;
  /** Damping factor for momentum decay */
  damping: number;
}

/**
 * Viewport dimensions for camera calculations
 */
export interface ViewportDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

// Constants for camera positioning
const DEFAULT_ZOOM = 14.0;
const MIN_ZOOM = 2.5;
const MAX_ZOOM = 50.0;
const FOV_DEGREES = 45;
const TARGET_VIEWPORT_COVERAGE = 0.7; // 70% of viewport (60-80% range)
const ACCRETION_DISK_OUTER_RADIUS_MULTIPLIER = 12.0; // Outer disk is ~12x event horizon
// Default auto-spin if not provided
const DEFAULT_AUTO_SPIN = 0.005;

/**
 * Calculate optimal initial zoom distance based on black hole mass and viewport dimensions
 */
export function calculateInitialZoom(
  mass: number,
  viewportWidth: number,
  viewportHeight: number,
): number {
  if (!isValidNumber(mass) || mass <= 0) return DEFAULT_ZOOM;

  if (
    !isValidNumber(viewportWidth) ||
    !isValidNumber(viewportHeight) ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    return DEFAULT_ZOOM;
  }

  try {
    const aspectRatio = viewportWidth / viewportHeight;
    const eventHorizonRadius = mass * SCHWARZSCHILD_RADIUS_SOLAR;
    const diskOuterRadius =
      eventHorizonRadius * ACCRETION_DISK_OUTER_RADIUS_MULTIPLIER;
    const _smallerDimension = Math.min(viewportWidth, viewportHeight);
    const fovRadians = (FOV_DEGREES * Math.PI) / 180;
    const halfFov = fovRadians / 2;
    const tanHalfFov = Math.tan(halfFov);

    if (tanHalfFov <= 0) return DEFAULT_ZOOM;

    const baseDistance = diskOuterRadius / tanHalfFov;
    const adjustedDistance = baseDistance / TARGET_VIEWPORT_COVERAGE;
    let aspectRatioAdjustment = 1.0;
    if (aspectRatio < 1.0) {
      aspectRatioAdjustment = 1.0 / aspectRatio;
    }

    const finalDistance = adjustedDistance * aspectRatioAdjustment;
    const normalizedZoom = (finalDistance / diskOuterRadius) * (mass * 3.5);

    return clampAndValidate(normalizedZoom, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM);
  } catch (error) {
    console.warn("Error calculating initial zoom:", error);
    return DEFAULT_ZOOM;
  }
}

/**
 * Touch gesture state for multi-touch handling
 */
export interface TouchState {
  touches: React.Touch[];
  initialDistance: number;
  initialAngle: number;
  initialCenter: { x: number; y: number };
}

/**
 * Custom hook for enhanced camera control interactions
 */
export function useCamera(
  params: SimulationParams,
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>,
) {
  // --- Source of Truth: Physics Ref ---
  // We use a ref for physics to avoid stale closures in the animation loop
  // and to allow the loop + event handlers to mutate the same state without race conditions.
  const physicsRef = useRef<CameraState>({
    theta: Math.PI,
    phi: Math.PI * 0.5,
    thetaVelocity: 0,
    phiVelocity: 0,
    zoomVelocity: 0,
    damping: 0.92,
  });

  // React state for rendering synchronization (throttled)
  const [cameraState, setCameraState] = useState<CameraState>(
    physicsRef.current,
  );

  const mouse = useMemo<MouseState>(() => {
    // Normalize derived state from the REACT state (for rendering UI/Uniforms)
    const x = cameraState.theta / (2 * Math.PI);
    const y = cameraState.phi / Math.PI;
    return { x, y };
  }, [cameraState.theta, cameraState.phi]);

  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const touchState = useRef<TouchState>({
    touches: [],
    initialDistance: 0,
    initialAngle: 0,
    initialCenter: { x: 0, y: 0 },
  });

  const cinematicRef = useRef<{
    active: boolean;
    startTime: number;
    path: "orbit" | "dive" | null;
  }>({ active: false, startTime: 0, path: null });

  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  // --- Physics Animation Loop ---
  useEffect(() => {
    let animationFrameId: number;
    let frameCount = 0;
    const SYNC_INTERVAL = 2; // Sync to React every 2 frames for smoother UI (60fps -> 30fps UI)

    const applyMomentum = () => {
      const state = physicsRef.current; // Direct access to shared state

      if (cinematicRef.current.active) {
        // --- Cinematic Mode ---
        const t = (performance.now() - cinematicRef.current.startTime) * 0.001;
        if (cinematicRef.current.path === "orbit") {
          state.theta += 0.003;
          state.phi = Math.PI * 0.5 + Math.sin(t * 0.3) * 0.15;
        } else if (cinematicRef.current.path === "dive") {
          state.theta += 0.01 + t * 0.002;
        }
        state.thetaVelocity = 0;
        state.phiVelocity = 0;
        state.zoomVelocity = 0;
      } else {
        // --- Interactive Mode ---
        // Apply Drag Inertia / Momentum
        state.thetaVelocity *= state.damping;
        state.phiVelocity *= state.damping;
        state.zoomVelocity *= state.damping;

        state.theta += state.thetaVelocity;
        state.phi += state.phiVelocity;

        // Auto-Spin (Only if not dragging and no significant momentum)
        const spinSpeed =
          paramsRef.current.autoSpin !== undefined
            ? paramsRef.current.autoSpin
            : DEFAULT_AUTO_SPIN;

        if (
          !isDragging.current &&
          touchState.current.touches.length === 0 &&
          Math.abs(state.thetaVelocity) < 0.0001
        ) {
          state.theta += spinSpeed;
        }
      }

      // --- Constraints ---
      // Clamp phi (Vertical) to poles [0, PI] to prevent flipping
      // Note: Shader allows full rotation, but we clamp state to KEEP 'UP' VECTOR STABLE.
      // If user wants full tumbling, we would remove this clamp.
      // Current Request: "Full axis to move".
      // Allowing < 0 or > PI flips the camera upside down in Orbit controls.
      // Standard practice: Clamp to epsilon (0.001) and PI-epsilon.
      state.phi = Math.max(0.001, Math.min(Math.PI - 0.001, state.phi));

      // Wrap theta (Horizontal) 0 -> 2PI
      state.theta = state.theta % (2 * Math.PI);
      if (state.theta < 0) state.theta += 2 * Math.PI;

      // Deadzone Check
      if (Math.abs(state.thetaVelocity) < 0.00001) state.thetaVelocity = 0;
      if (Math.abs(state.phiVelocity) < 0.00001) state.phiVelocity = 0;
      if (Math.abs(state.zoomVelocity) < 0.00001) state.zoomVelocity = 0;

      // --- Sync to React State ---
      // We only update React state periodically to save render cost,
      // BUT we do it often enough for smooth visual feedback.
      frameCount++;
      if (frameCount >= SYNC_INTERVAL) {
        frameCount = 0;
        setCameraState({ ...state }); // Clone to trigger re-render

        // Zoom sync to Params (for other systems relying on 'zoom')
        if (Math.abs(state.zoomVelocity) > 0.0001) {
          setParams((prev) => ({
            ...prev,
            zoom: clampAndValidate(
              prev.zoom + state.zoomVelocity,
              MIN_ZOOM,
              MAX_ZOOM,
              prev.zoom,
            ),
          }));
        }
      }

      animationFrameId = requestAnimationFrame(applyMomentum);
    };

    animationFrameId = requestAnimationFrame(applyMomentum);
    return () => cancelAnimationFrame(animationFrameId);
  }, [setParams]); // No other dependencies needed!

  // --- Input Handlers (Mutate Ref Directly) ---

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isValidNumber(e.clientX) || !isValidNumber(e.clientY)) return;
    cinematicRef.current.active = false;
    isDragging.current = true;
    lastMousePos.current.x = e.clientX;
    lastMousePos.current.y = e.clientY;

    // Kill momentum on grab
    physicsRef.current.thetaVelocity = 0;
    physicsRef.current.phiVelocity = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isValidNumber(e.clientX) || !isValidNumber(e.clientY)) return;
    if (isDragging.current) {
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      if (!isValidNumber(deltaX) || !isValidNumber(deltaY)) return;

      const sensitivity = 0.005;

      // Directly mutate physics state
      // Note: We add to position AND set velocity (for "throw" momentum on release)
      physicsRef.current.theta += deltaX * sensitivity;
      physicsRef.current.phi += deltaY * sensitivity;
      physicsRef.current.thetaVelocity = deltaX * sensitivity * 0.5;
      physicsRef.current.phiVelocity = deltaY * sensitivity * 0.5;

      lastMousePos.current.x = e.clientX;
      lastMousePos.current.y = e.clientY;

      // Force immediate sync to React for responsive drag
      setCameraState({ ...physicsRef.current });
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const nudgeCamera = (dTheta: number, dPhi: number) => {
    cinematicRef.current.active = false;
    physicsRef.current.thetaVelocity += dTheta;
    physicsRef.current.phiVelocity += dPhi;
  };

  const startCinematic = (path: "orbit" | "dive") => {
    cinematicRef.current = {
      active: true,
      startTime: performance.now(),
      path,
    };
    if (path === "dive") {
      setParams((p) => ({ ...p, zoom: 40, autoSpin: 0.002 }));
    }
  };

  const stopCinematic = () => {
    cinematicRef.current.active = false;
  };

  const handleWheel = (e: React.WheelEvent | WheelEvent) => {
    e.preventDefault();
    if (!isValidNumber(e.deltaY)) return;
    const sensitivity = 0.005;
    const zoomDelta = e.deltaY * sensitivity;

    // Direct param update for Zoom (it's less physics-dependent in this logic)
    setParams((prev) => ({
      ...prev,
      zoom: clampAndValidate(
        prev.zoom + zoomDelta,
        MIN_ZOOM,
        MAX_ZOOM,
        prev.zoom,
      ),
    }));
    // Add velocity for "feel"
    physicsRef.current.zoomVelocity = zoomDelta * 0.3;
  };

  const handleTouchStart = (e: React.TouchEvent | TouchEvent) => {
    e.preventDefault();
    const touches = Array.from(e.touches) as React.Touch[];
    if (touches.length === 0) return;
    touchState.current.touches = touches;

    const isValidTouch = (t: React.Touch) =>
      !isNaN(t.clientX) && !isNaN(t.clientY);

    if (touches.length === 2) {
      // ... (Pinch logic initialization remains similar)
      if (!touches.every(isValidTouch)) return;
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      touchState.current.initialDistance = Math.sqrt(dx * dx + dy * dy);
      touchState.current.initialAngle = Math.atan2(dy, dx);
      touchState.current.initialCenter = {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    } else if (touches.length === 1) {
      if (!isValidTouch(touches[0])) return;
      lastMousePos.current.x = touches[0].clientX;
      lastMousePos.current.y = touches[0].clientY;
      physicsRef.current.thetaVelocity = 0;
      physicsRef.current.phiVelocity = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent | TouchEvent) => {
    e.preventDefault();
    const touches = Array.from(e.touches) as React.Touch[];
    if (touches.length === 0) return;

    if (touches.length === 2) {
      // Pinch/Pan Logic
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);
      const currentCenter = {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };

      // Zoom
      if (touchState.current.initialDistance > 0) {
        const ratio = currentDistance / touchState.current.initialDistance;
        const zoomDelta = (1 - ratio) * 2.0;
        setParams((prev) => ({
          ...prev,
          zoom: clampAndValidate(
            prev.zoom + zoomDelta,
            MIN_ZOOM,
            MAX_ZOOM,
            prev.zoom,
          ),
        }));
        touchState.current.initialDistance = currentDistance;
      }

      // Pan (Move Camera)
      const panX = currentCenter.x - touchState.current.initialCenter.x;
      const panY = currentCenter.y - touchState.current.initialCenter.y;

      if (Math.abs(panX) > 2 || Math.abs(panY) > 2) {
        const sensitivity = 0.003;
        physicsRef.current.theta += panX * sensitivity;
        physicsRef.current.phi += panY * sensitivity;
        touchState.current.initialCenter = currentCenter;
      }
    } else if (touches.length === 1) {
      // Rotate
      const deltaX = touches[0].clientX - lastMousePos.current.x;
      const deltaY = touches[0].clientY - lastMousePos.current.y;
      const sensitivity = 0.005;

      physicsRef.current.theta += deltaX * sensitivity;
      physicsRef.current.phi += deltaY * sensitivity;
      physicsRef.current.thetaVelocity = deltaX * sensitivity * 0.5;
      physicsRef.current.phiVelocity = deltaY * sensitivity * 0.5;

      lastMousePos.current.x = touches[0].clientX;
      lastMousePos.current.y = touches[0].clientY;
    }
    setCameraState({ ...physicsRef.current });
  };

  const handleTouchEnd = (e: React.TouchEvent | TouchEvent) => {
    e.preventDefault();
    const touches = Array.from(e.touches) as React.Touch[];
    touchState.current.touches = touches;
    if (touches.length === 0) {
      touchState.current.initialDistance = 0;
      touchState.current.initialAngle = 0;
    }
  };

  const resetCamera = () => {
    cinematicRef.current.active = false;
    physicsRef.current = {
      theta: Math.PI,
      phi: Math.PI * 0.5,
      thetaVelocity: 0,
      phiVelocity: 0,
      zoomVelocity: 0,
      damping: 0.92,
    };
    setCameraState({ ...physicsRef.current });

    // Also reset Zoom param to default
    setParams((prev) => ({
      ...prev,
      zoom: DEFAULT_ZOOM,
    }));
  };

  return {
    mouse,
    cameraState,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    nudgeCamera,
    startCinematic,
    stopCinematic,
    resetCamera,
    isCinematic: cinematicRef.current.active,
  };
}
