/**
 * Kerr metric geometry for rotating black holes.
 */

/**
 * Event horizon radius.
 */
export function calculateEventHorizon(mass: number, spin: number): number {
  const a = Math.max(-1, Math.min(1, spin));
  const rg = mass * 0.5;
  const a_geom = a * rg;
  const disc = rg * rg - a_geom * a_geom;
  return rg + Math.sqrt(Math.max(0, disc));
}

/**
 * Photon sphere radius (prograde).
 */
export function calculatePhotonSphere(mass: number, spin: number): number {
  const a = Math.max(-1, Math.min(1, spin));
  return mass * (1.0 + Math.cos((2.0 / 3.0) * Math.acos(-a)));
}

/**
 * Innermost Stable Circular Orbit (ISCO).
 */
export function calculateISCO(
  mass: number,
  spin: number,
  prograde: boolean,
): number {
  const a = Math.max(-1, Math.min(1, spin));
  const rg = mass * 0.5;
  if (Math.abs(a) < 1e-6) return rg * 6.0;

  const term = Math.pow(1 - a * a, 1 / 3);
  const Z1 = 1 + term * (Math.pow(1 + a, 1 / 3) + Math.pow(1 - a, 1 / 3));
  const Z2 = Math.sqrt(3 * a * a + Z1 * Z1);
  const sign = prograde ? -1 : 1;
  const disc = (3 - Z1) * (3 + Z1 + 2 * Z2);
  return rg * (3 + Z2 + sign * Math.sqrt(Math.max(0, disc)));
}

/**
 * Gravitational time dilation factor.
 */
export function calculateTimeDilation(radius: number, mass: number): number {
  const rs = mass;
  if (radius <= rs) return 0;
  return Math.sqrt(1 - rs / radius);
}
