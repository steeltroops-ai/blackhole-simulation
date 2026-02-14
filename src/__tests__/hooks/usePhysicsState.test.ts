import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePhysicsState } from "@/hooks/usePhysicsState";
import { DEFAULT_PARAMS } from "@/types/simulation";

describe("usePhysicsState", () => {
  it("calculates physics properties based on default params", () => {
    const { result } = renderHook(() => usePhysicsState(DEFAULT_PARAMS));

    expect(result.current.normalizedSpin).toBeDefined();
    expect(result.current.eventHorizonRadius).toBeGreaterThan(0);
    expect(result.current.photonSphereRadius).toBeGreaterThan(0);
    expect(result.current.iscoRadius).toBeGreaterThan(0);
    expect(result.current.timeDilation).toBeGreaterThan(0);
    expect(result.current.redshift).toBeGreaterThanOrEqual(0);
  });

  it("normalizes spin correctly from UI range to physics range", () => {
    // Max spin (5.0) -> 1.0
    const maxSpinParams = { ...DEFAULT_PARAMS, spin: 5.0 };
    const { result: maxResult } = renderHook(() =>
      usePhysicsState(maxSpinParams),
    );
    expect(maxResult.current.normalizedSpin).toBe(1.0);

    // Min spin (-5.0) -> -1.0
    const minSpinParams = { ...DEFAULT_PARAMS, spin: -5.0 };
    const { result: minResult } = renderHook(() =>
      usePhysicsState(minSpinParams),
    );
    expect(minResult.current.normalizedSpin).toBe(-1.0);

    // Zero spin -> 0.0
    const zeroSpinParams = { ...DEFAULT_PARAMS, spin: 0.0 };
    const { result: zeroResult } = renderHook(() =>
      usePhysicsState(zeroSpinParams),
    );
    expect(zeroResult.current.normalizedSpin).toBe(0.0);
  });

  it("calculates observer properties based on zoom", () => {
    // Zoom far away -> Time dilation ~ 1, Redshift ~ 0
    const farParams = { ...DEFAULT_PARAMS, zoom: 100, mass: 1 };
    const { result: farResult } = renderHook(() => usePhysicsState(farParams));

    expect(farResult.current.timeDilation).toBeCloseTo(1, 1);
    expect(farResult.current.redshift).toBeCloseTo(0, 1);

    // Zoom close to horizon -> High redshift
    // Event horizon for mass 1, spin 0 is 2.
    // Zoom to 2.1
    const closeParams = { ...DEFAULT_PARAMS, zoom: 2.1, mass: 1, spin: 0 };
    const { result: closeResult } = renderHook(() =>
      usePhysicsState(closeParams),
    );

    // Time dilation factor sqrt(1 - 2/2.1) = sqrt(1 - 0.952) = sqrt(0.048) = 0.219
    // Redshift = 1/0.219 - 1 = 4.56 - 1 = 3.56
    expect(closeResult.current.redshift).toBeGreaterThan(1);
  });
});
