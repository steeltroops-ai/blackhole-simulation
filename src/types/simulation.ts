/**
 * Simulation type definitions for the black hole visualization
 */

/**
 * Parameters controlling the black hole simulation
 */
export interface SimulationParams {
    /** Black hole mass in solar masses (M☉) */
    mass: number;

    /** Accretion disk spin rate (negative = counter-clockwise, positive = clockwise) */
    spin: number;

    /** Accretion disk density (affects opacity and brightness) */
    diskDensity: number;

    /** Accretion disk temperature profile (affects color gradient) */
    diskTemp: number;

    /** Gravitational lensing strength multiplier */
    lensing: number;

    /** Whether the simulation is paused */
    paused: boolean;

    /** Camera zoom distance in astronomical units */
    zoom: number;
}

/**
 * Mouse/camera state for orbital controls
 */
export interface MouseState {
    /** Normalized x coordinate (0.0 to 1.0) */
    x: number;

    /** Normalized y coordinate (0.0 to 1.0) */
    y: number;
}
