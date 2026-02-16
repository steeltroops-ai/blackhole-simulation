import { useMemo } from "react";
import type { SimulationParams } from "@/types/simulation";
import { physicsBridge } from "@/engine/physics-bridge";

export interface PhysicsState {
  normalizedSpin: number;
  eventHorizonRadius: number;
  photonSphereRadius: number;
  iscoRadius: number;
  timeDilation: number;
  redshift: number;
}

/**
 * Hook to centralize physics calculations based on simulation parameters.
 * Uses the Rust PhysicsBridge for calculations.
 *
 * @param params - Current simulation parameters
 * @returns PhysicsState containing calculated metric properties
 */
export function usePhysicsState(params: SimulationParams): PhysicsState {
  return useMemo(() => {
    // Spin is now directly in physics units [-1, 1]
    const normalizedSpin = Math.max(-1, Math.min(1, params.spin));

    // Update bridge parameters if ready
    if (physicsBridge.isReady()) {
      physicsBridge.updateParameters(params.mass, normalizedSpin);
    }

    // Calculate core metric properties using the bridge
    // Note: computeHorizon and computeISCO handle the checks internally
    const eventHorizonRadius = physicsBridge.computeHorizon();

    // Photon capture radius (approximation for UI until exposed from Rust)
    // r_ph roughly lies between 2M and 4M depending on spin
    const photonSphereRadius = 3.0 * params.mass;

    // ISCO for prograde accretion disk
    const iscoRadius = physicsBridge.computeISCO();

    // Calculate observer-dependent properties at current camera distance (zoom in Rs)
    // r is absolute distance in simulation units (assuming M=1 for units relative, but here we use absolute mass)
    const absoluteZoom = params.zoom * 2.0 * params.mass;
    const r = Math.max(absoluteZoom, eventHorizonRadius * 1.01);
    const rs = 2.0 * params.mass;

    // Schwarzschild approximation for UI display of Time Dilation
    // T_obs = T_proper / sqrt(1 - rs/r)
    const timeDilation = 1.0 / Math.sqrt(Math.max(0.001, 1.0 - rs / r));

    // Gravitational Redshift z = 1/sqrt(1-rs/r) - 1
    const redshift = timeDilation - 1.0;

    return {
      normalizedSpin,
      eventHorizonRadius,
      photonSphereRadius,
      iscoRadius,
      timeDilation,
      redshift,
    };
  }, [params.mass, params.spin, params.zoom]);
}
