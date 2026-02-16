import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { clampAndValidate, isValidNumber } from "@/utils/validation";
import type { MouseState, SimulationParams } from "@/types/simulation";
import { SCHWARZSCHILD_RADIUS_SOLAR } from "@/physics/constants";
import { SIMULATION_CONFIG } from "@/configs/simulation.config";
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
 * Extended Cinematic State Machine
 * Tracks the active "Director Mode" and its trajectory parameters.
 */
interface CinematicState {
  active: boolean;
  mode: "orbit" | "dive" | null;
  startTime: number;
  lastTime: number; // For physics integration (dt)
  startParams: {
    theta: number;
    phi: number;
    zoom: number;
  };
  // Physics State for Infall
  velocity: number; // Radial velocity (dr/dt) in Rs/s
  angularMomentum: number; // Conserved L = r^2 * omega
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
const DEFAULT_ZOOM = SIMULATION_CONFIG.zoom.default;
const MIN_ZOOM = 2.5;
const MAX_ZOOM = 50.0;
const FOV_DEGREES = 45;
const TARGET_VIEWPORT_COVERAGE = 0.7; // 70% of viewport (60-80% range)
const ACCRETION_DISK_OUTER_RADIUS_MULTIPLIER = 12.0; // Outer disk is ~12x event horizon
// Default auto-spin if not provided
const DEFAULT_AUTO_SPIN = SIMULATION_CONFIG.autoSpin.default;
const DEFAULT_VERTICAL_ANGLE =
  (SIMULATION_CONFIG.verticalAngle.default * Math.PI) / 180;

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
    // eslint-disable-next-line no-console
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
 * Now featuring "Cinematic Engineering" Grade Orbit & Infall
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
    phi: DEFAULT_VERTICAL_ANGLE,
    thetaVelocity: 0,
    phiVelocity: 0,
    zoomVelocity: 0,
    damping: 0.92,
  });

  // React state for rendering synchronization (throttled)
  const [cameraState, setCameraState] = useState<CameraState>(
    physicsRef.current,
  );

  // Cinematic State (UI Sync)
  // Cinematic State (UI Sync)
  const [isCinematic, setIsCinematic] = useState(false);
  const [cinematicMode, setCinematicMode] = useState<"orbit" | "dive" | null>(
    null,
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

  // --- Cinematic State Machine (Physics Side) ---
  const cinematicRef = useRef<CinematicState>({
    active: false,
    mode: null,
    startTime: 0,
    lastTime: 0,
    startParams: { theta: 0, phi: 0, zoom: 0 },
    velocity: 0,
    angularMomentum: 0,
  });

  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  // --- Physics Animation Loop ---
  useEffect(() => {
    let animationFrameId: number;
    let frameCount = 0;
    const SYNC_INTERVAL = 2; // Sync to React every 2 frames for smoother UI (60fps -> 30fps UI)

    // --- Reset Logic (Internal for loop) ---
    // The main resetCamera is defined outside the effect.

    const applyMomentum = () => {
      const state = physicsRef.current; // Direct access to shared state
      const now = performance.now();

      // Calculate delta time in seconds (max 0.1s to prevent huge jumps on lag)
      const dt = Math.min((now - cinematicRef.current.lastTime) * 0.001, 0.1);
      cinematicRef.current.lastTime = now;

      if (cinematicRef.current.active && cinematicRef.current.mode) {
        // --- CINEMATIC MODE: DIRECTOR'S CUT ---
        const t = (now - cinematicRef.current.startTime) * 0.001; // Total time
        const { theta: startTheta } = cinematicRef.current.startParams;

        if (cinematicRef.current.mode === "orbit") {
          // === ORBIT DEMO: KEPLERIAN CINEMATIC TOUR ===
          // A dynamic, elliptical orbit that speeds up when close (Periapsis)
          // and slows down when far (Apoapsis), creating a "slingshot" feel.

          // 1. Zoom (Radius) - Define an Elliptical Path
          // Oscillate between close (10.0) and far (25.0) over a long period
          // Period = 40s
          // Period = Fast cycle for "Trailer" feel
          const orbitTime = t * 0.2; // Faster zoom cycle

          const verticalWave = Math.sin(orbitTime * 0.5);

          // Base Pivot: Use the configured default vertical angle (e.g. 97 deg), NOT Equator.
          // User Range Constraint: 80 deg to 110 deg.
          // Base ~97. Amplitude ~10-12 degrees keeps us safely within 80-110.
          // Base Pivot: Use the configured default vertical angle (e.g. 97 deg), NOT Equator.
          // User Request: "Don't make the camera go below degree 92".
          // In spherical coords, degree 90 is equator, 0 is top.
          // If default is 97, and we can't go "below" (meaning closer to pole/smaller angle) than 92,
          // then our max upward swing is 5 degrees. We'll use +/- 5 degrees for balance.
          const orbitAmplitude = (5 * Math.PI) / 180; // ~0.087 radians

          // We oscillate around the DEFAULT axis
          const targetPhi =
            DEFAULT_VERTICAL_ANGLE + verticalWave * orbitAmplitude * -1;

          // --- ZOOM & DISTANCE DYNAMICS ---
          // User Request: "Don't let the camera get closer... feeling like we are falling in"
          // Push everything out further.
          const minSafeZoom = Math.max(18.0, paramsRef.current.mass * 4.0);

          // Outer Orbit: Range 22.0 to 42.0
          const safeRadiusBase = 22.0;
          const radiusVar = 10.0;

          // Use zoomPhase calculated above
          const zoomPhase = Math.cos(orbitTime);

          // Remap targetDist
          const rawDist = safeRadiusBase + zoomPhase * radiusVar;
          const targetDist = Math.max(minSafeZoom, rawDist);

          // Moderate interpolation for smooth but distinct distance shifts
          const currentZoom = paramsRef.current.zoom;
          const r = currentZoom + (targetDist - currentZoom) * 0.02;

          if (Math.abs(r - currentZoom) > 0.001) {
            setParams((prev) => ({ ...prev, zoom: r }));
          }

          // Add secondary "Handheld" wobble for realism
          const wobble = Math.sin(t * 0.5) * 0.05 + Math.cos(t * 0.23) * 0.03;

          // Smoothly seek target phi ONLY if user is not engaging
          // Allows user to override ("let the user go") but stabilizes back ("slowly go back")
          if (!isDragging.current && touchState.current.touches.length === 0) {
            state.phi += (targetPhi + wobble - state.phi) * 0.015;

            // "Make excitation disk go faster" -> Fast Orbital Rotation
            // We drive the theta explicitly here for the "Speed" effect
            state.theta += dt * 0.4; // Fast orbit ~ 0.4 rad/s
          }
        } else if (cinematicRef.current.mode === "dive") {
          // === INFALL DIVE: RELATIVISTIC GEODESIC PLUNGE ===
          // 1. Radial Physics (Newtonian Gravity + Relativistic Correction term approximation)
          // a = -M/r^2
          const r = paramsRef.current.zoom;

          // Effective Gravity: Tweak for "Cinematic Slow Fall"
          // Tuned to 18.0 (from 5.0) to speed up the mid-fall acceleration
          const gravity = -25.0 / (r * r + 0.1);

          // Update Velocity (v = v0 + a*dt)
          cinematicRef.current.velocity += gravity * dt;

          // Update Position (r = r0 + v*dt)
          let newR = r + cinematicRef.current.velocity * dt;

          // 2. Angular Physics (Conservation of Momentum)
          // omega = L / r^2
          const L = cinematicRef.current.angularMomentum;
          // Add a small constant to prevent division by zero, but keep it small to allow spin up
          const omegaProp = L / (newR * newR + 0.1);

          // Apply as a continuous rotation (Drift)
          // We add this to theta directly for the "Base Motion"
          state.theta += omegaProp * dt;

          // Allow user to ADD velocity on top (fighting the current)
          // We do this by NOT zeroing thetaVelocity at the end of the frame/block

          // 3. Inclination: Gentle drift to equatorial plane
          // Slower drift now (-5.0 instead of -50 in gravity means more time)
          const distToEquator = Math.PI * 0.5 - state.phi;
          state.phi += distToEquator * dt * 0.2; // Slower alignment to allow looking around

          // --- HORIZON CROSSING LOGIC ---
          if (newR < 2.0) {
            // Horizon crossing: Perform a FULL RESET to safe state.
            // This must match the manual 'resetCamera' logic exactly to prevent state inconsistencies.
            cinematicRef.current.active = false;
            cinematicRef.current.mode = null;

            // 1. Reset Physics to Standard Orientation
            physicsRef.current = {
              theta: Math.PI,
              phi: DEFAULT_VERTICAL_ANGLE,
              thetaVelocity: 0,
              phiVelocity: 0,
              zoomVelocity: 0,
              damping: 0.92,
            };

            // 2. Restore Simulation Params (CRITICAL: Restore autoSpin!)
            setParams((prev) => ({
              ...prev,
              zoom: DEFAULT_ZOOM,
              autoSpin: DEFAULT_AUTO_SPIN,
            }));

            // 3. Sync UI State
            setIsCinematic(false);
            setCinematicMode(null);
            setCameraState({ ...physicsRef.current }); // Force immediate UI consistency
            return;
          }

          // Apply Zoom (Gravity is unstoppable)
          setParams((prev) => ({ ...prev, zoom: Math.max(0.2, newR) }));
        }

        // Apply Damping to allow smooth fighting against the spin
        state.thetaVelocity *= 0.95;
        state.phiVelocity *= 0.95;

        // Use standard integration for camera angle (User Input)
        state.theta += state.thetaVelocity;
        state.phi += state.phiVelocity;

        // Ensure phi stays in bounds
        state.phi = Math.max(0.001, Math.min(Math.PI - 0.001, state.phi));
      } else {
        // --- INTERACTIVE MODE: USER CONTROL ---
        // Apply Drag Inertia / Momentum
        state.thetaVelocity *= state.damping;
        state.phiVelocity *= state.damping;
        state.zoomVelocity *= state.damping;

        state.theta += state.thetaVelocity;
        state.phi += state.phiVelocity;

        // Auto-Spin
        const spinSpeed = paramsRef.current.autoSpin ?? DEFAULT_AUTO_SPIN;
        if (
          !isDragging.current &&
          touchState.current.touches.length === 0 &&
          Math.abs(state.thetaVelocity) < 0.0001
        ) {
          state.theta += spinSpeed;
        }

        // Constraints
        state.phi = Math.max(0.001, Math.min(Math.PI - 0.001, state.phi));
        state.theta = state.theta % (2 * Math.PI);
        if (state.theta < 0) state.theta += 2 * Math.PI;

        // Deadzone
        if (Math.abs(state.thetaVelocity) < 0.00001) state.thetaVelocity = 0;
        if (Math.abs(state.phiVelocity) < 0.00001) state.phiVelocity = 0;
        if (Math.abs(state.zoomVelocity) < 0.00001) state.zoomVelocity = 0;
      }

      // --- Sync to React State ---
      // We only update React state periodically to save render cost,
      // BUT we do it often enough for smooth visual feedback.
      frameCount++;
      if (frameCount >= SYNC_INTERVAL) {
        frameCount = 0;
        setCameraState({ ...state }); // Clone to trigger re-render

        // Zoom sync to Params (Interactive Mode Only)
        // In Cinematic mode, zoom is handled explicitly inside the block above
        if (
          !cinematicRef.current.active &&
          Math.abs(state.zoomVelocity) > 0.0001
        ) {
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

  const stopCinematic = useCallback(() => {
    if (cinematicRef.current.active) {
      // If we are interrupting a DIVE, we must restore the 'autoSpin' that we killed.
      // Otherwise the camera feels "dead" after a dive.
      if (cinematicRef.current.mode === "dive") {
        setParams((prev) => ({ ...prev, autoSpin: DEFAULT_AUTO_SPIN }));
      }

      cinematicRef.current.active = false;
      cinematicRef.current.mode = null;
      setIsCinematic(false);
      setCinematicMode(null);
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isValidNumber(e.clientX) || !isValidNumber(e.clientY)) return;

    // Only stop cinematic if we are NOT in a controlled dive
    // Actually, user wants to CONTROL the dive. So don't stop it.
    if (cinematicRef.current.mode !== "dive") {
      stopCinematic();
    }

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
    stopCinematic();
    physicsRef.current.thetaVelocity += dTheta;
    physicsRef.current.phiVelocity += dPhi;
  };

  const startCinematic = useCallback(
    (mode: "orbit" | "dive") => {
      // 1. Clean up existing state (Force Stop any previous cinematic)
      stopCinematic();

      // 2. Clear interaction state to prevent "Phantom Drag" blocking the animation
      isDragging.current = false;
      touchState.current.touches = [];

      // 3. Clear velocities to prevent "Phantom Momentum" jitter
      physicsRef.current.thetaVelocity = 0;
      physicsRef.current.phiVelocity = 0;
      physicsRef.current.zoomVelocity = 0;

      // 4. Capture current state as start state
      const now = performance.now();
      cinematicRef.current = {
        active: true,
        mode,
        startTime: now,
        lastTime: now,
        startParams: {
          theta: physicsRef.current.theta,
          phi: physicsRef.current.phi,
          zoom: paramsRef.current.zoom,
        },
        velocity: 0, // Initial radial velocity
        angularMomentum: 0, // Calculated below
      };

      if (mode === "dive") {
        // Calculate initial Angular Momentum (L = r^2 * omega)
        // Target: Full rotation in ~30s at start (r=15)
        // omega = 2PI / 30 = ~0.2 rad/s
        const initialOmega = 0.2;
        const r = paramsRef.current.zoom;
        cinematicRef.current.angularMomentum = r * r * initialOmega;

        // Give an initial push towards the black hole
        // Tuned for "Cinematic Realism" - not too fast, not too slow.
        cinematicRef.current.velocity = -1.2;

        // Start slightly ABOVE the disk to avoid clipping/blocking view
        // 0.35 PI is ~63 degrees (Equator is 90/0.5 PI)
        physicsRef.current.phi = Math.PI * 0.35;

        // Align theta to give a dynamic spiral start
        physicsRef.current.theta += Math.PI * 0.25;
      }

      setIsCinematic(true);
      setCinematicMode(mode);

      // Reset any active auto-spin param that might conflict
      // But for Infall, we calculate spin manually.
      if (mode === "dive") {
        setParams((p) => ({ ...p, autoSpin: 0 })); // Disable artificial spin
      }
    },
    [setParams],
  );

  const handleWheel = (e: React.WheelEvent | WheelEvent) => {
    e.preventDefault();
    if (!isValidNumber(e.deltaY)) return;

    // Wheel interrupts cinematic?
    // User wants control. Let's allowing wheel to influence zoom MIGHT break physics.
    // For now, allow it but it might fight the gravity.
    // Actually, in "dive", gravity sets param.zoom directly.
    // So wheel won't do much unless we change how dive works.
    if (cinematicRef.current.mode !== "dive") {
      stopCinematic();
    }

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

    // Only stop cinematic if we are NOT in a controlled dive
    // Match Desktop behavior: Allow user to look around while falling.
    if (cinematicRef.current.mode !== "dive") {
      stopCinematic();
    }

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

  const resetCamera = useCallback(() => {
    // 1. Force Stop Cinematic
    cinematicRef.current.active = false;
    cinematicRef.current.mode = null;
    setIsCinematic(false);
    setCinematicMode(null);

    // 2. Reset Physics State
    physicsRef.current = {
      theta: Math.PI,
      phi: DEFAULT_VERTICAL_ANGLE,
      thetaVelocity: 0,
      phiVelocity: 0,
      zoomVelocity: 0,
      damping: 0.92,
    };

    // 3. Force React State Update (Critical for UI Sync)
    setCameraState({ ...physicsRef.current });

    // 4. Reset Simulation Params (Zoom, AutoSpin)
    setParams((prev) => ({
      ...prev,
      zoom: DEFAULT_ZOOM,
      autoSpin: DEFAULT_AUTO_SPIN, // Ensure autospin is restored if it was killed
    }));
  }, [setParams]);

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
    isCinematic,
    cinematicMode,
  };
}
