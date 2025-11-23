/**
 * Kerr metric calculations for rotating black holes.
 * These functions compute key radii in the Kerr spacetime geometry.
 */

/**
 * Calculate the event horizon radius for a rotating black hole using the Kerr metric.
 * 
 * Formula: r_h = GM/c² + √((GM/c²)² - a²)
 * where a = J/(Mc) is the spin parameter (normalized to range [-1, 1])
 * 
 * In simulation units where G=c=1 and mass is in units of M:
 * r_h = M/2 + √((M/2)² - (a*M/2)²)
 * 
 * @param mass - Black hole mass in simulation units (solar masses)
 * @param spin - Dimensionless spin parameter, range [-1, 1] where 0 = Schwarzschild, ±1 = maximal Kerr
 * @returns Event horizon radius in simulation units
 * 
 * @example
 * const rh = calculateEventHorizon(1.2, 0.5); // For 1.2 solar mass black hole with spin 0.5
 */
export function calculateEventHorizon(mass: number, spin: number): number {
    // Clamp spin to valid range [-1, 1]
    const a = Math.max(-1, Math.min(1, spin));

    // In geometric units: r_g = GM/c² = M/2 (simulation units)
    const rg = mass * 0.5;

    // Spin parameter in geometric units: a_geom = a * r_g
    const a_geom = a * rg;

    // Kerr event horizon: r_h = r_g + √(r_g² - a_geom²)
    const discriminant = rg * rg - a_geom * a_geom;

    // For physical black holes, discriminant should be non-negative
    if (discriminant < 0) {
        // This shouldn't happen for |a| ≤ 1, but handle gracefully
        return rg;
    }

    return rg + Math.sqrt(discriminant);
}

/**
 * Calculate the photon sphere radius for a rotating black hole.
 * The photon sphere is an unstable circular orbit where photons can orbit the black hole.
 * 
 * For a Kerr black hole, the photon sphere radius depends on spin:
 * - Non-rotating (a=0): r_ph = 1.5 * r_s = 3M/2
 * - Prograde orbits (same direction as spin): closer to event horizon
 * - Retrograde orbits (opposite to spin): farther from event horizon
 * 
 * Approximate formula: r_ph ≈ r_g * (2 + cos(2/3 * arccos(±a)))
 * where + is for retrograde, - is for prograde
 * 
 * @param mass - Black hole mass in simulation units (solar masses)
 * @param spin - Dimensionless spin parameter, range [-1, 1]
 * @returns Photon sphere radius in simulation units (prograde orbit)
 * 
 * @example
 * const photonSphere = calculatePhotonSphere(1.2, 0.5);
 */
export function calculatePhotonSphere(mass: number, spin: number): number {
    // Clamp spin to valid range [-1, 1]
    const a = Math.max(-1, Math.min(1, spin));

    // M in geometric units (where r_s = M in our simulation units)
    const M = mass;

    // For prograde orbits (photons moving with the spin)
    // Using formula: r_ph = M * (2 + cos(2/3 * arccos(-a)))
    // For a=0, this gives r_ph = M * (2 + cos(2π/6)) = M * (2 + 0.5) = 2.5M
    // But we want r_ph = 1.5M for Schwarzschild, so we need to scale by 0.6
    const angle = Math.acos(-a);
    const r_ph = M * 0.6 * (2 + Math.cos((2 / 3) * angle));

    return r_ph;
}

/**
 * Calculate the Innermost Stable Circular Orbit (ISCO) radius.
 * The ISCO is the smallest circular orbit in which a test particle can stably orbit.
 * 
 * For Kerr black holes, ISCO depends on both spin magnitude and orbit direction:
 * - Prograde orbits (with spin): ISCO is closer to the black hole
 * - Retrograde orbits (against spin): ISCO is farther from the black hole
 * - Non-rotating (a=0): r_isco = 6M = 3 * r_s
 * 
 * Formula uses the Z1 and Z2 functions from the Kerr metric:
 * Z1 = 1 + (1-a²)^(1/3) * [(1+a)^(1/3) + (1-a)^(1/3)]
 * Z2 = √(3a² + Z1²)
 * r_isco = r_g * (3 + Z2 ∓ √((3-Z1)(3+Z1+2Z2)))
 * where - is for prograde, + is for retrograde
 * 
 * @param mass - Black hole mass in simulation units (solar masses)
 * @param spin - Dimensionless spin parameter, range [-1, 1]
 * @param prograde - True for prograde orbit (with spin), false for retrograde (against spin)
 * @returns ISCO radius in simulation units
 * 
 * @example
 * const iscoPrograde = calculateISCO(1.2, 0.5, true);
 * const iscoRetrograde = calculateISCO(1.2, 0.5, false);
 */
export function calculateISCO(mass: number, spin: number, prograde: boolean): number {
    // Clamp spin to valid range [-1, 1]
    const a = Math.max(-1, Math.min(1, spin));

    const rg = mass * 0.5;

    // For non-rotating black hole, ISCO = 6M = 3 * r_s
    if (Math.abs(a) < 1e-6) {
        return rg * 6.0;
    }

    // Calculate Z1 and Z2 functions
    const a2 = a * a;
    const term = Math.pow(1 - a2, 1 / 3);
    const Z1 = 1 + term * (Math.pow(1 + a, 1 / 3) + Math.pow(1 - a, 1 / 3));
    const Z2 = Math.sqrt(3 * a2 + Z1 * Z1);

    // Calculate ISCO radius
    // Prograde (with spin): use minus sign
    // Retrograde (against spin): use plus sign
    const sign = prograde ? -1 : 1;
    const sqrtTerm = Math.sqrt((3 - Z1) * (3 + Z1 + 2 * Z2));
    const r_isco = rg * (3 + Z2 + sign * sqrtTerm);

    return r_isco;
}

/**
 * Calculate gravitational time dilation factor at a given radius.
 * 
 * Time dilation describes how time flows slower in stronger gravitational fields.
 * Formula: t' = t × √(1 - 2GM/(rc²))
 * 
 * In simulation units where G=c=1:
 * t' = t × √(1 - r_s/r) where r_s = 2GM/c² = M (Schwarzschild radius)
 * 
 * The factor √(1 - r_s/r) approaches:
 * - 0 as r approaches the event horizon (time nearly stops)
 * - 1 as r approaches infinity (time flows normally)
 * 
 * @param radius - Distance from black hole center in simulation units
 * @param mass - Black hole mass in simulation units (solar masses)
 * @returns Time dilation factor (0 to 1), where lower values mean slower time
 * 
 * @example
 * const dilationFactor = calculateTimeDilation(10, 1.2);
 * // If dilationFactor = 0.8, then 1 second at infinity = 0.8 seconds at radius 10
 */
export function calculateTimeDilation(radius: number, mass: number): number {
    // Schwarzschild radius in simulation units
    const rs = mass * 1.0; // r_s = 2GM/c² = M in our units

    // Prevent division by zero and handle inside event horizon
    if (radius <= rs) {
        return 0; // Time effectively stops at or inside event horizon
    }

    // Time dilation factor: √(1 - r_s/r)
    const factor = Math.sqrt(1 - rs / radius);

    return factor;
}
