/**
 * Accretion disk calculations for black hole simulation
 * These functions provide testable implementations of accretion disk logic
 * that mirrors the shader implementation.
 */

import { calculateISCO } from './kerr-metric';

/**
 * Check if a position is within the accretion disk boundaries
 * Disk extends from ISCO to ~100 Schwarzschild radii
 * 
 * Requirements: 11.1, 11.2
 * 
 * @param radius - Distance from black hole center
 * @param isco - ISCO radius (inner edge)
 * @param schwarzschildRadius - Schwarzschild radius
 * @returns True if position is within disk boundaries
 */
export function isWithinDiskBoundaries(
    radius: number,
    isco: number,
    schwarzschildRadius: number
): boolean {
    const diskOuterEdge = schwarzschildRadius * 100.0;
    return radius >= isco && radius <= diskOuterEdge;
}

/**
 * Calculate disk thickness at a given radius
 * Uses h/r ratio between 0.01-0.1 for thin disk approximation
 * 
 * Requirements: 11.3
 * 
 * @param radius - Distance from black hole center
 * @param thicknessRatio - h/r ratio (default: 0.05)
 * @returns Disk thickness at radius
 */
export function calculateDiskThickness(radius: number, thicknessRatio: number = 0.05): number {
    // Handle edge case: if radius is 0 or negative, return 0
    if (radius <= 0) return 0;

    // Clamp thickness ratio to valid range [0.01, 0.1]
    const clampedRatio = Math.max(0.01, Math.min(0.1, thicknessRatio));
    return radius * clampedRatio;
}

/**
 * Calculate temperature at a given radius in the accretion disk
 * Uses Shakura-Sunyaev disk model: T ∝ r^(-3/4)
 * Temperature increases toward ISCO
 * 
 * Requirements: 11.5
 * 
 * @param radius - Distance from black hole center
 * @param isco - ISCO radius (inner edge)
 * @param diskOuterEdge - Outer edge of disk
 * @param tempMultiplier - Temperature multiplier from UI (default: 1.0)
 * @returns Temperature in Kelvin
 */
export function calculateDiskTemperature(
    radius: number,
    isco: number,
    diskOuterEdge: number,
    tempMultiplier: number = 1.0
): number {
    // Normalize radius to [0, 1] range within disk
    const normalizedRadius = (radius - isco) / (diskOuterEdge - isco);

    // Temperature ranges from ~3000K (outer) to ~20000K (inner)
    const tempOuter = 3000.0;
    const tempInner = 20000.0;

    // Radial temperature profile: T ∝ r^(-3/4)
    // Using power of 0.75 for the normalized radius
    const temperature = tempInner + (tempOuter - tempInner) * Math.pow(normalizedRadius, 0.75);

    // Apply temperature multiplier
    return temperature * tempMultiplier;
}

/**
 * Get disk inner edge radius (ISCO)
 * 
 * Requirements: 11.1
 * 
 * @param mass - Black hole mass
 * @param spin - Spin parameter
 * @returns ISCO radius
 */
export function getDiskInnerEdge(mass: number, spin: number): number {
    return calculateISCO(mass, spin, true); // Prograde orbit
}

/**
 * Get disk outer edge radius (~100 Schwarzschild radii)
 * 
 * Requirements: 11.2
 * 
 * @param schwarzschildRadius - Schwarzschild radius
 * @returns Disk outer edge radius
 */
export function getDiskOuterEdge(schwarzschildRadius: number): number {
    return schwarzschildRadius * 100.0;
}

/**
 * Verify that disk thickness ratio is within valid range
 * 
 * Requirements: 11.3
 * 
 * @param radius - Distance from black hole center
 * @param thickness - Disk thickness at radius
 * @returns True if h/r ratio is in valid range [0.01, 0.1]
 */
export function verifyDiskThicknessRatio(radius: number, thickness: number): boolean {
    if (radius === 0) return false;

    const ratio = thickness / radius;
    // Use small tolerance for floating point comparison
    const tolerance = 1e-10;
    return ratio >= (0.01 - tolerance) && ratio <= (0.1 + tolerance);
}

/**
 * Verify that temperature increases as radius decreases (toward ISCO)
 * 
 * Requirements: 11.5
 * 
 * @param radius1 - First radius (closer to ISCO)
 * @param radius2 - Second radius (farther from ISCO)
 * @param temp1 - Temperature at radius1
 * @param temp2 - Temperature at radius2
 * @returns True if temperature increases toward ISCO
 */
export function verifyTemperatureProfile(
    radius1: number,
    radius2: number,
    temp1: number,
    temp2: number
): boolean {
    // If radius1 < radius2 (closer to ISCO), then temp1 should be >= temp2
    if (radius1 < radius2) {
        return temp1 >= temp2 - 1e-6; // Allow small tolerance for numerical precision
    }
    return true;
}
