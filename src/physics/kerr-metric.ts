/**
 * Kerr Metric Geometry for Rotating Black Holes
 *
 * Convention: Geometric units where G = c = 1.
 * The "mass" parameter is M (gravitational mass).
 * Schwarzschild radius: rs = 2M.
 * Spin parameter: a = J/M, dimensionless spin a* = a/M, |a*| <= 1.
 *
 * All formulas follow the standard Boyer-Lindquist form from:
 *   Bardeen, Press & Teukolsky (1972) "Rotating Black Holes"
 */

/**
 * Event horizon radius for a Kerr black hole.
 *
 * r+ = M + sqrt(M^2 - a^2)
 * where a = a* * M (geometric spin), |a*| <= 1
 *
 * For Schwarzschild (a=0): r+ = 2M
 * For extremal Kerr (a=M): r+ = M
 *
 * Time complexity: O(1)
 * Space complexity: O(1)
 */
export function calculateEventHorizon(mass: number, spin: number): number {
  const aStar = Math.max(-1, Math.min(1, spin));
  const a = aStar * mass; // geometric spin
  const disc = mass * mass - a * a;
  return mass + Math.sqrt(Math.max(0, disc));
}

/**
 * Photon sphere radius (prograde circular orbit) for Kerr.
 *
 * r_ph = 2M * [1 + cos((2/3) * arccos(-a*))]
 *
 * For Schwarzschild (a=0): r_ph = 3M
 * For extremal prograde (a*=1): r_ph = M
 * For extremal retrograde (a*=-1): r_ph = 4M
 *
 * Reference: Bardeen (1973), Eq. 2.18
 *
 * Time complexity: O(1)
 * Space complexity: O(1)
 */
export function calculatePhotonSphere(mass: number, spin: number): number {
  const aStar = Math.max(-1, Math.min(1, spin));
  return 2.0 * mass * (1.0 + Math.cos((2.0 / 3.0) * Math.acos(-aStar)));
}

/**
 * Innermost Stable Circular Orbit (ISCO) for Kerr.
 *
 * For Schwarzschild (a=0): r_isco = 6M
 * For extremal prograde (a*=1): r_isco = M
 * For extremal retrograde (a*=-1): r_isco = 9M
 *
 * Reference: Bardeen, Press & Teukolsky (1972), Eq. 2.21
 *
 * Time complexity: O(1)
 * Space complexity: O(1)
 *
 * @param mass - Gravitational mass M
 * @param spin - Dimensionless spin parameter a* in [-1, 1]
 * @param prograde - true for co-rotating orbit, false for counter-rotating
 */
export function calculateISCO(
  mass: number,
  spin: number,
  prograde: boolean,
): number {
  const aStar = Math.max(-1, Math.min(1, spin));

  // Schwarzschild limit: ISCO = 6M
  if (Math.abs(aStar) < 1e-6) return mass * 6.0;

  // Bardeen-Press-Teukolsky formula
  const a2 = aStar * aStar;
  const term = Math.pow(1 - a2, 1.0 / 3.0);
  const Z1 =
    1 +
    term * (Math.pow(1 + aStar, 1.0 / 3.0) + Math.pow(1 - aStar, 1.0 / 3.0));
  const Z2 = Math.sqrt(3.0 * a2 + Z1 * Z1);
  const sign = prograde ? -1 : 1;
  const disc = (3.0 - Z1) * (3.0 + Z1 + 2.0 * Z2);
  return mass * (3.0 + Z2 + sign * Math.sqrt(Math.max(0, disc)));
}

/**
 * Gravitational time dilation factor (Schwarzschild approximation).
 *
 * tau/t = sqrt(1 - rs/r) = sqrt(1 - 2M/r)
 *
 * Returns 0 at or inside the Schwarzschild radius.
 * Returns 1 at infinity.
 *
 * Time complexity: O(1)
 * Space complexity: O(1)
 *
 * @param radius - Radial coordinate r (must be > 2M for meaningful result)
 * @param mass - Gravitational mass M
 */
export function calculateTimeDilation(radius: number, mass: number): number {
  const rs = 2.0 * mass; // Schwarzschild radius = 2M
  if (radius <= rs) return 0;
  return Math.sqrt(1.0 - rs / radius);
}

/**
 * Ergosphere outer boundary radius.
 *
 * r_ergo(theta) = M + sqrt(M^2 - a^2 * cos^2(theta))
 *
 * At equator (theta = pi/2): r_ergo = 2M (same as Schwarzschild radius)
 * At poles (theta = 0): r_ergo = r+ (same as event horizon)
 *
 * Time complexity: O(1)
 * Space complexity: O(1)
 *
 * @param mass - Gravitational mass M
 * @param spin - Dimensionless spin a* in [-1, 1]
 * @param theta - Polar angle in radians [0, pi]
 */
export function calculateErgosphere(
  mass: number,
  spin: number,
  theta: number,
): number {
  const aStar = Math.max(-1, Math.min(1, spin));
  const a = aStar * mass;
  const cosTheta = Math.cos(theta);
  const disc = mass * mass - a * a * cosTheta * cosTheta;
  return mass + Math.sqrt(Math.max(0, disc));
}

/**
 * Gravitational redshift factor at radius r for Schwarzschild.
 *
 * 1 + z = 1 / sqrt(1 - rs/r) = 1 / sqrt(1 - 2M/r)
 *
 * Returns the factor by which emitted wavelength is stretched.
 * Diverges at r = rs (infinite redshift surface).
 *
 * Time complexity: O(1)
 * Space complexity: O(1)
 */
export function calculateRedshift(radius: number, mass: number): number {
  const rs = 2.0 * mass;
  if (radius <= rs) return Infinity;
  const dilation = Math.sqrt(1.0 - rs / radius);
  return 1.0 / dilation - 1.0;
}
