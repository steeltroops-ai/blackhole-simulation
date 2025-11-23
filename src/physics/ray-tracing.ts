/**
 * Ray tracing utilities for black hole simulation
 * These functions provide testable implementations of ray tracing logic
 * that mirrors the shader implementation.
 */

import { calculatePhotonSphere } from './kerr-metric';

/**
 * Calculate adaptive step size based on distance from photon sphere
 * Smaller steps near the photon sphere for accuracy
 * Larger steps far away for performance
 * 
 * Requirements: 7.4
 * 
 * @param dist - Current distance from black hole center
 * @param photonSphere - Photon sphere radius
 * @param minStepSize - Minimum step size (default: 0.01)
 * @param maxStepSize - Maximum step size (default: 0.5)
 * @returns Adaptive step size
 */
export function getAdaptiveStepSize(
    dist: number,
    photonSphere: number,
    minStepSize: number = 0.01,
    maxStepSize: number = 0.5
): number {
    // Distance from photon sphere
    const distFromPhotonSphere = Math.abs(dist - photonSphere);

    // Near photon sphere: use smaller steps for precision
    // Far from photon sphere: use larger steps for performance
    // Use smoothstep for smooth interpolation
    const t = Math.min(1, distFromPhotonSphere / (photonSphere * 0.5));
    const smoothT = t * t * (3 - 2 * t); // smoothstep function

    const stepSize = minStepSize + (maxStepSize - minStepSize) * smoothT;

    return stepSize;
}

/**
 * Check if a ray velocity is within causality bounds (not faster than light)
 * In simulation units where c=1, velocity magnitude should not exceed 1
 * 
 * Requirements: 2.1
 * 
 * @param velocity - Ray velocity vector [x, y, z]
 * @returns True if velocity respects causality (|v| <= c)
 */
export function checkCausality(velocity: [number, number, number]): boolean {
    const [vx, vy, vz] = velocity;
    const speedSquared = vx * vx + vy * vy + vz * vz;

    // In simulation units, speed of light c = 1
    // Allow small tolerance for numerical precision
    return speedSquared <= 1.0 + 1e-6;
}

/**
 * Normalize a velocity vector to ensure it doesn't exceed speed of light
 * This is what happens in the shader after applying gravitational force
 * 
 * @param velocity - Velocity vector [x, y, z]
 * @returns Normalized velocity vector
 */
export function normalizeVelocity(velocity: [number, number, number]): [number, number, number] {
    const [vx, vy, vz] = velocity;
    const magnitude = Math.sqrt(vx * vx + vy * vy + vz * vz);

    // Handle zero or near-zero vectors
    if (magnitude < 1e-10) {
        return [0, 0, 0];
    }

    // Normalize to unit length (speed of light in simulation units)
    return [vx / magnitude, vy / magnitude, vz / magnitude];
}

/**
 * Simulate one step of ray marching with gravitational lensing
 * Returns the new position and velocity after applying gravitational force
 * 
 * @param position - Current ray position [x, y, z]
 * @param velocity - Current ray velocity [x, y, z]
 * @param mass - Black hole mass
 * @param lensingStrength - Lensing strength multiplier
 * @param dt - Time step
 * @returns New position and velocity
 */
export function rayMarchStep(
    position: [number, number, number],
    velocity: [number, number, number],
    mass: number,
    lensingStrength: number,
    dt: number
): { position: [number, number, number]; velocity: [number, number, number] } {
    const [px, py, pz] = position;
    const [vx, vy, vz] = velocity;

    // Calculate distance from black hole center
    const dist = Math.sqrt(px * px + py * py + pz * pz);

    if (dist === 0) {
        return { position, velocity };
    }

    // Gravitational force direction (toward center)
    const forceDir: [number, number, number] = [-px / dist, -py / dist, -pz / dist];

    // Force magnitude: F = (mass * lensingStrength) / dist^2
    const forceMagnitude = (mass * 0.9 * lensingStrength) / (dist * dist);

    // Apply force to velocity
    const newVx = vx + forceDir[0] * forceMagnitude * dt;
    const newVy = vy + forceDir[1] * forceMagnitude * dt;
    const newVz = vz + forceDir[2] * forceMagnitude * dt;

    // Normalize velocity to respect causality
    const newVelocity = normalizeVelocity([newVx, newVy, newVz]);

    // Update position
    const newPosition: [number, number, number] = [
        px + newVelocity[0] * dt,
        py + newVelocity[1] * dt,
        pz + newVelocity[2] * dt,
    ];

    return { position: newPosition, velocity: newVelocity };
}

/**
 * Check if ray tracing should terminate
 * Returns true if ray has crossed event horizon, exceeded max distance, or reached max steps
 * 
 * Requirements: 2.5
 * 
 * @param position - Current ray position [x, y, z]
 * @param eventHorizon - Event horizon radius
 * @param maxDistance - Maximum ray tracing distance
 * @param currentStep - Current step number
 * @param maxSteps - Maximum number of steps
 * @returns True if ray tracing should terminate
 */
