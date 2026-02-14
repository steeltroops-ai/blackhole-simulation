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
  const [cameraState, setCameraState] = useState<CameraState>({
    theta: Math.PI,
    phi: Math.PI * 0.5,
    thetaVelocity: 0,
    phiVelocity: 0,
    zoomVelocity: 0,
    damping: 0.92,
  });

  const mouse = useMemo<MouseState>(() => {
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

  // Track params with ref to update velocity without re-attaching interval
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    let animationFrameId: number;
    // Mutable camera data for zero-allocation animation loop
    // We only sync to React state periodically to avoid GC pressure.
    const mutableState = {
      theta: cameraState.theta,
      phi: cameraState.phi,
      thetaVelocity: cameraState.thetaVelocity,
      phiVelocity: cameraState.phiVelocity,
      zoomVelocity: cameraState.zoomVelocity,
      damping: cameraState.damping,
    };
    let frameCount = 0;
    const SYNC_INTERVAL = 4; // sync to React every 4th frame (~15Hz)

    const applyMomentum = () => {
      // Phase 1 Fix: mutate in-place, zero allocations per frame
      mutableState.thetaVelocity *= mutableState.damping;
      mutableState.phiVelocity *= mutableState.damping;
      mutableState.zoomVelocity *= mutableState.damping;

      mutableState.theta += mutableState.thetaVelocity;
      mutableState.phi += mutableState.phiVelocity;

      // Auto-Spin Logic
      const spinSpeed =
        paramsRef.current.autoSpin !== undefined
          ? paramsRef.current.autoSpin
          : DEFAULT_AUTO_SPIN;

      if (
        !isDragging.current &&
        touchState.current.touches.length === 0 &&
        Math.abs(mutableState.thetaVelocity) < 0.001
      ) {
        mutableState.theta += spinSpeed;
      }

      // Clamp phi to [0, PI]
      mutableState.phi = Math.max(0, Math.min(Math.PI, mutableState.phi));

      // Wrap theta to [0, 2PI)
      mutableState.theta = mutableState.theta % (2 * Math.PI);
      if (mutableState.theta < 0) mutableState.theta += 2 * Math.PI;

      // Deadzone velocity to prevent infinite micro-updates
      if (Math.abs(mutableState.thetaVelocity) < 0.0001)
        mutableState.thetaVelocity = 0;
      if (Math.abs(mutableState.phiVelocity) < 0.0001)
        mutableState.phiVelocity = 0;
      if (Math.abs(mutableState.zoomVelocity) < 0.0001)
        mutableState.zoomVelocity = 0;

      // Sync to React state at throttled interval
      frameCount++;
      if (frameCount >= SYNC_INTERVAL) {
        frameCount = 0;
        const snapshot = { ...mutableState };
        setCameraState(snapshot);

        if (Math.abs(mutableState.zoomVelocity) > 0.0001) {
          const zv = mutableState.zoomVelocity;
          setParams((prev) => ({
            ...prev,
            zoom: clampAndValidate(
              prev.zoom + zv,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setParams]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isValidNumber(e.clientX) || !isValidNumber(e.clientY)) return;
    isDragging.current = true;
    lastMousePos.current.x = e.clientX;
    lastMousePos.current.y = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isValidNumber(e.clientX) || !isValidNumber(e.clientY)) return;
    if (isDragging.current) {
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      if (!isValidNumber(deltaX) || !isValidNumber(deltaY)) return;

      const sensitivity = 0.005;
      setCameraState((prev) => {
        const newTheta = prev.theta + deltaX * sensitivity;
        let newPhi = prev.phi + deltaY * sensitivity;
        newPhi = clampAndValidate(newPhi, 0, Math.PI, prev.phi);
        return {
          ...prev,
          theta: newTheta,
          phi: newPhi,
          thetaVelocity: deltaX * sensitivity * 0.5,
          phiVelocity: deltaY * sensitivity * 0.5,
        };
      });
      // Phase 1 Fix: mutate in-place instead of allocating a new object
      lastMousePos.current.x = e.clientX;
      lastMousePos.current.y = e.clientY;
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent | WheelEvent) => {
    e.preventDefault();
    if (!isValidNumber(e.deltaY)) return;
    const sensitivity = 0.005;
    const zoomDelta = e.deltaY * sensitivity;
    setParams((prev) => ({
      ...prev,
      zoom: clampAndValidate(
        prev.zoom + zoomDelta,
        MIN_ZOOM,
        MAX_ZOOM,
        prev.zoom,
      ),
    }));
    setCameraState((prev) => ({ ...prev, zoomVelocity: zoomDelta * 0.3 }));
  };

  const handleTouchStart = (e: React.TouchEvent | TouchEvent) => {
    e.preventDefault();
    const touches = Array.from(e.touches) as React.Touch[];
    if (touches.length === 0) return;
    touchState.current.touches = touches;

    const isValidTouch = (t: React.Touch) =>
      !isNaN(t.clientX) && !isNaN(t.clientY);

    if (touches.length === 2) {
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
    }
  };

  const handleTouchMove = (e: React.TouchEvent | TouchEvent) => {
    e.preventDefault();
    const touches = Array.from(e.touches) as React.Touch[];
    if (touches.length === 0) return;

    if (touches.length === 2) {
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);
      const currentAngle = Math.atan2(dy, dx);
      const currentCenter = {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };

      if (touchState.current.initialDistance > 0) {
        const distanceRatio =
          currentDistance / touchState.current.initialDistance;
        const zoomDelta = (1 - distanceRatio) * 2.0;
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

      if (touchState.current.initialAngle !== 0) {
        const angleDelta = currentAngle - touchState.current.initialAngle;
        setCameraState((prev) => ({
          ...prev,
          theta: prev.theta + angleDelta * 0.5,
        }));
        touchState.current.initialAngle = currentAngle;
      }

      const panDeltaX = currentCenter.x - touchState.current.initialCenter.x;
      const panDeltaY = currentCenter.y - touchState.current.initialCenter.y;
      if (Math.abs(panDeltaX) > 2 || Math.abs(panDeltaY) > 2) {
        setCameraState((prev) => {
          const sensitivity = 0.003;
          return {
            ...prev,
            theta: prev.theta + panDeltaX * sensitivity,
            phi: clampAndValidate(
              prev.phi + panDeltaY * sensitivity,
              0,
              Math.PI,
              prev.phi,
            ),
          };
        });
        touchState.current.initialCenter = currentCenter;
      }
    } else if (touches.length === 1) {
      const deltaX = touches[0].clientX - lastMousePos.current.x;
      const deltaY = touches[0].clientY - lastMousePos.current.y;
      const sensitivity = 0.005;
      setCameraState((prev) => {
        const newTheta = prev.theta + deltaX * sensitivity;
        let newPhi = prev.phi + deltaY * sensitivity;
        newPhi = clampAndValidate(newPhi, 0, Math.PI, prev.phi);
        return {
          ...prev,
          theta: newTheta,
          phi: newPhi,
          thetaVelocity: deltaX * sensitivity * 0.5,
          phiVelocity: deltaY * sensitivity * 0.5,
        };
      });
      lastMousePos.current.x = touches[0].clientX;
      lastMousePos.current.y = touches[0].clientY;
    }
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
  };
}
