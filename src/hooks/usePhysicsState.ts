import { useMemo } from "react";
import type { SimulationParams } from "@/types/simulation";
import {
  calculateEventHorizon,
  calculatePhotonSphere,
  calculateISCO,
  calculateTimeDilation,
  calculateRedshift,
} from "@/physics/kerr-metric";

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
 * Eliminates duplicate logic in ControlPanel and Telemetry (Circular Dependency Fix).
 *
 * @param params - Current simulation parameters
 * @returns PhysicsState containing calculated metric properties
 */
export function usePhysicsState(params: SimulationParams): PhysicsState {
  return useMemo(() => {
    // Normalize spin from UI range [-5, 5] to physics range [-1, 1]
    const normalizedSpin = Math.max(-1, Math.min(1, params.spin / 5.0));

    // Calculate core metric properties
    const eventHorizonRadius = calculateEventHorizon(
      params.mass,
      normalizedSpin,
    );
    const photonSphereRadius = calculatePhotonSphere(
      params.mass,
      normalizedSpin,
    );
    // ISCO for prograde accretion disk
    const iscoRadius = calculateISCO(params.mass, normalizedSpin, true);

    // Calculate observer-dependent properties at current camera distance (zoom)
    // Ensure we don't calculate inside the horizon to avoid Infinity/NaN in UI
    const effectiveRadius = Math.max(
      params.zoom,
      eventHorizonRadius * 1.01, // 1% buffer
    );

    const timeDilation = calculateTimeDilation(effectiveRadius, params.mass);
    const redshift = calculateRedshift(effectiveRadius, params.mass);

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
