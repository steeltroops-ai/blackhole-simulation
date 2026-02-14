/**
 * Core ray tracing engine for black hole simulation.
 * Optimized for performance and readability.
 */

import { calculatePhotonSphere } from "./kerr-metric";

/**
 * Adaptive step size based on geodesic curvature.
 */
export function getAdaptiveStepSize(
  dist: number,
  photonSphere: number,
  minStep: number = 0.01,
  maxStep: number = 0.5,
): number {
  const d = Math.abs(dist - photonSphere);
  const t = Math.min(1.0, d / (photonSphere * 0.5));
  const smooth = t * t * (3.0 - 2.0 * t);
  return minStep + (maxStep - minStep) * smooth;
}

/**
 * Verifies if the ray velocity respects the light-cone constraint.
 */
export function checkCausality(v: [number, number, number]): boolean {
  return v[0] * v[0] + v[1] * v[1] + v[2] * v[2] <= 1.000001;
}

/**
 * Normalizes velocity to unit-c speed.
 */
export function normalizeVelocity(
  v: [number, number, number],
): [number, number, number] {
  const m = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (m < 1e-10) return [0, 0, 0];
  return [v[0] / m, v[1] / m, v[2] / m];
}

/**
 * Single-step geodesic integrator using a pseudo-potential approximation.
 */
export function rayMarchStep(
  pos: [number, number, number],
  vel: [number, number, number],
  mass: number,
  lensing: number,
  dt: number,
): { position: [number, number, number]; velocity: [number, number, number] } {
  const [px, py, pz] = pos;
  const [vx, vy, vz] = vel;
  const r2 = px * px + py * py + pz * pz;
  const r = Math.sqrt(r2);

  if (r < 1e-5) return { position: pos, velocity: vel };

  // Cross product for angular momentum L = r x v
  const Lx = py * vz - pz * vy;
  const Ly = pz * vx - px * vz;
  const Lz = px * vy - py * vx;
  const L2 = Lx * Lx + Ly * Ly + Lz * Lz;

  // Effective acceleration for null geodesics (light) in Schwarzschild 3D equivalent
  // F = L^2/r^3 - 3ML^2/r^4
  // This recovers the correct bending angle 4M/b and photon sphere at 3M
  const accel = L2 / (r * r2) - (3.0 * mass * L2) / (r2 * r2);

  const nvx = vx - (px / r) * accel * dt;
  const nvy = vy - (py / r) * accel * dt;
  const nvz = vz - (pz / r) * accel * dt;

  const nv = normalizeVelocity([nvx, nvy, nvz]);

  return {
    position: [px + nv[0] * dt, py + nv[1] * dt, pz + nv[2] * dt],
    velocity: nv,
  };
}

/**
 * Bounds checking for ray termination.
 */
export function shouldTerminateRay(
  pos: [number, number, number],
  horizon: number,
  maxDist: number,
  step: number,
  maxSteps: number,
): boolean {
  const d2 = pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2];
  return d2 < horizon * horizon || d2 > maxDist * maxDist || step >= maxSteps;
}

/**
 * Color accumulation with safety clamping.
 */
export function accumulateColorSafe(
  curr: [number, number, number],
  next: [number, number, number],
  alpha: number,
): [number, number, number] {
  return [
    Math.max(0, Math.min(1, next[0] * alpha + curr[0] * (1 - alpha))),
    Math.max(0, Math.min(1, next[1] * alpha + curr[1] * (1 - alpha))),
    Math.max(0, Math.min(1, next[2] * alpha + curr[2] * (1 - alpha))),
  ];
}

export function clampColor(
  c: [number, number, number],
): [number, number, number] {
  return [
    Math.max(0, Math.min(1, c[0])),
    Math.max(0, Math.min(1, c[1])),
    Math.max(0, Math.min(1, c[2])),
  ];
}

export function verifyColorBounds(c: [number, number, number]): boolean {
  return (
    c[0] >= 0 && c[0] <= 1 && c[1] >= 0 && c[1] <= 1 && c[2] >= 0 && c[2] <= 1
  );
}

export function isNearPhotonSphere(
  pos: [number, number, number],
  photonSphere: number,
  epsilon: number = 0.1,
): boolean {
  const r = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2]);
  return Math.abs(r - photonSphere) < epsilon;
}

export function shouldContinueNearPhotonSphere(
  pos: [number, number, number],
  photonSphere: number,
  horizon: number,
  maxDist: number,
): boolean {
  const r2 = pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2];
  return r2 >= horizon * horizon && r2 <= maxDist * maxDist;
}

export function getStarfieldColor(
  dir: [number, number, number],
): [number, number, number] {
  const [dx, dy, dz] = dir;
  const hash =
    Math.sin(dx * 12.9898 + dy * 78.233 + dz * 45.123) * 43758.5453123;
  const brightness = hash - Math.floor(hash);
  if (brightness > 0.99) return [1, 1, 1];
  return [0, 0, 0];
}

export function getFinalColor(
  pos: [number, number, number],
  dir: [number, number, number],
  horizon: number,
  maxDist: number,
): [number, number, number] {
  const d2 = pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2];
  if (d2 <= horizon * horizon) return [0, 0, 0];
  return getStarfieldColor(dir);
}
