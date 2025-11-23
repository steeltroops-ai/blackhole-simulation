/**
 * Color temperature mapping for blackbody radiation.
 * Maps temperature in Kelvin to RGB colors based on blackbody spectrum.
 */

/**
 * Convert temperature in Kelvin to RGB color using blackbody radiation spectrum.
 * 
 * Temperature ranges:
 * - < 3000K: Deep red (#330000 to #660000)
 * - 3000-5000K: Orange-red (#FF4500 to #FF8C00)
 * - 5000-7000K: Yellow-white (#FFD700 to #FFFACD)
 * - 7000-10000K: White (#FFFFFF)
 * - 10000-20000K: Blue-white (#E0F0FF to #C0D8FF)
 * - > 20000K: Deep blue (#9BB0FF to #6A7FFF)
 * 
 * @param tempK - Temperature in Kelvin
 * @returns RGB color as tuple [r, g, b] where each component is in range [0, 1]
 * 
 * @example
 * const color = temperatureToColor(6000); // Returns yellowish-white
 */
export function temperatureToColor(tempK: number): [number, number, number] {
    // Clamp temperature to reasonable range
    const temp = Math.max(1000, Math.min(40000, tempK));

    // Normalize temperature to 0-1 range for easier calculation
    // Using logarithmic scale for better color distribution
    const t = temp / 100;

    let r: number, g: number, b: number;

    // Red component
    if (temp <= 6600) {
        r = 1.0;
    } else {
        r = 1.292936186 * Math.pow(t - 60, -0.1332047592);
        r = Math.max(0, Math.min(1, r));
    }

    // Green component
    if (temp <= 6600) {
        g = 0.390081579 * Math.log(t) - 0.631841444;
        g = Math.max(0, Math.min(1, g));
    } else {
        g = 1.129890861 * Math.pow(t - 60, -0.0755148492);
        g = Math.max(0, Math.min(1, g));
    }

    // Blue component
    if (temp >= 6600) {
        b = 1.0;
    } else if (temp <= 1900) {
        b = 0.0;
    } else {
        b = 0.543206789 * Math.log(t - 10) - 1.196254089;
        b = Math.max(0, Math.min(1, b));
    }

    return [r, g, b];
}

/**
 * Apply Doppler shift to a color based on velocity and viewing angle.
 * 
 * Doppler shift causes:
 * - Blueshift (shift toward blue) for approaching material (positive radial velocity)
 * - Redshift (shift toward red) for receding material (negative radial velocity)
 * 
 * @param color - RGB color as tuple [r, g, b] where each component is in range [0, 1]
 * @param velocity - Velocity as fraction of speed of light, range [-1, 1]
 * @param angle - Viewing angle in radians (0 = directly toward observer, π = directly away)
 * @returns Doppler-shifted RGB color as tuple [r, g, b]
 * 
 * @example
 * const baseColor: [number, number, number] = [1.0, 0.8, 0.6];
 * const shifted = applyDopplerShift(baseColor, 0.1, 0); // Blueshift for approaching
 */
export function applyDopplerShift(
    color: [number, number, number],
    velocity: number,
    angle: number
): [number, number, number] {
    // Clamp velocity to valid range
    const v = Math.max(-0.99, Math.min(0.99, velocity));

    // Calculate radial velocity component
    const vRadial = v * Math.cos(angle);

    // Doppler factor: δ = √((1-β)/(1+β)) for radial motion
    // where β = v/c (velocity as fraction of c)
    const beta = vRadial;
    const dopplerFactor = Math.sqrt((1 - beta) / (1 + beta));

    // Shift wavelength: λ_observed = λ_emitted * dopplerFactor
    // Shorter wavelength (higher frequency) = blueshift
    // Longer wavelength (lower frequency) = redshift

    // For approaching material (vRadial > 0), dopplerFactor < 1, so wavelength decreases (blueshift)
    // For receding material (vRadial < 0), dopplerFactor > 1, so wavelength increases (redshift)

    let [r, g, b] = color;

    if (vRadial > 0) {
        // Approaching: shift toward blue
        // Increase blue component, decrease red component
        const shiftAmount = Math.abs(vRadial) * 0.5;
        r = Math.max(0, r - shiftAmount);
        b = Math.min(1, b + shiftAmount);
    } else if (vRadial < 0) {
        // Receding: shift toward red
        // Increase red component, decrease blue component
        const shiftAmount = Math.abs(vRadial) * 0.5;
        r = Math.min(1, r + shiftAmount);
        b = Math.max(0, b - shiftAmount);
    }

    return [r, g, b];
}
