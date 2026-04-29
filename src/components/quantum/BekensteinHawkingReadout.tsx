"use client";

import { useMemo } from "react";
import {
  bekensteinHawkingEntropyPerKb,
  formatScientific,
  horizonAreaSi,
  schwarzschildEvaporationTimeSeconds,
} from "@/lib/physics/bekenstein";
import { hawkingTemperatureKelvin } from "@/lib/physics/hawking";

interface BekensteinHawkingReadoutProps {
  /** Black-hole rest mass in kilograms (SI). */
  massKg: number;
  /** Dimensionless spin a* in [-1, 1]. */
  spinStar: number;
  /** Optional CSS classes for outer container override. */
  className?: string;
}

/**
 * Compact HUD readout that surfaces the Bekenstein-Hawking quantities
 * (horizon area, entropy, Hawking temperature, photon-only
 * evaporation lifetime). Every line carries the "illustrative"
 * footer per ADR-0026; no surface here makes any real-time quantum
 * claim.
 */
export function BekensteinHawkingReadout({
  massKg,
  spinStar,
  className,
}: BekensteinHawkingReadoutProps) {
  const data = useMemo(() => {
    const areaSi = horizonAreaSi(massKg, spinStar);
    const entropyRatio = bekensteinHawkingEntropyPerKb(massKg, spinStar);
    const temperatureK = hawkingTemperatureKelvin(massKg, spinStar);
    const evaporationS = schwarzschildEvaporationTimeSeconds(massKg);
    const evaporationYears = evaporationS / (365.25 * 24 * 3600);
    return {
      areaSi,
      entropyRatio,
      temperatureK,
      evaporationYears,
    };
  }, [massKg, spinStar]);

  return (
    <div
      className={`flex flex-col gap-1 px-3 py-2 bg-black/20 border border-white/5 rounded-sm font-mono text-[10px] leading-relaxed text-white/90 ${
        className ?? ""
      }`}
    >
      <Row label="Horizon area" value={`${formatScientific(data.areaSi)} m²`} />
      <Row label="Entropy S/k_B" value={formatScientific(data.entropyRatio)} />
      <Row label="T_H" value={`${formatScientific(data.temperatureK)} K`} />
      <Row
        label="t_evap"
        value={`${formatScientific(data.evaporationYears)} yr`}
      />
      <p className="mt-1 text-[8px] uppercase tracking-[0.15em] text-white/40">
        Bekenstein-Hawking · illustrative
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-3">
      <span className="text-white/60 uppercase tracking-[0.1em] text-[8px]">
        {label}
      </span>
      <span className="tabular-nums text-white">{value}</span>
    </div>
  );
}
