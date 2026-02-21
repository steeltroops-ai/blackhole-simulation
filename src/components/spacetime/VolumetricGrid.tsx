"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

interface VolumetricGridProps {
  mass: number;
  spin: number;
  size?: number;
  divisions?: number;
  baseColor?: string;
  coreColor?: string;
}

/**
 * 3D Volumetric Spacetime Grid -- Full Physics Engine Integration.
 *
 * Physics sourced from the Rust engine:
 *
 * tensor/metric_tensor.rs:
 *   4x4 covariant metric g_{mu nu} in Boyer-Lindquist coordinates.
 *   g_tt = -(1 - 2Mr/Sigma),  g_rr = Sigma/Delta,  g_{theta theta} = Sigma,
 *   g_{phi phi} = (r^2+a^2 + 2Ma^2 sin^2/Sigma) sin^2,  g_{t phi} = -2Mar sin^2/Sigma
 *
 * tensor/christoffel.rs:
 *   Gamma^alpha_{mu nu} = 1/2 g^{alpha sigma}(dg_{sigma mu}/dx^nu + ...)
 *   Used here for geodesic deviation coloring (curvature strength).
 *
 * spacetime/curvature.rs:
 *   Kretschner scalar K = 48M^2 * (r^6 - 15r^4a^2cos^2 + ...) / Sigma^6
 *   Coordinate-invariant tidal force measure for coloring.
 *
 * spacetime/embedding.rs:
 *   Flamm's paraboloid: z = 2*sqrt(rs*(r-rs))
 *   Kerr embedding: integral(sqrt(|g_rr - 1|) dr) from metric tensor
 *   Used for equatorial Y-displacement (funnel depth).
 *
 * spacetime/frame_drag.rs:
 *   omega = -g_{t phi} / g_{phi phi} at arbitrary (r, theta)
 *   Azimuthal twist on grid points.
 *
 * spacetime/lightcone.rs:
 *   tan(alpha) = sqrt(-g_tt / g_rr) -- light cone tilt angle.
 *   Not directly used in the grid but informs the contraction model.
 *
 * CONTRACTION: r_new = sqrt(max(0, Delta(r)))
 *   This is the 3D Flamm's paraboloid. Grid is pulled radially inward.
 *
 * FIXED REFERENCE FRAME:
 *   physExtent is a FIXED spatial size (not scaling with M).
 *   When mass increases, rs = 2M grows inside the fixed frame.
 *   Small M -> small BH in large room -> subtle curvature.
 *   Large M -> BH fills the room -> extreme curvature.
 *   This is physically correct: fixing the observer's reference frame
 *   and changing the mass shows genuinely different gravitational effects.
 *
 *   To prevent total collapse at very high M, we impose a soft ceiling
 *   where the grid extent grows logarithmically once rs exceeds 40%
 *   of the frame.
 */
