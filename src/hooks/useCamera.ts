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
  // Recovery phase: smooth interpolation back to origin after cinematic ends
  recovering: boolean;
  recoverStartTime: number;
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

import { physicsBridge } from "@/engine/physics-bridge";

/**
 * Custom hook for enhanced camera control interactions
 * Now featuring "Cinematic Engineering" Grade Orbit & Infall
 */
export function useCamera(
  params: SimulationParams,
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>,
) {
  // Sync auto-spin state to physics bridge
  useEffect(() => {
    physicsBridge.setAutoSpin(!!params.autoSpin);
  }, [params.autoSpin]);

  // --- Source of Truth: Physics Ref ---
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
    recovering: false,
    recoverStartTime: 0,
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

      // PAUSE GUARD: Skip all physics when simulation is paused
      const isPaused = paramsRef.current.paused;
      if (isPaused) {
        // Still schedule next frame so loop doesn't die
        animationFrameId = requestAnimationFrame(applyMomentum);
        return;
      }

      // --- RECOVERY PHASE: Smooth emergence back to pre-cinematic position ---
      // Like waking from a dream -- initially fast pullback, then gentle settling.
      if (cinematicRef.current.recovering) {
        const RECOVER_DURATION = 3.5; // seconds (longer = more dramatic)
        const elapsed = (now - cinematicRef.current.recoverStartTime) * 0.001;
        const progress = Math.min(elapsed / RECOVER_DURATION, 1.0);

        // Quartic ease-out: stronger initial pull, very gentle deceleration
        const ease = 1.0 - Math.pow(1.0 - progress, 4);

        const target = cinematicRef.current.startParams;

        // Accelerating convergence rate
        const lerpRate = 0.05 + ease * 0.06;
        state.theta += (target.theta - state.theta) * lerpRate;
        state.phi += (target.phi - state.phi) * lerpRate;

        // Interpolate zoom
        const currentZoom = paramsRef.current.zoom;
        const zoomDelta = (target.zoom - currentZoom) * lerpRate;
        if (Math.abs(zoomDelta) > 0.001) {
          setParams((prev) => ({ ...prev, zoom: prev.zoom + zoomDelta }));
        }

        // Check if recovery is complete
        const thetaDist = Math.abs(target.theta - state.theta);
        const phiDist = Math.abs(target.phi - state.phi);
        const zoomDist = Math.abs(target.zoom - paramsRef.current.zoom);

        if (
          (thetaDist < 0.01 && phiDist < 0.01 && zoomDist < 0.1) ||
          progress >= 1.0
        ) {
          state.theta = target.theta;
          state.phi = target.phi;
          cinematicRef.current.recovering = false;
          setParams((prev) => ({
            ...prev,
            zoom: target.zoom,
            autoSpin: DEFAULT_AUTO_SPIN,
          }));
        }

        state.phi = Math.max(0.001, Math.min(Math.PI - 0.001, state.phi));
      } else if (cinematicRef.current.active && cinematicRef.current.mode) {
        // --- CINEMATIC MODE: DIRECTOR'S CUT ---
        const t = (now - cinematicRef.current.startTime) * 0.001;

        if (cinematicRef.current.mode === "orbit") {
          // ============================================================
          //  ORBIT TOUR: "THE GRAND SURVEY"
          //  4-Act cinematic orbit with Keplerian speed variation,
          //  dramatic vertical sweeps, and zoom breathing.
          // ============================================================
          const ORBIT_MAX_DURATION = 120.0;
          if (t > ORBIT_MAX_DURATION) {
            cinematicRef.current.active = false;
            cinematicRef.current.mode = null;
            cinematicRef.current.recovering = true;
            cinematicRef.current.recoverStartTime = now;
            setIsCinematic(false);
            setCinematicMode(null);
          } else {
            // --- Act boundaries ---
            const ACT1_END = 15.0; // The Reveal
            const ACT2_END = 45.0; // The Descent & Sweep
            const ACT3_END = 75.0; // The Close Pass
            // ACT4: 75 - 120       // The Contemplation

            // --- Smooth blending function ---
            // Hermite smoothstep for act transitions (no pops or sudden changes)
            const smoothstep = (edge0: number, edge1: number, x: number) => {
              const v = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
              return v * v * (3 - 2 * v);
            };

            // --- Target Distance (Zoom) ---
            // Each act has a characteristic distance. We crossfade between them.
            let targetDist: number;
            let targetPhi: number;
            let orbitSpeed: number;

            const mass = paramsRef.current.mass;
            const minSafe = Math.max(15.0, mass * 3.5);

            if (t < ACT1_END) {
              // ACT 1: THE REVEAL -- Pull back to wide establishing shot
              // Camera rises above the disk (low phi = looking down)
              const actProgress = t / ACT1_END;
              const easeIn = smoothstep(0, 1, actProgress);

              // Zoom out from current to a commanding wide shot
              targetDist = minSafe + 18.0 + easeIn * 8.0; // ~33 -> 41 Rs
              // Rise above the disk: from default angle toward ~70 deg (more overhead)
              const overheadAngle = (70 * Math.PI) / 180;
              targetPhi =
                DEFAULT_VERTICAL_ANGLE +
                (overheadAngle - DEFAULT_VERTICAL_ANGLE) * easeIn;
              // Slow, majestic rotation
              orbitSpeed = 0.15 + easeIn * 0.1; // 0.15 -> 0.25 rad/s
            } else if (t < ACT2_END) {
              // ACT 2: THE DESCENT & SWEEP -- Drop back to disk level, speed up
              const actProgress = (t - ACT1_END) / (ACT2_END - ACT1_END);
              const ease = smoothstep(0, 1, actProgress);

              // Come closer and back to disk plane
              targetDist = minSafe + 18.0 - ease * 10.0; // 41 -> 23 Rs
              // Descend back toward equatorial view
              const overheadAngle = (70 * Math.PI) / 180;
              targetPhi =
                overheadAngle + (DEFAULT_VERTICAL_ANGLE - overheadAngle) * ease;
              // Speed up as we get closer (Kepler's 2nd law feel)
              orbitSpeed = 0.25 + ease * 0.3; // 0.25 -> 0.55 rad/s
            } else if (t < ACT3_END) {
              // ACT 3: THE CLOSE PASS -- Skim near the photon sphere
              const actProgress = (t - ACT2_END) / (ACT3_END - ACT2_END);

              // Elliptical path: close periapsis at center of act, wider at edges
              // Use a smooth pulse that dips close then pulls back
              const periapsisPhase = Math.sin(actProgress * Math.PI); // 0->1->0
              targetDist = minSafe + 8.0 - periapsisPhase * 6.0; // 23 -> 17 -> 23
              // Slight dip below equatorial for drama, then back
              const equatorialTilt = (3 * Math.PI) / 180;
              targetPhi =
                DEFAULT_VERTICAL_ANGLE -
                equatorialTilt * Math.sin(actProgress * Math.PI * 2);
              // Fastest at periapsis (whip effect)
              orbitSpeed = 0.55 + periapsisPhase * 0.35; // 0.55 -> 0.90 -> 0.55
            } else {
              // ACT 4: THE CONTEMPLATION -- Wide, reverent, slow
              const actProgress =
                (t - ACT3_END) / (ORBIT_MAX_DURATION - ACT3_END);
              const ease = smoothstep(0, 1, actProgress);

              // Pull way back for the "big picture" moment
              targetDist = minSafe + 10.0 + ease * 18.0; // 25 -> 43 Rs
              // Gentle rise for a slightly elevated perspective
              const contemplativeAngle = (85 * Math.PI) / 180;
              targetPhi =
                DEFAULT_VERTICAL_ANGLE +
                (contemplativeAngle - DEFAULT_VERTICAL_ANGLE) * ease * 0.5;
              // Decelerate to a meditative pace
              orbitSpeed = 0.55 - ease * 0.35; // 0.55 -> 0.20 rad/s
            }

            // --- Apply with smooth interpolation (no pops) ---
            const currentZoom = paramsRef.current.zoom;
            const zoomLerp = currentZoom + (targetDist - currentZoom) * 0.025;
            if (Math.abs(zoomLerp - currentZoom) > 0.001) {
              setParams((prev) => ({ ...prev, zoom: zoomLerp }));
            }

            // Subtle "breathing" -- micro zoom oscillation for organic feel
            const breathe = Math.sin(t * 0.7) * 0.3;

            // "Handheld" micro-wobble (2-axis) for realism
            const wobbleX =
              Math.sin(t * 0.31) * 0.008 + Math.cos(t * 0.17) * 0.005;
            const wobbleY =
              Math.cos(t * 0.23) * 0.006 + Math.sin(t * 0.41) * 0.004;

            if (
              !isDragging.current &&
              touchState.current.touches.length === 0
            ) {
              // Smooth phi tracking with wobble
              state.phi += (targetPhi + wobbleY - state.phi) * 0.018;
              // Orbit rotation with Keplerian speed variation
              state.theta += dt * orbitSpeed + wobbleX;
            }

            // Apply breathing to zoom
            if (Math.abs(breathe) > 0.01) {
              setParams((prev) => ({
                ...prev,
                zoom: Math.max(minSafe, prev.zoom + breathe * 0.01),
              }));
            }
          }
        } else if (cinematicRef.current.mode === "dive") {
          // ============================================================
          //  INFALL DIVE: "THE DESCENT INTO GARGANTUA"
          //  3-Act geodesic plunge with dramatic pacing.
          //  Act 1: The Hesitation (0-8s) -- Deep breath before the fall
          //  Act 2: The Commitment (8-20s) -- Point of no return
          //  Act 3: The Maelstrom (20s+) -- Physics takes over
          // ============================================================
          const r = paramsRef.current.zoom;

          // --- Act-dependent gravity ---
          // Each act has escalating gravitational intensity.
          // This creates the "Nolan pacing" -- deliberate, then overwhelming.
          const ACT1_END = 8.0;
          const ACT2_END = 20.0;

          let gravityScale: number;
          let phiDriftRate: number; // How fast camera aligns to equatorial
          let thetaWobble: number; // Organic camera shake

          if (t < ACT1_END) {
            // ACT 1: THE HESITATION
            // Almost no gravity. Camera floats. You feel weightless.
            // A slight pull-back even, for the "establishing wide."
            const actProgress = t / ACT1_END;
            gravityScale = 3.0 + actProgress * 3.0; // 3 -> 6 (gentle)
            phiDriftRate = 0.05; // Very slow tilt

            // Subtle "last look" wobble -- the camera is studying the black hole
            thetaWobble = Math.sin(t * 0.4) * 0.003;
          } else if (t < ACT2_END) {
            // ACT 2: THE COMMITMENT
            // Gravity becomes real. The spiral tightens. No turning back.
            const actProgress = (t - ACT1_END) / (ACT2_END - ACT1_END);
            gravityScale = 6.0 + actProgress * 12.0; // 6 -> 18
            phiDriftRate = 0.1 + actProgress * 0.15; // Accelerating tilt

            // Growing unease - camera vibration increases
            thetaWobble = Math.sin(t * 0.8) * 0.005 * (1 + actProgress);
          } else {
            // ACT 3: THE MAELSTROM
            // Full Newtonian fury. The vortex consumes everything.
            // Gravity is overwhelming. Spin is frantic.
            const actDuration = t - ACT2_END;
            const intensity = Math.min(actDuration * 0.15, 1.0); // Ramps over ~7s
            gravityScale = 18.0 + intensity * 20.0; // 18 -> 38
            phiDriftRate = 0.25 + intensity * 0.25; // Fast equatorial lock

            // Violent camera shake near the horizon
            const shakeIntensity = 0.008 + intensity * 0.015;
            thetaWobble =
              Math.sin(t * 2.1) * shakeIntensity +
              Math.cos(t * 3.7) * shakeIntensity * 0.6;
          }

          // --- Radial Physics ---
          const gravity = -gravityScale / (r * r + 0.1);
          cinematicRef.current.velocity += gravity * dt;
          const newR = r + cinematicRef.current.velocity * dt;

          // --- Angular Physics (Conservation of Momentum: L = r^2 * omega) ---
          const L = cinematicRef.current.angularMomentum;
          const omegaProp = L / (newR * newR + 0.1);
          state.theta += omegaProp * dt + thetaWobble;

          // --- Inclination: Drift toward equatorial plane ---
          const distToEquator = Math.PI * 0.5 - state.phi;
          state.phi += distToEquator * dt * phiDriftRate;

          // Subtle phi wobble for "tumbling through spacetime" feel
          if (t > ACT2_END) {
            const phiWobble =
              Math.sin(t * 1.7) * 0.004 + Math.cos(t * 2.9) * 0.003;
            state.phi += phiWobble;
          }

          // --- HORIZON CROSSING LOGIC ---
          if (newR < 2.0) {
            // Horizon crossing -> Begin smooth recovery to pre-dive position
            cinematicRef.current.active = false;
            cinematicRef.current.mode = null;
            cinematicRef.current.velocity = 0;
            cinematicRef.current.angularMomentum = 0;
            cinematicRef.current.recovering = true;
            cinematicRef.current.recoverStartTime = now;

            // Clear velocities so recovery isn't fighting residual momentum
            state.thetaVelocity = 0;
            state.phiVelocity = 0;
            state.zoomVelocity = 0;

            // Restore autoSpin and unpause
            setParams((prev) => ({
              ...prev,
              autoSpin: DEFAULT_AUTO_SPIN,
              paused: false,
            }));

            // Sync UI State
            setIsCinematic(false);
            setCinematicMode(null);
          } else {
            // Apply Zoom (only during active dive)
            setParams((prev) => ({ ...prev, zoom: Math.max(0.2, newR) }));
          }
        }

        // Apply Damping for user input during cinematic
        state.thetaVelocity *= 0.95;
        state.phiVelocity *= 0.95;

        state.theta += state.thetaVelocity;
        state.phi += state.phiVelocity;

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
    if (cinematicRef.current.active || cinematicRef.current.recovering) {
      // Restore autoSpin if we killed it for a dive
      if (cinematicRef.current.mode === "dive") {
        setParams((prev) => ({ ...prev, autoSpin: DEFAULT_AUTO_SPIN }));
      }

      cinematicRef.current.active = false;
      cinematicRef.current.mode = null;
      cinematicRef.current.recovering = false;
      setIsCinematic(false);
      setCinematicMode(null);
    }
  }, [setParams]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
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
    },
    [stopCinematic],
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
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
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const nudgeCamera = useCallback(
    (dTheta: number, dPhi: number) => {
      stopCinematic();
      physicsRef.current.thetaVelocity += dTheta;
      physicsRef.current.phiVelocity += dPhi;
    },
    [stopCinematic],
  );

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
        velocity: 0,
        angularMomentum: 0,
        recovering: false,
        recoverStartTime: 0,
      };

      if (mode === "dive") {
        // Angular Momentum: L = r^2 * omega
        // omega ~0.3 for a wide, dramatic spiral
        const initialOmega = 0.3;
        const r = paramsRef.current.zoom;
        cinematicRef.current.angularMomentum = r * r * initialOmega;

        // Barely a nudge inward. Act 1 ("The Hesitation") handles the
        // slow buildup. This just tips you over the edge.
        cinematicRef.current.velocity = -0.15;

        // Start above the disk for the establishing wide shot.
        // ~54 degrees from pole -> looking down at the disk
        physicsRef.current.phi = Math.PI * 0.3;

        // Offset theta for a dynamic spiral entry
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
    [setParams, stopCinematic],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent | WheelEvent) => {
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
    },
    [setParams, stopCinematic],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent | TouchEvent) => {
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
    },
    [stopCinematic],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent | TouchEvent) => {
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
    },
    [setParams],
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent | TouchEvent) => {
    e.preventDefault();
    const touches = Array.from(e.touches) as React.Touch[];
    touchState.current.touches = touches;
    if (touches.length === 0) {
      touchState.current.initialDistance = 0;
      touchState.current.initialAngle = 0;
    }
  }, []);

  const resetCamera = useCallback(() => {
    // 1. Force Stop Cinematic (Full cleanup)
    cinematicRef.current.active = false;
    cinematicRef.current.mode = null;
    cinematicRef.current.velocity = 0;
    cinematicRef.current.angularMomentum = 0;
    cinematicRef.current.recovering = false; // Cancel any recovery in progress
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

    // 4. Reset Simulation Params (Zoom, AutoSpin, Pause)
    setParams((prev) => ({
      ...prev,
      zoom: DEFAULT_ZOOM,
      autoSpin: DEFAULT_AUTO_SPIN,
      paused: false, // Guarantee simulation runs after reset
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
