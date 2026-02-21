"use client";

import React, { useMemo } from "react";
import * as THREE from "three";

interface EmbeddingDiagramProps {
  mass: number;
  spin: number;
  nRadial?: number;
  nAngular?: number;
  colorScheme?: "curvature" | "redshift" | "flat";
}

/**
 * Flamm's Paraboloid -- the classic "rubber sheet" embedding diagram.
 *
 * For Schwarzschild (a=0): z(r) = 2 * sqrt(r_s * (r - r_s))
 * For Kerr: z(r) integrated from sqrt(g_rr - 1) dr
 *
 * This shows how the spatial geometry is curved -- the depth of the
 * funnel represents the warping of space around the black hole.
 */
export function EmbeddingDiagram({
  mass,
  spin,
  nRadial = 80,
  nAngular = 64,
  colorScheme = "curvature",
}: EmbeddingDiagramProps) {
  const geometry = useMemo(() => {
    const rs = 2.0 * mass;
    const a = Math.abs(spin) * mass;
    const a2 = a * a;
    const rh = mass + Math.sqrt(Math.max(0, mass * mass - a2));
    const rMin = rh * 1.01; // Just outside horizon
    const rMax = 15.0 * mass;

    const vertices: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    // Compute embedding height z(r) via numerical integration
    // dz/dr = sqrt(g_rr - 1) for the equatorial slice
    const heights: number[] = [];
    let z = 0;
    const dr = (rMax - rMin) / nRadial;

    for (let i = 0; i <= nRadial; i++) {
      const r = rMin + i * dr;
      if (i > 0) {
        // g_rr for Kerr at equator (theta = pi/2):
        // g_rr = (r^2 + a^2 cos^2(pi/2)) / (r^2 - 2Mr + a^2) = r^2 / Delta
        const sigma = r * r; // at equator
        const delta = r * r - 2 * mass * r + a2;
        const grr = delta > 0 ? sigma / delta : 100.0;

        // Embedding: dz/dr = sqrt(|g_rr - 1|)
        const integrand = Math.sqrt(Math.max(0, grr - 1.0));
        z -= integrand * dr; // Negative because funnel goes down
      }
      heights.push(z);
    }

    // Generate mesh vertices
    for (let i = 0; i <= nRadial; i++) {
      const r = rMin + i * dr;
      const t = i / nRadial; // 0..1

      for (let j = 0; j <= nAngular; j++) {
        const phi = (j / nAngular) * Math.PI * 2;
        const x = r * Math.cos(phi);
        const y = heights[i];
        const zCoord = r * Math.sin(phi);

        vertices.push(x, y, zCoord);

        // Normal (approximate via cross product of tangent vectors)
        // Tangent in r-direction
        const h_next = i < nRadial ? heights[i + 1] : heights[i];
        const h_prev = i > 0 ? heights[i - 1] : heights[i];
        const dy_dr = (h_next - h_prev) / (2 * dr);

        const nx = -dy_dr * Math.cos(phi);
        const ny = 1.0;
        const nz = -dy_dr * Math.sin(phi);
        const nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
        normals.push(nx / nl, ny / nl, nz / nl);

        // Vertex color based on scheme
        if (colorScheme === "curvature") {
          // Kretschner scalar proxy: K ~ 1/r^6 for Schwarzschild
          const curvature = Math.min(1, (rs / r) ** 3);
          // Hot colormap: black -> red -> orange -> yellow -> white
          const cr = Math.min(1, curvature * 4);
          const cg = Math.max(0, Math.min(1, (curvature - 0.25) * 4));
          const cb = Math.max(0, Math.min(1, (curvature - 0.5) * 2));
          colors.push(cr, cg, cb);
        } else if (colorScheme === "redshift") {
          // Gravitational redshift: g = sqrt(1 - rs/r)
          const g = Math.sqrt(Math.max(0, 1 - rs / r));
          colors.push(1 - g, 0.2, g); // Red (high redshift) -> Blue (flat)
        } else {
          // Flat gray with subtle gradient
          const brightness = 0.3 + 0.5 * t;
          colors.push(brightness, brightness, brightness * 1.1);
        }
      }
    }

    // Generate triangle indices
    for (let i = 0; i < nRadial; i++) {
      for (let j = 0; j < nAngular; j++) {
        const a = i * (nAngular + 1) + j;
        const b = a + nAngular + 1;
        indices.push(a, b, a + 1);
        indices.push(a + 1, b, b + 1);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geom.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geom.setIndex(indices);

    return geom;
  }, [mass, spin, nRadial, nAngular, colorScheme]);

  return (
    <mesh geometry={geometry} rotation={[0, 0, 0]}>
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        metalness={0.3}
        roughness={0.6}
        wireframe={false}
      />
    </mesh>
  );
}