export function shouldTerminateRay(
    position: [number, number, number],
    eventHorizon: number,
    maxDistance: number,
    currentStep: number,
    maxSteps: number
): boolean {
    const [px, py, pz] = position;
    const dist = Math.sqrt(px * px + py * py + pz * pz);

    // Terminate if crossed event horizon
    if (dist < eventHorizon) {
        return true;
    }

    // Terminate if exceeded max distance
    if (dist > maxDistance) {
        return true;
    }

    // Terminate if reached max steps
    if (currentStep >= maxSteps) {
        return true;
    }

    return false;
}

/**
 * Clamp RGB color components to valid range [0, 1]
 * 
 * @param color - RGB color [r, g, b]
 * @returns Clamped color
 */
export function clampColor(color: [number, number, number]): [number, number, number] {
    return [
        Math.max(0, Math.min(1, color[0])),
        Math.max(0, Math.min(1, color[1])),
        Math.max(0, Math.min(1, color[2])),
    ];
}

/**
 * Check if a ray is near the photon sphere
 * 
 * Requirements: 10.2
 * 
 * @param position - Current ray position [x, y, z]
 * @param photonSphere - Photon sphere radius
 * @param threshold - Distance threshold to consider "near" (default: 0.1 * photonSphere)
 * @returns True if ray is near photon sphere
 */
export function isNearPhotonSphere(
    position: [number, number, number],
    photonSphere: number,
    threshold?: number
): boolean {
    const [px, py, pz] = position;
    const dist = Math.sqrt(px * px + py * py + pz * pz);
    const thresholdDist = threshold ?? photonSphere * 0.1;

    return Math.abs(dist - photonSphere) < thresholdDist;
}

/**
 * Check if ray should continue tracing near photon sphere
 * Ray should continue until it escapes or crosses event horizon
 * 
 * Requirements: 10.2
 * 
 * @param position - Current ray position [x, y, z]
 * @param photonSphere - Photon sphere radius
 * @param eventHorizon - Event horizon radius
 * @param maxDistance - Maximum ray tracing distance
 * @returns True if ray should continue tracing
 */
export function shouldContinueNearPhotonSphere(
    position: [number, number, number],
    photonSphere: number,
    eventHorizon: number,
    maxDistance: number
): boolean {
    const [px, py, pz] = position;
    const dist = Math.sqrt(px * px + py * py + pz * pz);

    // Continue if near photon sphere and not crossed horizon or max distance
    if (isNearPhotonSphere(position, photonSphere)) {
        return dist >= eventHorizon && dist <= maxDistance;
    }

    return true; // Not near photon sphere, normal continuation rules apply
}

/**
 * Verify color accumulation is bounded
 * All RGB components should remain in [0, 1] range
 * 
 * Requirements: 10.3
 * 
 * @param color - RGB color [r, g, b]
 * @returns True if all components are in valid range
 */
export function verifyColorBounds(color: [number, number, number]): boolean {
    const [r, g, b] = color;
    return r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1;
}

/**
 * Accumulate color with overflow prevention
 * Clamps result to valid range [0, 1]
 * 
 * Requirements: 10.3
 * 
 * @param currentColor - Current accumulated color [r, g, b]
 * @param newColor - New color to add [r, g, b]
 * @param opacity - Opacity of new color [0, 1]
 * @returns Accumulated color with overflow prevention
 */
export function accumulateColorSafe(
    currentColor: [number, number, number],
    newColor: [number, number, number],
    opacity: number
): [number, number, number] {
    const [cr, cg, cb] = currentColor;
    const [nr, ng, nb] = newColor;

    // Alpha blending
    const r = nr * opacity + cr * (1 - opacity);
    const g = ng * opacity + cg * (1 - opacity);
    const b = nb * opacity + cb * (1 - opacity);

    // Clamp to prevent overflow
    return [
        Math.max(0, Math.min(1, r)),
        Math.max(0, Math.min(1, g)),
        Math.max(0, Math.min(1, b)),
    ];
}

/**
 * Get starfield color for a ray direction
 * This is a simplified version for testing
 * 
 * Requirements: 10.4
 * 
 * @param direction - Ray direction [x, y, z]
 * @returns Starfield color [r, g, b]
 */
export function getStarfieldColor(direction: [number, number, number]): [number, number, number] {
    // Simplified starfield - just return a dim color
    // In the actual shader, this would be more complex
    return [0.01, 0.01, 0.01];
}

/**
 * Determine final color based on ray termination condition
 * 
 * Requirements: 10.4, 10.5
 * 
 * @param position - Final ray position [x, y, z]
 * @param direction - Ray direction [x, y, z]
 * @param eventHorizon - Event horizon radius
 * @param maxDistance - Maximum ray tracing distance
 * @returns Final color [r, g, b]
 */
export function getFinalColor(
    position: [number, number, number],
    direction: [number, number, number],
    eventHorizon: number,
    maxDistance: number
): [number, number, number] {
    const [px, py, pz] = position;
    const dist = Math.sqrt(px * px + py * py + pz * pz);

    // Requirement 10.5: Return black when crossing event horizon
    if (dist <= eventHorizon) {
        return [0, 0, 0];
    }

    // Requirement 10.4: Return starfield color at maximum distance
    if (dist >= maxDistance) {
        return getStarfieldColor(direction);
    }

    // Default: return starfield
    return getStarfieldColor(direction);
}
