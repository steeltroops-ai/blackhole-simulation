"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

interface ErgosphereMeshProps {
  mass: number;
  spin: number;
  nPolar?: number;
  nAzimuthal?: number;
  opacity?: number;
}

/**
 * Ergosphere surface visualization.
 *
 * The ergosphere is the oblate region between the event horizon and the
 * static limit surface where frame-dragging forces all objects to co-rotate.
 *
 * r_ergo(theta) = M + sqrt(M^2 - a^2 cos^2(theta))
 *
 * For a=0: ergosphere coincides with horizon (no ergosphere)
 * For a=M: ergosphere extends to r=2M at equator (maximal)
 */
export function ErgosphereMesh({
  mass,
  spin,
  nPolar = 48,
  nAzimuthal = 48,
  opacity = 0.25,
}: ErgosphereMeshProps) {
  const geometry = useMemo(() => {
    const a = Math.abs(spin) * mass;
    const a2 = a * a;
    const rh = mass + Math.sqrt(Math.max(0, mass * mass - a2));

    const vertices: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= nPolar; i++) {
      const theta = (i / nPolar) * Math.PI;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      // Ergosphere radius
      const disc = mass * mass - a2 * cosT * cosT;
      const rErgo = mass + Math.sqrt(Math.max(0, disc));

      for (let j = 0; j <= nAzimuthal; j++) {
        const phi = (j / nAzimuthal) * Math.PI * 2;

        const x = rErgo * sinT * Math.cos(phi);
        const y = rErgo * cosT;
        const z = rErgo * sinT * Math.sin(phi);
        vertices.push(x, y, z);

        // Normal (outward from center)
        const nl = Math.sqrt(x * x + y * y + z * z) || 1;
        normals.push(x / nl, y / nl, z / nl);
      }
    }

    for (let i = 0; i < nPolar; i++) {
      for (let j = 0; j < nAzimuthal; j++) {
        const curr = i * (nAzimuthal + 1) + j;
        const next = curr + nAzimuthal + 1;
        indices.push(curr, next, curr + 1);
        indices.push(curr + 1, next, next + 1);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geom.setIndex(indices);

    return geom;
  }, [mass, spin, nPolar, nAzimuthal]);

  // Event horizon sphere (inner)
  const horizonRadius = useMemo(() => {
    const a = Math.abs(spin) * mass;
    return mass + Math.sqrt(Math.max(0, mass * mass - a * a));
  }, [mass, spin]);

  return (
    <group>
      {/* Ergosphere (outer, transparent) */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#4466dd"
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Event horizon (inner, opaque black sphere) */}
      <mesh>
        <sphereGeometry args={[horizonRadius, 32, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
    </group>
  );
}
