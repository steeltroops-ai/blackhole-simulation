export function calculateEventHorizon(mass: number, spin: number): number {
  const a = Math.max(-1, Math.min(1, spin));
  const val = 1 - a * a;
  return mass * (1 + Math.sqrt(val < 0 ? 0 : val));
}

export function calculatePhotonSphere(mass: number, spin: number): number {
  const a = Math.max(-1, Math.min(1, spin));
  // r_ph = 2M * [1 + cos(2/3 * acos(-a*))]
  const term = (2.0 / 3.0) * Math.acos(-a);
  return 2.0 * mass * (1.0 + Math.cos(term));
}

export function calculateISCO(
  mass: number,
  spin: number,
  prograde: boolean,
): number {
  const a = Math.max(-1, Math.min(1, spin));
  if (Math.abs(a) < 1e-6) return mass * 6.0;

  const a2 = a * a;
  const t1 = Math.cbrt(1 - a2);
  const t2 = Math.cbrt(1 + a);
  const t3 = Math.cbrt(1 - a);
  const z1 = 1 + t1 * (t2 + t3);

  const z2 = Math.sqrt(3 * a2 + z1 * z1);

  // Prograde (co-rotating) orbits have smaller ISCO, so we subtract the root term
  const sign = prograde ? -1.0 : 1.0;

  const disc = (3 - z1) * (3 + z1 + 2 * z2);
  const root = disc < 0 ? 0 : Math.sqrt(disc);

  return mass * (3 + z2 + sign * root);
}

export function calculateTimeDilation(radius: number, mass: number): number {
  // Simple Schwarzschild time dilation: sqrt(1 - 2M/r)
  const val = 1 - (2 * mass) / radius;
  return val < 0 ? 0 : Math.sqrt(val);
}
