import { useState, useRef, useEffect } from "react";
import { clampAndValidate, isValidNumber } from "@/utils/validation";
import type { MouseState, SimulationParams } from "@/types/simulation";
import { SCHWARZSCHILD_RADIUS_SOLAR } from "@/physics/constants";

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

/**
 * Calculate optimal initial zoom distance based on black hole mass and viewport dimensions
 *
 * Ensures the entire black hole system (event horizon + accretion disk) is visible
 * and occupies approximately 60-80% of the viewport.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 *
 * @param mass - Black hole mass in solar masses
 * @param viewportWidth - Viewport width in pixels
 * @param viewportHeight - Viewport height in pixels
 * @returns Optimal zoom distance, or DEFAULT_ZOOM if calculation fails
 */
export function calculateInitialZoom(
  mass: number,
  viewportWidth: number,
  viewportHeight: number,
): number {
  // Validate inputs
  if (!isValidNumber(mass) || mass <= 0) {
    console.warn("Invalid mass for calculateInitialZoom, using default zoom");
    return DEFAULT_ZOOM;
  }

  if (
    !isValidNumber(viewportWidth) ||
    !isValidNumber(viewportHeight) ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    console.warn(
      "Invalid viewport dimensions for calculateInitialZoom, using default zoom",
    );
    return DEFAULT_ZOOM;
  }

  try {
    // Calculate aspect ratio
    const aspectRatio = viewportWidth / viewportHeight;

    // Calculate event horizon radius (Schwarzschild radius)
    // r_s = 2GM/c² = mass * SCHWARZSCHILD_RADIUS_SOLAR
    const eventHorizonRadius = mass * SCHWARZSCHILD_RADIUS_SOLAR;

    // Calculate accretion disk outer radius (typically 10-15x event horizon)
    const diskOuterRadius =
      eventHorizonRadius * ACCRETION_DISK_OUTER_RADIUS_MULTIPLIER;

    // Use the smaller viewport dimension to ensure full visibility
    const smallerDimension = Math.min(viewportWidth, viewportHeight);

    // Convert FOV to radians
    const fovRadians = (FOV_DEGREES * Math.PI) / 180;

    // Calculate required distance using trigonometry
    // We want the disk to occupy TARGET_VIEWPORT_COVERAGE of the viewport
    // tan(fov/2) = (diskRadius / distance)
    // distance = diskRadius / tan(fov/2)
    const halfFov = fovRadians / 2;
    const tanHalfFov = Math.tan(halfFov);

    if (tanHalfFov <= 0) {
      console.warn("Invalid FOV calculation, using default zoom");
      return DEFAULT_ZOOM;
    }

    // Calculate base distance for full visibility
    const baseDistance = diskOuterRadius / tanHalfFov;

    // Adjust for target coverage (we want it to occupy 60-80% of viewport, not 100%)
    const adjustedDistance = baseDistance / TARGET_VIEWPORT_COVERAGE;

    // Account for aspect ratio - portrait viewports need more distance
    let aspectRatioAdjustment = 1.0;
    if (aspectRatio < 1.0) {
      // Portrait mode: increase distance proportionally
      aspectRatioAdjustment = 1.0 / aspectRatio;
    }

    const finalDistance = adjustedDistance * aspectRatioAdjustment;

    // Normalize to zoom units (the simulation uses arbitrary zoom units)
    // We'll scale based on the default zoom and mass
    const normalizedZoom = (finalDistance / diskOuterRadius) * (mass * 3.5);

    // Validate and clamp result
    const clampedZoom = clampAndValidate(
      normalizedZoom,
      MIN_ZOOM,
      MAX_ZOOM,
      DEFAULT_ZOOM,
    );

    return clampedZoom;
  } catch (error) {
    console.warn("Error calculating initial zoom:", error);
    return DEFAULT_ZOOM;
  }
}

/**
 * Touch gesture state for multi-touch handling
 */
export interface TouchState {
  /** Active touch points */
  touches: React.Touch[];
  /** Initial distance between two touches (for pinch) */
  initialDistance: number;
  /** Initial angle between two touches (for rotation) */
  initialAngle: number;
  /** Initial center point of touches (for pan) */
  initialCenter: { x: number; y: number };
}

/**
 * Custom hook for enhanced camera control interactions
 *
 * Handles:
 * - Mouse drag for camera orbit with momentum
 * - Mouse wheel and touchpad scroll for zoom
 * - Multi-touch gestures (pinch, rotate, pan)
 * - Smooth momentum and damping
 *
 * Requirements: 5.1, 5.2, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5
 *
 * @param params - Simulation parameters (for zoom state)
 * @param setParams - Function to update simulation parameters
 * @returns Mouse state and event handlers
 */
