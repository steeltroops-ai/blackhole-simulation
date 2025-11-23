/**
 * Kerr metric calculations for rotating black holes.
 * These functions compute key radii in the Kerr spacetime geometry.
 */

/**
 * Calculate the Schwarzschild radius (event horizon for non-rotating black hole).
 * For a rotating black hole (Kerr metric), this represents the characteristic scale.
 * 
 * Formula: rs = 2GM/c² (in geometric units, simplified to mass * 0.5)
 * 
 * @param mass - Black hole mass in simulation units (solar masses)
 * @returns Schwarzschild radius in simulation units
 * 
 * @example
 * const rs = calculateEventHorizon(1.2); // For 1.2 solar mass black hole
 */
export function calculateEventHorizon(mass: number): number {
    return mass * 0.5;
}

/**
 * Calculate the photon sphere radius.
 * The photon sphere is an unstable circular orbit where photons can orbit the black hole.
 * Any perturbation causes photons to either escape or fall into the event horizon.
 * 
 * Formula: r_photon = 1.5 * rs (for non-rotating black hole)
 * 
 * @param mass - Black hole mass in simulation units (solar masses)
 * @returns Photon sphere radius in simulation units
 * 
 * @example
 * const photonSphere = calculatePhotonSphere(1.2);
 */
export function calculatePhotonSphere(mass: number): number {
    const rs = calculateEventHorizon(mass);
    return rs * 1.5;
}

/**
 * Calculate the Innermost Stable Circular Orbit (ISCO) radius.
 * The ISCO is the smallest circular orbit in which a test particle can stably orbit.
 * Inside this radius, orbits become unstable and matter spirals into the black hole.
 * 
 * Formula: r_isco = 3 * rs (for non-rotating black hole)
 * Note: For rotating black holes, ISCO depends on spin and can be closer (prograde) or farther (retrograde)
 * 
 * @param mass - Black hole mass in simulation units (solar masses)
 * @returns ISCO radius in simulation units
 * 
 * @example
 * const isco = calculateISCO(1.2);
 */
export function calculateISCO(mass: number): number {
    const rs = calculateEventHorizon(mass);
    return rs * 3.0;
}
