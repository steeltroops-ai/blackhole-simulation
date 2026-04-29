"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { hawkingTemperatureKelvin } from "@/lib/physics/hawking";

interface HorizonPairOverlayProps {
  /** Black-hole rest mass (SI). */
  massKg: number;
  /** Dimensionless spin a*. */
  spinStar: number;
  /**
   * Particle budget. The overlay is illustrative (ADR-0026); real
   * Hawking emission rates would be dM/dt / (h ν_peak), 10^-30
   * particles per second for a solar-mass hole. The visualization
   * scales budget by log-temperature so the operator gets a visible
   * effect even at picokelvin T_H.
   */
  maxParticles?: number;
  /** Show / hide the overlay. */
  visible?: boolean;
  /** Optional className for the outer SVG layer. */
  className?: string;
}

interface Particle {
  id: number;
  /** Polar angle on the horizon ring (radians). */
  theta: number;
  /** Outward radial offset relative to the horizon ring radius. */
  radial: number;
  /** Tangential drift (radians per frame) from spin-frame dragging. */
  drift: number;
  /** Particle age in frames; particles fade out as they reach the budget. */
  age: number;
  /** Lifetime in frames (set per particle so they don't all blink in sync). */
  lifetime: number;
  /** Sign of charge: +1 outgoing, −1 ingoing (the partner that falls in). */
  sign: 1 | -1;
}

const HORIZON_RING_RADIUS = 90;
const FRAME_DELTA = 1; // logical frames per RAF tick
const MIN_VISIBLE_LOG_TEMP = -30;
const MAX_VISIBLE_LOG_TEMP = 12;

/**
 * Pair-production overlay near the event horizon, rendered as an SVG
 * layer that sits above the WebGL/WebGPU canvas. Particles spawn in
 * pairs (one outgoing, one ingoing); the ingoing partner fades into
 * the horizon while the outgoing one drifts out and dims.
 *
 * Per ADR-0026 the overlay is labelled illustrative. The spawn rate
 * scales by log10(T_H) so the operator sees a useful effect at any
 * mass; real Hawking emission for a solar-mass hole is one particle
 * per ~10^21 years, which would render as nothing.
 */
export function HorizonPairOverlay({
  massKg,
  spinStar,
  maxParticles = 30,
  visible = true,
  className,
}: HorizonPairOverlayProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const idRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const previousTickRef = useRef<number>(performance.now());

  const intensity = useMemo(() => {
    const t = hawkingTemperatureKelvin(massKg, spinStar);
    if (t <= 0) return 0;
    const logT = Math.log10(t);
    const norm =
      (logT - MIN_VISIBLE_LOG_TEMP) /
      (MAX_VISIBLE_LOG_TEMP - MIN_VISIBLE_LOG_TEMP);
    return Math.max(0.05, Math.min(1, norm));
  }, [massKg, spinStar]);

  useEffect(() => {
    if (!visible || intensity <= 0) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setParticles([]);
      return;
    }

    function tick(now: number) {
      const dtMs = now - previousTickRef.current;
      previousTickRef.current = now;
      const frames = Math.max(0.5, dtMs / 16);

      setParticles((prev) => {
        const aged = prev
          .map<Particle>((p) => ({
            ...p,
            age: p.age + FRAME_DELTA * frames,
            theta: p.theta + p.drift * FRAME_DELTA * frames,
            radial: p.radial + (p.sign === 1 ? 0.5 : -0.4) * frames,
          }))
          .filter((p) => p.age < p.lifetime);

        // Spawn new pairs in proportion to intensity. The
        // probability stays in [0, 1] regardless of frame timing.
        const spawnProb = intensity * 0.4 * frames;
        if (aged.length < maxParticles && Math.random() < spawnProb) {
          const theta = Math.random() * Math.PI * 2;
          const drift = (Math.random() - 0.5) * 0.05 * spinStar;
          const lifetime = 35 + Math.random() * 25;
          const baseId = idRef.current;
          idRef.current += 2;
          aged.push(
            {
              id: baseId,
              theta,
              radial: 0,
              drift,
              age: 0,
              lifetime,
              sign: 1,
            },
            {
              id: baseId + 1,
              theta: theta + 0.05,
              radial: 0,
              drift: -drift,
              age: 0,
              lifetime: lifetime * 0.4,
              sign: -1,
            },
          );
        }

        return aged;
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    previousTickRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, intensity, maxParticles, spinStar]);

  if (!visible) return null;

  return (
    <svg
      role="presentation"
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-30 ${className ?? ""}`}
      viewBox="-160 -160 320 320"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="horizon-particle-glow">
          <stop offset="0%" stopColor="#00f2ff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#00f2ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="horizon-particle-glow-ingoing">
          <stop offset="0%" stopColor="#ff5c8a" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ff5c8a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle
        cx="0"
        cy="0"
        r={HORIZON_RING_RADIUS}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeDasharray="2 4"
      />
      {particles.map((p) => {
        const r = HORIZON_RING_RADIUS + p.radial;
        const cx = r * Math.cos(p.theta);
        const cy = r * Math.sin(p.theta);
        const fade = 1 - p.age / p.lifetime;
        return (
          <circle
            key={p.id}
            cx={cx}
            cy={cy}
            r={p.sign === 1 ? 2.5 : 2.0}
            fill={
              p.sign === 1
                ? "url(#horizon-particle-glow)"
                : "url(#horizon-particle-glow-ingoing)"
            }
            opacity={Math.max(0, fade)}
          />
        );
      })}
      <text
        x="0"
        y="155"
        textAnchor="middle"
        fontSize="6"
        letterSpacing="0.15em"
        fill="rgba(255,255,255,0.4)"
        fontFamily="monospace"
      >
        HAWKING PAIRS · ILLUSTRATIVE
      </text>
    </svg>
  );
}