export function useCamera(
  params: SimulationParams,
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>,
) {
  // Legacy mouse state for backward compatibility - centered view
  const [mouse, setMouse] = useState<MouseState>({ x: 0.5, y: 0.5 });

  // Enhanced camera state with spherical coordinates - centered
  const [cameraState, setCameraState] = useState<CameraState>({
    theta: Math.PI,
    phi: Math.PI * 0.5,
    thetaVelocity: 0,
    phiVelocity: 0,
    zoomVelocity: 0,
    damping: 0.92,
  });

  // Mouse drag state
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Touch gesture state
  const touchState = useRef<TouchState>({
    touches: [],
    initialDistance: 0,
    initialAngle: 0,
    initialCenter: { x: 0, y: 0 },
  });

  // Apply momentum and damping on each frame
  useEffect(() => {
    let animationFrameId: number;

    const applyMomentum = () => {
      setCameraState((prev) => {
        // Apply damping to velocities
        const newThetaVelocity = prev.thetaVelocity * prev.damping;
        const newPhiVelocity = prev.phiVelocity * prev.damping;
        const newZoomVelocity = prev.zoomVelocity * prev.damping;

        // Update angles with velocity
        let newTheta = prev.theta + newThetaVelocity;
        let newPhi = prev.phi + newPhiVelocity;

        // Clamp phi to [0, π] to prevent gimbal lock
        newPhi = Math.max(0, Math.min(Math.PI, newPhi));

        // Normalize theta to [0, 2π]
        newTheta = newTheta % (2 * Math.PI);
        if (newTheta < 0) newTheta += 2 * Math.PI;

        return {
          ...prev,
          theta: newTheta,
          phi: newPhi,
          thetaVelocity:
            Math.abs(newThetaVelocity) < 0.0001 ? 0 : newThetaVelocity,
          phiVelocity: Math.abs(newPhiVelocity) < 0.0001 ? 0 : newPhiVelocity,
          zoomVelocity:
            Math.abs(newZoomVelocity) < 0.0001 ? 0 : newZoomVelocity,
        };
      });

      // Apply zoom velocity with validation
      setParams((prev) => {
        const newZoom = clampAndValidate(
          prev.zoom + cameraState.zoomVelocity,
          MIN_ZOOM,
          MAX_ZOOM,
          prev.zoom,
        );
        return {
          ...prev,
          zoom: newZoom,
        };
      });

      animationFrameId = requestAnimationFrame(applyMomentum);
    };

    animationFrameId = requestAnimationFrame(applyMomentum);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [cameraState.zoomVelocity, setParams]);

  // Update legacy mouse state from camera angles
  useEffect(() => {
    const x = cameraState.theta / (2 * Math.PI);
    const y = cameraState.phi / Math.PI;
    setMouse({ x, y });
  }, [cameraState.theta, cameraState.phi]);

  // Mouse drag handlers
  // Requirement 8.3: Validate numeric inputs
  const handleMouseDown = (e: React.MouseEvent) => {
    // Validate mouse coordinates
    if (!isValidNumber(e.clientX) || !isValidNumber(e.clientY)) {
      console.warn("Invalid mouse coordinates detected");
      return;
    }

    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Validate mouse coordinates
    if (!isValidNumber(e.clientX) || !isValidNumber(e.clientY)) {
      console.warn("Invalid mouse coordinates detected");
      return;
    }

    if (isDragging.current) {
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;

      // Validate deltas
      if (!isValidNumber(deltaX) || !isValidNumber(deltaY)) {
        console.warn("Invalid mouse delta detected");
        return;
      }

      const sensitivity = 0.005;

      setCameraState((prev) => {
        let newTheta = prev.theta + deltaX * sensitivity;
        let newPhi = prev.phi + deltaY * sensitivity;

        // Clamp phi to [0, π]
        newPhi = clampAndValidate(newPhi, 0, Math.PI, prev.phi);

        return {
          ...prev,
          theta: newTheta,
          phi: newPhi,
          thetaVelocity: deltaX * sensitivity * 0.5,
          phiVelocity: deltaY * sensitivity * 0.5,
        };
      });

      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Mouse wheel handler with proper sensitivity
  // Requirement 8.3: Validate numeric inputs and clamp to valid ranges
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault(); // Prevent default browser behaviors on canvas

    // Validate deltaY is a valid number
    if (!isValidNumber(e.deltaY)) {
      console.warn("Invalid wheel delta detected");
      return;
    }

    const sensitivity = 0.005;
    const zoomDelta = e.deltaY * sensitivity;

    setParams((prev) => {
      const newZoom = clampAndValidate(
        prev.zoom + zoomDelta,
        MIN_ZOOM,
        MAX_ZOOM,
        prev.zoom,
      );

      return {
        ...prev,
        zoom: newZoom,
      };
    });

    // Add zoom velocity for momentum
    setCameraState((prev) => ({
      ...prev,
      zoomVelocity: zoomDelta * 0.3,
    }));
  };

  // Touch event handlers
  // Requirement 8.3: Handle empty touch arrays and validate coordinates
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent default browser behaviors on canvas

    const touches = Array.from(e.touches);

    // Validate touch array is not empty
    if (touches.length === 0) {
      return;
    }

    touchState.current.touches = touches;

    if (touches.length === 2) {
      // Validate touch coordinates are within reasonable bounds
      const isValidTouch = (touch: React.Touch) => {
        return (
          !isNaN(touch.clientX) &&
          !isNaN(touch.clientY) &&
          isFinite(touch.clientX) &&
          isFinite(touch.clientY)
        );
      };

      if (!isValidTouch(touches[0]) || !isValidTouch(touches[1])) {
        console.warn("Invalid touch coordinates detected");
        return;
      }

      // Initialize pinch-to-zoom
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      touchState.current.initialDistance = Math.sqrt(dx * dx + dy * dy);
      touchState.current.initialAngle = Math.atan2(dy, dx);

      // Initialize pan center
      touchState.current.initialCenter = {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    } else if (touches.length === 1) {
      // Validate single touch coordinates
      if (
        isNaN(touches[0].clientX) ||
        isNaN(touches[0].clientY) ||
        !isFinite(touches[0].clientX) ||
        !isFinite(touches[0].clientY)
      ) {
        console.warn("Invalid touch coordinates detected");
        return;
      }

      // Single touch - initialize for rotation
      lastMousePos.current = {
        x: touches[0].clientX,
        y: touches[0].clientY,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent default browser behaviors on canvas

    const touches = Array.from(e.touches);

    // Validate touch array is not empty
    if (touches.length === 0) {
      return;
    }

    // Validate all touch coordinates
    const isValidTouch = (touch: React.Touch) => {
      return (
        !isNaN(touch.clientX) &&
        !isNaN(touch.clientY) &&
        isFinite(touch.clientX) &&
        isFinite(touch.clientY)
      );
    };

    if (!touches.every(isValidTouch)) {
      console.warn("Invalid touch coordinates detected in move");
      return;
    }

    if (touches.length === 2) {
      // Two-finger gestures: pinch, rotate, pan
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);
      const currentAngle = Math.atan2(dy, dx);
      const currentCenter = {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };

      // Pinch-to-zoom with validation
      if (touchState.current.initialDistance > 0) {
        const distanceRatio =
          currentDistance / touchState.current.initialDistance;

        // Validate ratio is a valid number
        if (!isValidNumber(distanceRatio)) {
          console.warn("Invalid distance ratio detected");
          return;
        }

        const zoomDelta = (1 - distanceRatio) * 2.0;

        setParams((prev) => {
          const newZoom = clampAndValidate(
            prev.zoom + zoomDelta,
            MIN_ZOOM,
            MAX_ZOOM,
            prev.zoom,
          );
          return {
            ...prev,
            zoom: newZoom,
          };
        });

        touchState.current.initialDistance = currentDistance;
      }

      // Two-finger rotation
      if (touchState.current.initialAngle !== 0) {
        const angleDelta = currentAngle - touchState.current.initialAngle;

        setCameraState((prev) => ({
          ...prev,
          theta: prev.theta + angleDelta * 0.5,
        }));

        touchState.current.initialAngle = currentAngle;
      }

      // Two-finger pan with validation
      const panDeltaX = currentCenter.x - touchState.current.initialCenter.x;
      const panDeltaY = currentCenter.y - touchState.current.initialCenter.y;

      // Validate pan deltas
      if (!isValidNumber(panDeltaX) || !isValidNumber(panDeltaY)) {
        console.warn("Invalid pan delta detected");
        return;
      }

      if (Math.abs(panDeltaX) > 2 || Math.abs(panDeltaY) > 2) {
        const sensitivity = 0.003;

        setCameraState((prev) => {
          let newTheta = prev.theta + panDeltaX * sensitivity;
          let newPhi = prev.phi + panDeltaY * sensitivity;

          // Clamp phi to [0, π]
          newPhi = clampAndValidate(newPhi, 0, Math.PI, prev.phi);

          return {
            ...prev,
            theta: newTheta,
            phi: newPhi,
          };
        });

        touchState.current.initialCenter = currentCenter;
      }
    } else if (touches.length === 1) {
      // Single-touch camera rotation with validation
      const deltaX = touches[0].clientX - lastMousePos.current.x;
      const deltaY = touches[0].clientY - lastMousePos.current.y;

      // Validate deltas
      if (!isValidNumber(deltaX) || !isValidNumber(deltaY)) {
        console.warn("Invalid touch delta detected");
        return;
      }

      const sensitivity = 0.005;

      setCameraState((prev) => {
        let newTheta = prev.theta + deltaX * sensitivity;
        let newPhi = prev.phi + deltaY * sensitivity;

        // Clamp phi to [0, π]
        newPhi = clampAndValidate(newPhi, 0, Math.PI, prev.phi);

        return {
          ...prev,
          theta: newTheta,
          phi: newPhi,
          thetaVelocity: deltaX * sensitivity * 0.5,
          phiVelocity: deltaY * sensitivity * 0.5,
        };
      });

      lastMousePos.current = {
        x: touches[0].clientX,
        y: touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent default browser behaviors on canvas

    const touches = Array.from(e.touches);

    // Handle empty touch arrays gracefully
    touchState.current.touches = touches;

    if (touches.length === 0) {
      // All touches ended - momentum persists via velocity
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
