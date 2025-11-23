/**
 * Unit conversion utilities for displaying physical quantities in appropriate units
 * Ensures dimensional consistency across the simulation
 */

import {
    SPEED_OF_LIGHT,
    GRAVITATIONAL_CONSTANT,
    SOLAR_MASS,
    SCHWARZSCHILD_RADIUS_SOLAR,
} from '@/physics/constants';

/**
 * Convert mass from solar masses to kilograms
 * 
 * @param massInSolarMasses - Mass in solar masses (M☉)
 * @returns Mass in kilograms
 */
export function solarMassToKg(massInSolarMasses: number): number {
    return massInSolarMasses * SOLAR_MASS;
}

/**
 * Convert mass from kilograms to solar masses
 * 
 * @param massInKg - Mass in kilograms
 * @returns Mass in solar masses (M☉)
 */
export function kgToSolarMass(massInKg: number): number {
    return massInKg / SOLAR_MASS;
}

/**
 * Calculate Schwarzschild radius for a given mass
 * Formula: r_s = 2GM/c²
 * 
 * @param massInSolarMasses - Mass in solar masses (M☉)
 * @returns Schwarzschild radius in meters
 */
export function calculateSchwarzschildRadius(massInSolarMasses: number): number {
    return massInSolarMasses * SCHWARZSCHILD_RADIUS_SOLAR;
}

/**
 * Convert distance from Schwarzschild radii to meters
 * 
 * @param distanceInRs - Distance in Schwarzschild radii
 * @param massInSolarMasses - Black hole mass in solar masses (M☉)
 * @returns Distance in meters
 */
export function schwarzschildRadiiToMeters(
    distanceInRs: number,
    massInSolarMasses: number
): number {
    const rs = calculateSchwarzschildRadius(massInSolarMasses);
    return distanceInRs * rs;
}

/**
 * Convert distance from meters to Schwarzschild radii
 * 
 * @param distanceInMeters - Distance in meters
 * @param massInSolarMasses - Black hole mass in solar masses (M☉)
 * @returns Distance in Schwarzschild radii
 */
export function metersToSchwarzschildRadii(
    distanceInMeters: number,
    massInSolarMasses: number
): number {
    const rs = calculateSchwarzschildRadius(massInSolarMasses);
    return distanceInMeters / rs;
}

/**
 * Convert distance from Schwarzschild radii to kilometers
 * 
 * @param distanceInRs - Distance in Schwarzschild radii
 * @param massInSolarMasses - Black hole mass in solar masses (M☉)
 * @returns Distance in kilometers
 */
export function schwarzschildRadiiToKm(
    distanceInRs: number,
    massInSolarMasses: number
): number {
    return schwarzschildRadiiToMeters(distanceInRs, massInSolarMasses) / 1000;
}

/**
 * Convert distance from kilometers to Schwarzschild radii
 * 
 * @param distanceInKm - Distance in kilometers
 * @param massInSolarMasses - Black hole mass in solar masses (M☉)
 * @returns Distance in Schwarzschild radii
 */
export function kmToSchwarzschildRadii(
    distanceInKm: number,
    massInSolarMasses: number
): number {
    return metersToSchwarzschildRadii(distanceInKm * 1000, massInSolarMasses);
}

/**
 * Convert velocity from meters per second to fraction of speed of light
 * 
 * @param velocityInMs - Velocity in meters per second
 * @returns Velocity as fraction of speed of light (c)
 */
export function msToSpeedOfLight(velocityInMs: number): number {
    return velocityInMs / SPEED_OF_LIGHT;
}

/**
 * Convert velocity from fraction of speed of light to meters per second
 * 
 * @param velocityInC - Velocity as fraction of speed of light (c)
 * @returns Velocity in meters per second
 */
export function speedOfLightToMs(velocityInC: number): number {
    return velocityInC * SPEED_OF_LIGHT;
}

/**
 * Temperature is already in Kelvin in the simulation, so this is an identity function
 * Included for API completeness and future extensibility
 * 
 * @param tempK - Temperature in Kelvin
 * @returns Temperature in Kelvin
 */
export function kelvinToKelvin(tempK: number): number {
    return tempK;
}

/**
 * Format mass for display with appropriate unit
 * 
 * @param massInSolarMasses - Mass in solar masses (M☉)
 * @param precision - Number of decimal places (default: 2)
 * @returns Formatted string with unit
 */
export function formatMass(massInSolarMasses: number, precision: number = 2): string {
    return `${massInSolarMasses.toFixed(precision)} M☉`;
}

/**
 * Format distance for display with appropriate unit
 * Uses Schwarzschild radii for distances < 1000 Rs, kilometers otherwise
 * 
 * @param distanceInRs - Distance in Schwarzschild radii
 * @param massInSolarMasses - Black hole mass in solar masses (M☉)
 * @param precision - Number of decimal places (default: 2)
 * @returns Formatted string with unit
 */
export function formatDistance(
    distanceInRs: number,
    massInSolarMasses: number,
    precision: number = 2
): string {
    if (distanceInRs < 1000) {
        return `${distanceInRs.toFixed(precision)} Rs`;
    } else {
        const km = schwarzschildRadiiToKm(distanceInRs, massInSolarMasses);
        return `${km.toFixed(precision)} km`;
    }
}

/**
 * Format temperature for display with unit
 * 
 * @param tempK - Temperature in Kelvin
 * @param precision - Number of decimal places (default: 0)
 * @returns Formatted string with unit
 */
export function formatTemperature(tempK: number, precision: number = 0): string {
    return `${tempK.toFixed(precision)} K`;
}

/**
 * Format velocity for display with appropriate unit
 * 
 * @param velocityInC - Velocity as fraction of speed of light (c)
 * @param precision - Number of decimal places (default: 3)
 * @returns Formatted string with unit
 */
export function formatVelocity(velocityInC: number, precision: number = 3): string {
    return `${velocityInC.toFixed(precision)}c`;
}
