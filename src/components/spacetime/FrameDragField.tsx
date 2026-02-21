"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

interface FrameDragFieldProps {
  mass: number;
  spin: number;
  nRadial?: number;
  nAngular?: number;
  nPolar?: number;
  arrowScale?: number;
}

/**
 * Frame-dragging vector field -- Physics Engine Integration.
 *
 * FROM frame_drag.rs:
 *   omega(r, theta) = -g_{t phi} / g_{phi phi}
 *                   = 2Mar / [(r^2+a^2)^2 - a^2 Delta sin^2(theta)]
 *
 *   This is the angular velocity at which a zero-angular-momentum
 *   observer (ZAMO) is forced to orbit the black hole.
 *
 * IMPROVEMENT over previous version:
 *   - Previous: only equatorial arrows (theta = PI/2)
 *   - Now: arrows at MULTIPLE LATITUDES showing the full theta-dependence
 *     of frame dragging, matching frame_drag.rs::frame_drag_field()
 *   - The Rust engine generates (r, theta, omega) tuples at arbitrary
 *     polar angles. We now do the same in the frontend.
 *
 * FROM frame_drag.rs::ergosphere_mesh():
 *   r_ergo(theta) = M + sqrt(M^2 - a^2 cos^2(theta))
 *   The ergosphere is where g_tt > 0 (static limit surface).
 *   Inside, frame dragging is so strong that nothing can remain static.
 */
export function FrameDragField({
  mass,
  spin,
  nRadial = 6,
  nAngular = 12,
  nPolar = 3,
  arrowScale = 3.0,
}: FrameDragFieldProps) {
  const arrowObjects = useMemo(() => {
    const M = mass;
    const a = spin * M;
    const a2 = a * a;
    const rh = M + Math.sqrt(Math.max(0, M * M - a2));

    if (Math.abs(spin) < 0.01) return [];

    // Kerr metric functions
    const Delta = (r: number) => r * r - 2 * M * r + a2;

    /**
     * FROM frame_drag.rs: frame_dragging_omega()
     * omega = 2Mar / [(r^2+a^2)^2 - a^2 * Delta * sin^2(theta)]
     *
     * Full theta-dependent formula from the Rust physics engine.
     */
    const frameDragOmega = (r: number, theta: number): number => {
      const sin2T = Math.sin(theta) ** 2;
      const r2pa2 = r * r + a2;
      const den = r2pa2 * r2pa2 - a2 * Delta(r) * sin2T;
      return Math.abs(den) > 1e-15 ? (2 * M * a * r) / den : 0;
    };

    const result: THREE.ArrowHelper[] = [];

    // FROM frame_drag.rs::frame_drag_field():
    // Generate arrows at multiple (r, theta) positions,
    // not just the equatorial plane.
    const polarAngles: number[] = [];
    for (let p = 0; p < nPolar; p++) {
      // theta from ~30deg to ~150deg (skip poles where sin(theta)~0)
      const theta = 0.1 + ((Math.PI - 0.2) * (p + 0.5)) / nPolar;
      polarAngles.push(theta);
    }

    for (let i = 0; i < nRadial; i++) {
      const t = (i + 1) / (nRadial + 1);
      const r = rh * 1.1 + (12.0 * M - rh * 1.1) * t;

      for (const theta of polarAngles) {
        const sinT = Math.sin(theta);
        const cosT = Math.cos(theta);

        // Compute omega at this (r, theta) using the full formula
        const omega = frameDragOmega(r, theta);

        for (let j = 0; j < nAngular; j++) {
          const phi = (j / nAngular) * Math.PI * 2;

          // Cartesian position on the sphere at (r, theta, phi)
          const x = r * sinT * Math.cos(phi);
          const y = r * cosT;
          const z = r * sinT * Math.sin(phi);

          // Arrow direction: tangential (phi direction) in 3D
          // dphi unit vector at (theta, phi):
          //   e_phi = (-sin(phi), 0, cos(phi))
          const dx = -Math.sin(phi) * omega * arrowScale;
          const dz = Math.cos(phi) * omega * arrowScale;

          const length = Math.sqrt(dx * dx + dz * dz);
          if (length < 1e-6) continue;

          const dir = new THREE.Vector3(dx, 0, dz).normalize();
          const origin = new THREE.Vector3(x, y, z);

          // Color: blue (weak) -> red (strong)
          // Normalize by horizon angular velocity
          const omegaH = Math.abs(spin) > 0.01 ? a / (2 * M * rh) : 0.5;
          const strength = Math.min(1, Math.abs(omega) / omegaH);
          const color = new THREE.Color().setHSL(
            0.65 - strength * 0.65,
            0.9,
            0.5,
          );

          const arrow = new THREE.ArrowHelper(
            dir,
            origin,
            length,
            color.getHex(),
            length * 0.3,
            length * 0.15,
          );
          result.push(arrow);
        }
      }
    }

    return result;
  }, [mass, spin, nRadial, nAngular, nPolar, arrowScale]);

  return (
    <group>
      {arrowObjects.map((arrow, idx) => (
        <primitive key={idx} object={arrow} />
      ))}
    </group>
  );
}
