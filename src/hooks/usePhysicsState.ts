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

    // Photon capture radius (Prograde circular photon orbit)
    const photonSphereRadius = physicsBridge.computePhotonSphere();

    // ISCO for prograde accretion disk
    const iscoRadius = physicsBridge.computeISCO();

    // Calculate observer-dependent properties at current camera distance (zoom in Rs)
    const absoluteZoom = params.zoom * 2.0 * params.mass;
    const r = Math.max(absoluteZoom, eventHorizonRadius * 1.01);

    // Exact Kerr Time Dilation from Rust
    const timeDilation = physicsBridge.computeDilation(r);

    // Gravitational Redshift z = 1/sqrt(-g_tt) - 1
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
