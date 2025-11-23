/**
 * Relativistic physics calculations for black hole simulations.
 * Includes Doppler effects, orbital velocities, and Lorentz transformations.
 */

import { SPEED_OF_LIGHT, GRAVITATIONAL_CONSTANT } from './constants';

/**
 * Calculate the relativistic Doppler factor.
 * 
 * The Doppler factor describes how light from a moving source is shifted in frequency
 * and intensity. Formula: δ = 1/(γ(1 - β·cosθ))
 * where:
 * - γ = Lorentz factor = 1/√(1 - β²)
 * - β = v/c (velocity as fraction of speed of light)
 * - θ = angle between velocity vector and line of sight
 * 
 * @param velocity - Velocity as fraction of speed of light, range [-1, 1]
 * @param angle - Angle in radians between velocity and line of sight (0 = toward observer)
 * @returns Doppler factor δ
 * 
 * @example
 * const delta = calculateDopplerFactor(0.5, 0); // Material moving toward observer at 0.5c
 */
export function calculateDopplerFactor(velocity: number, angle: number): number {
    // Clamp velocity to valid range (must be less than speed of light)
    const beta = Math.max(-0.99, Math.min(0.99, velocity));

    // Calculate Lorentz factor: γ = 1/√(1 - β²)
    const gamma = calculateLorentzFactor(beta);

    // Doppler factor: δ = 1/(γ(1 - β·cosθ))
    const delta = 1 / (gamma * (1 - beta * Math.cos(angle)));

    return delta;
}

/**
 * Calculate Keplerian orbital velocity at a given radius.
 * 
 * For a test particle in a circular orbit around a massive object,
 * the orbital velocity is given by: v = √(GM/r)
 * 
 * @param radius - Orbital radius in simulation units
 * @param mass - Central mass in simulation units (solar masses)
 * @returns Orbital velocity as fraction of speed of light
 * 
 * @example
 * const v = calculateOrbitalVelocity(10, 1.2); // Velocity at radius 10 around 1.2 solar mass BH
 */
export function calculateOrbitalVelocity(radius: number, mass: number): number {
    // In simulation units where G=c=1 and mass is in solar masses
    // v = √(GM/r) = √(M/r) in geometric units

    // Convert to simulation units
    // For simplicity, we use: v/c = √(M/r) where M is in units of r_g = GM/c²
    const rg = mass * 0.5; // Schwarzschild radius / 2

    // Keplerian velocity: v/c = √(r_g/r)
    const velocityFraction = Math.sqrt(rg / radius);

    // Clamp to valid range (must be less than speed of light)
    return Math.min(0.99, velocityFraction);
}

/**
 * Calculate the Lorentz factor (gamma) for a given velocity.
 * 
 * The Lorentz factor describes time dilation and length contraction in special relativity.
 * Formula: γ = 1/√(1 - β²) where β = v/c
 * 
 * @param velocity - Velocity as fraction of speed of light, range [-1, 1]
 * @returns Lorentz factor γ (always ≥ 1)
 * 
 * @example
 * const gamma = calculateLorentzFactor(0.5); // γ ≈ 1.155 for v = 0.5c
 */
export function calculateLorentzFactor(velocity: number): number {
    // Clamp velocity to valid range
    const beta = Math.max(-0.99, Math.min(0.99, velocity));

    // Lorentz factor: γ = 1/√(1 - β²)
    const beta2 = beta * beta;
    const gamma = 1 / Math.sqrt(1 - beta2);

    return gamma;
}
