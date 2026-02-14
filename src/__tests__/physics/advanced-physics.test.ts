/**
 * Tests for advanced physics features added in Phase 6:
 * - Gravitational redshift on disk emission
 * - Ergosphere boundary calculation
 * - Doppler beaming exponent
 * - Velocity Verlet integrator properties
 *
 * These test the TypeScript-level implementations that mirror GLSL shader logic.
 */
import { describe, it, expect } from "vitest";

// Mirror the shader's gravitational redshift: T_obs = T_emit * sqrt(1 - rs/r)
function gravitationalRedshift(rs: number, r: number): number {
  return Math.sqrt(Math.max(0, 1.0 - rs / r));
}

// Mirror the ergosphere boundary: r_ergo = M + sqrt(M^2 - a^2 * cos^2(theta))
function ergosphereRadius(M: number, a: number, cosTheta: number): number {
  const a2 = a * a;
  return M + Math.sqrt(Math.max(0, M * M - a2 * cosTheta * cosTheta));
}

// Mirror the shader's ISCO polynomial approximation
function calculateISCO_shader(M: number, aStar: number): number {
  const absA = Math.abs(Math.max(-1, Math.min(1, aStar)));
  return (
    M * (6.0 - 4.627 * absA + 2.399 * absA * absA - 0.772 * absA * absA * absA)
  );
}

