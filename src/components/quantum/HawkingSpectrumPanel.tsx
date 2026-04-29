"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  hawkingTemperatureKelvin,
  sampleHawkingSpectrum,
  wienPeakFrequency,
} from "@/lib/physics/hawking";

interface HawkingSpectrumPanelProps {
  /** Black-hole rest mass in kilograms (SI). */
  massKg: number;
  /** Dimensionless spin a* in [-1, 1]. */
  spinStar: number;
  /** Decades on each side of the Wien peak to render. */
  decadesEachSide?: number;
  /** Number of frequency samples; recharts handles up to a few hundred cleanly. */
  samples?: number;
  className?: string;
}

interface SamplePoint {
  log10Freq: number;
  log10Radiance: number;
  freqHz: number;
  radiance: number;
}

/**
 * Log-log spectral panel rendering the Hawking blackbody curve at
 * T_H(M, a*). Per ADR-0026 the panel is labelled "illustrative":
 * no greybody factor, no reabsorption inside the photon sphere, no
 * claim of real-time quantum gravity simulation.
 */
export function HawkingSpectrumPanel({
  massKg,
  spinStar,
  decadesEachSide = 4,
  samples = 96,
  className,
}: HawkingSpectrumPanelProps) {
  const { temperatureK, peakHz, data, peakLog10 } = useMemo(() => {
    const t = hawkingTemperatureKelvin(massKg, spinStar);
    const peak = wienPeakFrequency(t);
    const grid = sampleHawkingSpectrum(t, decadesEachSide, samples);
    const points: SamplePoint[] = grid
      .filter((p) => p.radiance > 0)
      .map((p) => ({
        log10Freq: Math.log10(p.freqHz),
        log10Radiance: Math.log10(p.radiance),
        freqHz: p.freqHz,
        radiance: p.radiance,
      }));
    return {
      temperatureK: t,
      peakHz: peak,
      data: points,
      peakLog10: peak > 0 ? Math.log10(peak) : 0,
    };
  }, [massKg, spinStar, decadesEachSide, samples]);

  if (data.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center px-3 py-4 bg-black/20 border border-white/5 rounded-sm text-[10px] font-mono text-white/60 ${
          className ?? ""
        }`}
      >
        <p>Hawking spectrum unavailable</p>
        <p className="text-[8px] mt-1 text-white/40">
          extremal limit (a*=±1) sets T_H = 0
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col px-3 py-2 bg-black/20 border border-white/5 rounded-sm ${
        className ?? ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="text-[8px] uppercase tracking-[0.15em] text-accent-cyan/80 font-mono">
          Hawking spectrum
        </span>
        <span className="text-[9px] tabular-nums font-mono text-white/80">
          T_H = {temperatureK.toExponential(2)} K
        </span>
      </div>
      <div className="w-full h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
          >
            <XAxis
              dataKey="log10Freq"
              type="number"
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => `1e${Math.round(v)}`}
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 8 }}
              stroke="rgba(255,255,255,0.2)"
            />
            <YAxis
              dataKey="log10Radiance"
              type="number"
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => `1e${Math.round(v)}`}
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 8 }}
              stroke="rgba(255,255,255,0.2)"
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.3)" }}
              contentStyle={{
                background: "rgba(0,0,0,0.85)",
                border: "1px solid rgba(255,255,255,0.1)",
                fontFamily: "monospace",
                fontSize: 10,
              }}
              labelFormatter={(value: number) =>
                `ν = ${(10 ** value).toExponential(2)} Hz`
              }
              formatter={(value: number) => [
                `${(10 ** value).toExponential(2)} W/m²/Hz/sr`,
                "B_ν",
              ]}
            />
            <ReferenceLine
              x={peakLog10}
              stroke="rgba(255,255,255,0.3)"
              strokeDasharray="2 2"
              label={{
                value: "Wien peak",
                fill: "rgba(255,255,255,0.5)",
                fontSize: 8,
                position: "top",
              }}
            />
            <Line
              type="monotone"
              dataKey="log10Radiance"
              dot={false}
              stroke="#00f2ff"
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[8px] uppercase tracking-[0.15em] text-white/40 leading-tight">
        Hawking radiation visualization · illustrative · spectrum derived from
        Hawking 1974/1975 · peak at {peakHz.toExponential(2)} Hz
      </p>
    </div>
  );
}