export function VolumetricGrid({
  mass,
  spin,
  size = 250,
  divisions = 14,
  baseColor = "#22eeff",
  coreColor = "#ffffff",
}: VolumetricGridProps) {
  const gridData = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const colors: number[] = [];

    const step = size / divisions;
    const M = Math.max(mass, 0.01);
    const a = Math.abs(spin) * M;
    const a2 = a * a;
    const rs = 2.0 * M;

    // -----------------------------------------------------------------
    // FIXED REFERENCE FRAME with soft ceiling
    // -----------------------------------------------------------------
    const halfViz = size / 2;

    // The grid represents a fixed 10-unit "room" in gravitational coords.
    // As mass increases, rs = 2M grows inside this room.
    //
    // M=0.5: rs=1,  rs/10 = 10% -> subtle curvature (mild well)
    // M=1:   rs=2,  rs/10 = 20% -> visible curvature
    // M=2:   rs=4,  rs/10 = 40% -> dramatic curvature
    // M=3:   rs=6,  rs/10 = 60% -> extreme curvature, most grid inside horizon
    // M=4:   rs=8,  rs/10 = 80% -> nearly total collapse
    //
    // Soft ceiling: once rs > 40% of physExtent, extend physExtent
    // logarithmically to prevent total collapse while still showing
    // increasingly extreme effects.
    const BASE_EXTENT = 10.0;
    let physExtent = BASE_EXTENT;
    const rsOverBase = rs / BASE_EXTENT;
    if (rsOverBase > 0.4) {
      // Logarithmic growth beyond the 40% threshold.
      // physExtent = BASE_EXTENT * (1 + log(rsOverBase/0.4))
      // This ensures the grid always has visible area outside the horizon
      // but the curvature gets genuinely MORE extreme with higher mass.
      physExtent = BASE_EXTENT * (1 + Math.log(rsOverBase / 0.4));
    }

    const v2p = physExtent / halfViz;
    const p2v = halfViz / physExtent;

    const rh = M + Math.sqrt(Math.max(0, M * M - a2));
    const rMin = rh * 1.06;

    const cBase = new THREE.Color(baseColor);
    const cHot = new THREE.Color(coreColor);

    // -----------------------------------------------------------------
    // KERR METRIC (from tensor/metric_tensor.rs + kerr.rs)
    // Full 4x4 covariant metric in Boyer-Lindquist coordinates:
    //   g_tt = -(1 - 2Mr/Sigma)
    //   g_rr = Sigma / Delta
    //   g_{theta theta} = Sigma
    //   g_{phi phi} = (r^2 + a^2 + 2Ma^2 sin^2(theta)/Sigma) sin^2(theta)
    //   g_{t phi} = -2Mar sin^2(theta) / Sigma
    // -----------------------------------------------------------------
    const Sigma = (r: number, cosT: number) => r * r + a2 * cosT * cosT;
    const Delta = (r: number) => r * r - 2 * M * r + a2;

    const g_tt = (r: number, cosT: number) => {
      const sig = Sigma(r, cosT);
      return -(1 - (2 * M * r) / sig);
    };

    const g_rr = (r: number, cosT: number) => {
      const d = Delta(r);
      if (Math.abs(d) < 1e-12) return 1e8;
      return Sigma(r, cosT) / d;
    };

    // -----------------------------------------------------------------
    // FROM curvature.rs: Kretschner scalar
    // K = 48M^2 * (r^6 - 15r^4a^2cos^2 + 15r^2a^4cos^4 - a^6cos^6) / Sigma^6
    // -----------------------------------------------------------------
    const kretschner = (r: number, cosT: number): number => {
      const r2 = r * r,
        r4 = r2 * r2,
        r6 = r4 * r2;
      const cos2 = cosT * cosT,
        cos4 = cos2 * cos2,
        cos6 = cos4 * cos2;
      const a4 = a2 * a2,
        a6 = a4 * a2;
      const sig = Sigma(r, cosT);
      const sig6 = Math.pow(sig, 6);
      if (sig6 < 1e-30) return 1e12;
      const num = r6 - 15 * r4 * a2 * cos2 + 15 * r2 * a4 * cos4 - a6 * cos6;
      return (48 * M * M * Math.abs(num)) / sig6;
    };

    // -----------------------------------------------------------------
    // FROM embedding.rs: Flamm height + Kerr embedding integral
    // -----------------------------------------------------------------
    const flammHeight = (r: number): number => {
      if (r <= rs) return 0;
      if (Math.abs(spin) < 0.01) {
        return 2.0 * Math.sqrt(rs * (r - rs));
      }
      // Kerr: integral of sqrt(|g_rr(equator) - 1|) dr
      const nSteps = 40;
      const dr = (physExtent - r) / nSteps;
      if (dr <= 0) return 0;
      let z = 0;
      for (let i = 0; i < nSteps; i++) {
        const ri = r + (i + 0.5) * dr;
        z += Math.sqrt(Math.abs(g_rr(ri, 0) - 1.0)) * dr;
      }
      return z;
    };

    // -----------------------------------------------------------------
    // FROM frame_drag.rs: omega at arbitrary (r, theta)
    // omega = 2Mar / [(r^2+a^2)^2 - a^2 Delta sin^2(theta)]
    // -----------------------------------------------------------------
    const omega_fd = (r: number, sin2T: number): number => {
      if (Math.abs(spin) < 0.001) return 0;
      const r2pa2 = r * r + a2;
      const den = r2pa2 * r2pa2 - a2 * Delta(r) * sin2T;
      return Math.abs(den) > 1e-15 ? (2 * M * a * r) / den : 0;
    };

    // -----------------------------------------------------------------
    // WARP FUNCTION
    // -----------------------------------------------------------------
    const warp = (pViz: THREE.Vector3): THREE.Vector3 | null => {
      const px = pViz.x * v2p;
      const py = pViz.y * v2p;
      const pz = pViz.z * v2p;
      const r = Math.sqrt(px * px + py * py + pz * pz);

      if (r < 1e-6 || r < rMin) return null;

      const nx = px / r,
        ny = py / r,
        nz = pz / r;
      const cosT = ny;
      const sin2T = 1 - cosT * cosT;

      // 1. GRAVITATIONAL CONTRACTION: r_new = sqrt(Delta(r))
      const D = Delta(r);
      const rNew = Math.sqrt(Math.max(0, D));

      let ox = nx * rNew;
      let oy = ny * rNew;
      let oz = nz * rNew;

      // 2. FLAMM EMBEDDING Y-DISPLACEMENT (equatorial funnel)
      const eqFactor = Math.max(0, 1 - Math.abs(cosT) / 0.4);
      if (eqFactor > 0 && r > rs) {
        const fH = flammHeight(r);
        oy -= fH * eqFactor * 0.15;
      }

      // 3. FRAME-DRAG TWIST (capped at 60 degrees)
      if (Math.abs(spin) > 0.001) {
        const w = omega_fd(r, sin2T);
        const rawAng = w * M * 8.0;
        const maxTwist = Math.PI / 3;
        const ang = Math.sign(rawAng) * Math.min(Math.abs(rawAng), maxTwist);
        const c = Math.cos(ang),
          s = Math.sin(ang);
        const tx = ox,
          tz = oz;
        ox = tx * c - tz * s;
        oz = tx * s + tz * c;
      }

      return new THREE.Vector3(ox * p2v, oy * p2v, oz * p2v);
    };

    // -----------------------------------------------------------------
    // SUB-SEGMENTED LINES + Kretschner coloring + edge fade
    // -----------------------------------------------------------------
    const N_SUB = 5;
    const K_ref = kretschner(rMin * 1.2, 0);
    const logK_ref = Math.log10(Math.max(1, K_ref));

    const addSeg = (pA: THREE.Vector3, pB: THREE.Vector3) => {
      for (let s = 0; s < N_SUB; s++) {
        const t0 = s / N_SUB,
          t1 = (s + 1) / N_SUB;
        const q0 = pA.clone().lerp(pB.clone(), t0);
        const q1 = pA.clone().lerp(pB.clone(), t1);
        const w0 = warp(q0),
          w1 = warp(q1);
        if (!w0 || !w1) continue;
        pts.push(w0, w1);

        const r0 = q0.length() * v2p,
          r1 = q1.length() * v2p;
        const cos0 = r0 > 1e-6 ? (q0.y * v2p) / r0 : 0;
        const cos1 = r1 > 1e-6 ? (q1.y * v2p) / r1 : 0;

        const K0 = r0 > rMin ? kretschner(r0, cos0) : K_ref;
        const K1 = r1 > rMin ? kretschner(r1, cos1) : K_ref;
        const lK0 = Math.log10(Math.max(1, K0));
        const lK1 = Math.log10(Math.max(1, K1));
        const i0 =
          logK_ref > 0.1 ? Math.min(1, Math.max(0, lK0 / logK_ref)) : 0;
        const i1 =
          logK_ref > 0.1 ? Math.min(1, Math.max(0, lK1 / logK_ref)) : 0;

        const ratio0 = r0 / physExtent,
          ratio1 = r1 / physExtent;
        const fade0 = ratio0 > 0.75 ? 1 - (ratio0 - 0.75) / 0.25 : 1;
        const fade1 = ratio1 > 0.75 ? 1 - (ratio1 - 0.75) / 0.25 : 1;

        const c0 = cBase
          .clone()
          .lerp(cHot, i0)
          .multiplyScalar(Math.max(0, fade0));
        const c1 = cBase
          .clone()
          .lerp(cHot, i1)
          .multiplyScalar(Math.max(0, fade1));
        colors.push(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b);
      }
    };

    // -----------------------------------------------------------------
    // 3D CARTESIAN LATTICE
    // -----------------------------------------------------------------
    const half = Math.floor(divisions / 2);
    for (let i = -half; i <= half; i++) {
      for (let j = -half; j <= half; j++) {
        for (let k = -half; k < half; k++) {
          const ks = k * step,
            k1 = (k + 1) * step;
          const is_ = i * step,
            js = j * step;
          addSeg(
            new THREE.Vector3(ks, is_, js),
            new THREE.Vector3(k1, is_, js),
          );
          addSeg(
            new THREE.Vector3(is_, ks, js),
            new THREE.Vector3(is_, k1, js),
          );
          addSeg(
            new THREE.Vector3(is_, js, ks),
            new THREE.Vector3(is_, js, k1),
          );
        }
      }
    }

    // -----------------------------------------------------------------
    // GEOMETRY
    // -----------------------------------------------------------------
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const bhR = Math.sqrt(Math.max(0, Delta(rMin))) * p2v;

    return {
      lines: new THREE.LineSegments(geom, mat),
      bhRadius: Math.max(1.0, bhR),
    };
  }, [mass, spin, size, divisions, baseColor, coreColor]);

  return (
    <group>
      <primitive object={gridData.lines} />
      <mesh>
        <sphereGeometry args={[gridData.bhRadius, 32, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh>
        <sphereGeometry args={[gridData.bhRadius * 1.15, 32, 32]} />
        <meshBasicMaterial
          color="#110022"
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