describe("Phase 6: Advanced Physics Features", () => {
  const M = 1.0;
  const rs = 2.0 * M;

  describe("Gravitational Redshift", () => {
    it("should be 0 at the Schwarzschild radius (infinite redshift surface)", () => {
      expect(gravitationalRedshift(rs, rs)).toBeCloseTo(0, 10);
    });

    it("should approach 1 at large distances", () => {
      expect(gravitationalRedshift(rs, 1e10)).toBeCloseTo(1.0, 5);
    });

    it("should be sqrt(2/3) at r = 3*rs", () => {
      expect(gravitationalRedshift(rs, 3 * rs)).toBeCloseTo(
        Math.sqrt(2 / 3),
        10,
      );
    });

    it("should clamp to 0 inside the Schwarzschild radius", () => {
      expect(gravitationalRedshift(rs, rs * 0.5)).toBe(0);
    });

    it("should increase monotonically with distance", () => {
      const radii = [rs * 1.01, rs * 2, rs * 5, rs * 10, rs * 100];
      const values = radii.map((r) => gravitationalRedshift(rs, r));

      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });

    it("should correctly reduce observed temperature", () => {
      // T_obs = T_emit * g, where g = sqrt(1 - rs/r)
      const T_emit = 10000; // Kelvin
      const r = 3 * rs; // ISCO for Schwarzschild
      const g = gravitationalRedshift(rs, r);
      const T_obs = T_emit * g;

      expect(T_obs).toBeLessThan(T_emit);
      expect(T_obs).toBeGreaterThan(0);
      expect(T_obs).toBeCloseTo(T_emit * Math.sqrt(2 / 3), 1);
    });
  });

  describe("Ergosphere Boundary", () => {
    const a = 0.9; // High spin

    it("should be 2M at the equator (theta = pi/2, cosTheta = 0)", () => {
      expect(ergosphereRadius(M, a, 0)).toBeCloseTo(2 * M, 10);
    });

    it("should coincide with horizon at the poles (cosTheta = +-1)", () => {
      const rPlus = M + Math.sqrt(M * M - a * a);
      expect(ergosphereRadius(M, a, 1)).toBeCloseTo(rPlus, 10);
      expect(ergosphereRadius(M, a, -1)).toBeCloseTo(rPlus, 10);
    });

    it("should be larger at equator than at poles", () => {
      expect(ergosphereRadius(M, a, 0)).toBeGreaterThan(
        ergosphereRadius(M, a, 1),
      );
    });

    it("should collapse to 2M for Schwarzschild (a=0) at all latitudes", () => {
      const angles = [0, 0.3, 0.5, 0.7, 1.0];
      for (const cosTheta of angles) {
        expect(ergosphereRadius(M, 0, cosTheta)).toBeCloseTo(2 * M, 10);
      }
    });

    it("should always be >= event horizon", () => {
      const testSpins = [0, 0.3, 0.5, 0.7, 0.9, 0.99];
      const testAngles = [0, 0.3, 0.5, 0.7, 1.0];

      for (const spin of testSpins) {
        const rH = M + Math.sqrt(Math.max(0, M * M - spin * spin));
        for (const cosTheta of testAngles) {
          const rErgo = ergosphereRadius(M, spin, cosTheta);
          expect(rErgo).toBeGreaterThanOrEqual(rH - 1e-10);
        }
      }
    });

    it("should be symmetric around equator (cosTheta and -cosTheta)", () => {
      expect(ergosphereRadius(M, a, 0.5)).toBeCloseTo(
        ergosphereRadius(M, a, -0.5),
        10,
      );
    });
  });

  describe("ISCO Shader Polynomial", () => {
    it("should give 6M for Schwarzschild (a=0)", () => {
      expect(calculateISCO_shader(M, 0)).toBeCloseTo(6.0 * M, 2);
    });

    it("should decrease with increasing |spin|", () => {
      const spins = [0, 0.2, 0.4, 0.6, 0.8];
      const iscos = spins.map((a) => calculateISCO_shader(M, a));

      for (let i = 1; i < iscos.length; i++) {
        expect(iscos[i]).toBeLessThan(iscos[i - 1]);
      }
    });

    it("should be symmetric (|a| = |-a|)", () => {
      for (const spin of [0.3, 0.5, 0.7, 0.9]) {
        expect(calculateISCO_shader(M, spin)).toBeCloseTo(
          calculateISCO_shader(M, -spin),
          10,
        );
      }
    });

    it("should scale linearly with mass", () => {
      const isco1 = calculateISCO_shader(1.0, 0.5);
      const isco2 = calculateISCO_shader(2.0, 0.5);
      expect(isco2 / isco1).toBeCloseTo(2.0, 10);
    });

    it("should always be positive", () => {
      for (let a = -1.0; a <= 1.0; a += 0.1) {
        expect(calculateISCO_shader(M, a)).toBeGreaterThan(0);
      }
    });

    it("should always be > event horizon for |a| < 1", () => {
      const spins = [-0.9, -0.5, 0, 0.5, 0.9];
      for (const spin of spins) {
        const rH = M + Math.sqrt(Math.max(0, M * M - spin * spin));
        const isco = calculateISCO_shader(M, spin);
        expect(isco).toBeGreaterThan(rH);
      }
    });
  });

  describe("Doppler Beaming Physics", () => {
    it("should use exponent 3 for thermal continuum (alpha=0)", () => {
      // D^(3+alpha) where alpha is the spectral index
      // For optically thick thermal disk: alpha = 0
      // Reference: Rybicki & Lightman (1979)
      const alpha = 0;
      const exponent = 3 + alpha;
      expect(exponent).toBe(3);
    });

    it("should give beaming > 1 for approaching material (delta > 1)", () => {
      const delta = 1.5; // Approaching -- blueshift
      const beaming = Math.pow(delta, 3.0);
      expect(beaming).toBeGreaterThan(1);
    });

    it("should give beaming < 1 for receding material (delta < 1)", () => {
      const delta = 0.8; // Receding -- redshift
      const beaming = Math.pow(delta, 3.0);
      expect(beaming).toBeLessThan(1);
    });

    it("beaming should be 1 for delta = 1 (no Doppler shift)", () => {
      expect(Math.pow(1.0, 3.0)).toBe(1);
    });
  });

  describe("Velocity Verlet Properties", () => {
    // Test basic Verlet properties using a simple 1D harmonic oscillator
    // (which is symplectic and should conserve energy)
    it("should conserve energy for simple harmonic oscillator", () => {
      // x'' = -x (omega=1)
      let x = 1.0; // Initial displacement
      let v = 0.0; // Initial velocity
      const dt = 0.01;
      const steps = 10000; // ~16 periods

      const initialEnergy = 0.5 * v * v + 0.5 * x * x;

      for (let i = 0; i < steps; i++) {
        const a = -x; // F = -x
        x += v * dt + 0.5 * a * dt * dt;
        const aNew = -x;
        v += 0.5 * (a + aNew) * dt;
      }

      const finalEnergy = 0.5 * v * v + 0.5 * x * x;

      // Symplectic integrator should conserve energy to high precision
      // (bounded energy error, not growing linearly like Euler)
      expect(Math.abs(finalEnergy - initialEnergy)).toBeLessThan(1e-4);
    });

    it("Forward Euler should NOT conserve energy for same problem (control test)", () => {
      let x = 1.0;
      let v = 0.0;
      const dt = 0.01;
      const steps = 50000; // ~80 periods -- long enough for visible drift

      const initialEnergy = 0.5 * v * v + 0.5 * x * x;

      for (let i = 0; i < steps; i++) {
        // TRUE Forward Euler: x_new = x + v*dt, v_new = v + a*dt
        // (using OLD v for x update, unlike symplectic Euler)
        const a = -x;
        const xNew = x + v * dt;
        const vNew = v + a * dt;
        x = xNew;
        v = vNew;
      }

      const finalEnergy = 0.5 * v * v + 0.5 * x * x;

      // Forward Euler's energy grows quadratically with time
      // (demonstrates WHY we switched to Verlet)
      expect(Math.abs(finalEnergy - initialEnergy)).toBeGreaterThan(0.001);
    });
  });
});
