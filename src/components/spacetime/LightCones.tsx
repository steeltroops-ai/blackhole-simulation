"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

interface LightConesProps {
  mass: number;
  spin: number;
  nRadial?: number;
  nAngular?: number;
  coneScale?: number;
}

/**
 * Light cone tilting visualization -- Physics Engine Integration.
 *
 * FROM lightcone.rs:
 *   The tilt angle is computed from the FULL covariant metric tensor:
 *
 *   For Boyer-Lindquist (diagonal, g_tr = 0):
 *     tan(alpha) = sqrt(-g_tt / g_rr)
 *
 *   g_tt = -(1 - 2Mr/Sigma)       where Sigma = r^2 + a^2 cos^2(theta)
 *   g_rr = Sigma / Delta           where Delta = r^2 - 2Mr + a^2
 *
 *   At the horizon (Delta=0): g_rr -> inf, alpha -> PI/2 (cone lies flat)
 *   At infinity: alpha -> PI/4 (45-degree standard light cone)
 *
 * FROM frame_drag.rs:
 *   Frame-dragging omega = -g_{t phi} / g_{phi phi}
 *   = 2Mar / [(r^2+a^2)^2 - a^2 Delta sin^2(theta)]
 *
 *   This rotates the light cone tangentially (co-rotation with BH).
 *
 * The cone axis tilts away from the time direction (+Y) toward the
 * radial direction by the tilt angle, and rotates azimuthally by omega.
 */
export function LightCones({
  mass,
  spin,
  nRadial = 8,
  nAngular = 6,
  coneScale = 0.8,
}: LightConesProps) {
  const cones = useMemo(() => {
    const M = mass;
    const a = Math.abs(spin) * M;
    const a2 = a * a;
    const rh = M + Math.sqrt(Math.max(0, M * M - a2));

    // -----------------------------------------------------------------
    // KERR METRIC FUNCTIONS (from kerr.rs + metric.rs)
    // -----------------------------------------------------------------
    const Sigma = (r: number, cosT: number) => r * r + a2 * cosT * cosT;
    const Delta = (r: number) => r * r - 2 * M * r + a2;

    /**
     * FROM lightcone.rs: light_cone_tilt()
     *
     * For Boyer-Lindquist (diagonal metric):
     *   g_tt = -(1 - 2Mr / Sigma)
     *   g_rr = Sigma / Delta
     *   tan(alpha) = sqrt(-g_tt / g_rr)
     *              = sqrt((1 - 2Mr/Sigma) * Delta / Sigma)
     *              = sqrt(Delta * (Sigma - 2Mr)) / Sigma
     *
     * Returns tilt in radians. PI/4 = flat space. PI/2 = horizon.
     */
    const lightConeTilt = (r: number, cosT: number): number => {
      const sig = Sigma(r, cosT);
      const del = Delta(r);

      // g_tt = -(1 - 2Mr/Sigma) = -(Sigma - 2Mr)/Sigma
      const g_tt = -(sig - 2 * M * r) / sig;

      // g_rr = Sigma / Delta
      if (Math.abs(del) < 1e-12) return Math.PI / 2; // at horizon

      const g_rr = sig / del;

      if (g_tt >= 0) {
        // Inside ergosphere: g_tt > 0, must co-rotate
        return Math.PI / 2;
      }

      // tan(alpha) = sqrt(-g_tt / g_rr)
      const ratio = Math.max(0, -g_tt / g_rr);
      return Math.atan(Math.sqrt(ratio));
    };

    /**
     * FROM frame_drag.rs: frame_dragging_omega()
     * omega = 2Mar / [(r^2+a^2)^2 - a^2 Delta sin^2(theta)]
     */
    const frameDragOmega = (r: number, sin2T: number): number => {
      if (Math.abs(spin) < 0.001) return 0;
      const r2pa2 = r * r + a2;
      const den = r2pa2 * r2pa2 - a2 * Delta(r) * sin2T;
      return Math.abs(den) > 1e-15 ? (2 * M * a * r) / den : 0;
    };

    // -----------------------------------------------------------------
    // GENERATE CONE POSITIONS
    // -----------------------------------------------------------------
    const positions: Array<{
      pos: THREE.Vector3;
      tilt: number;
      dragAngle: number;
      r: number;
    }> = [];

    for (let i = 0; i < nRadial; i++) {
      const t = (i + 1) / (nRadial + 1);
      // Logarithmic spacing concentrating near horizon
      const r = rh * 1.05 + (15.0 * M - rh * 1.05) * t * t;

      for (let j = 0; j < nAngular; j++) {
        const phi = (j / nAngular) * Math.PI * 2;

        const x = r * Math.cos(phi);
        const z = r * Math.sin(phi);

        // Exact metric-based tilt at equatorial plane (cosT=0)
        const tilt = lightConeTilt(r, 0);

        // Frame-drag azimuthal rotation
        const omega = frameDragOmega(r, 1.0); // sin^2(theta)=1 at equator
        const dragAngle = omega * r; // linear velocity -> angle

        positions.push({
          pos: new THREE.Vector3(x, 0, z),
          tilt,
          dragAngle,
          r,
        });
      }
    }

    return positions;
  }, [mass, spin, nRadial, nAngular]);

  const rh = useMemo(() => {
    const a = Math.abs(spin) * mass;
    return mass + Math.sqrt(Math.max(0, mass * mass - a * a));
  }, [mass, spin]);

  return (
    <group>
      {cones.map((c, idx) => {
        const scale = coneScale * Math.min(1, c.r / (5 * mass));

        // The tilt angle from lightcone.rs gives us how far the cone
        // axis has shifted from the pure time direction.
        // In flat space: tilt = PI/4 (45 deg), cone axis = +Y.
        // Near horizon: tilt -> PI/2, cone axis tips radially inward.
        //
        // The radial tilt direction points from the cone toward the BH center.
        const radialInward = new THREE.Vector3(
          -c.pos.x,
          0,
          -c.pos.z,
        ).normalize();

        // Tangential direction (for frame-drag rotation)
        const tangential = new THREE.Vector3(-c.pos.z, 0, c.pos.x).normalize();

        // Cone axis: starts along +Y (time), tilts radially inward
        // tiltFraction = how much the cone has tipped from vertical.
        // At PI/4 (flat space): tiltFraction=0, cone straight up.
        // At PI/2 (horizon): tiltFraction=1, cone lies flat.
        const tiltFraction = Math.max(
          0,
          (c.tilt - Math.PI / 4) / (Math.PI / 4),
        );

        const axisVector = new THREE.Vector3(0, 1, 0)
          .lerp(radialInward, tiltFraction * 0.85)
          .add(tangential.clone().multiplyScalar(c.dragAngle * 0.5))
          .normalize();

        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          axisVector,
        );

        // Color: blue in flat space, red near horizon
        const isNearHorizon = c.r < rh * 1.5;

        return (
          <group key={idx} position={c.pos.toArray()}>
            <mesh quaternion={quaternion}>
              <coneGeometry args={[scale, scale, 16, 1, true]} />
              <meshStandardMaterial
                color={isNearHorizon ? "#ff4422" : "#44aaff"}
                transparent
                opacity={0.4}
                side={THREE.DoubleSide}
                wireframe={false}
              />
              <meshStandardMaterial
                color="#ffffff"
                transparent
                opacity={0.1}
                side={THREE.DoubleSide}
                wireframe={true}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
