"use client";

import React, { Suspense, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { VolumetricGrid } from "./VolumetricGrid";
import { ErgosphereMesh } from "./ErgosphereMesh";
import { LightCones } from "./LightCones";
import { FrameDragField } from "./FrameDragField";

type VisualizationMode =
  | "volumetric"
  | "ergosphere"
  | "lightcones"
  | "framedrag";

interface SpacetimeCanvasProps {
  mass?: number;
  spin?: number;
  className?: string;
}

/**
 * Spacetime Curvature Visualization using React Three Fiber.
 *
 * Provides four visualization modes:
 * 1. Embedding Diagram -- Flamm's paraboloid showing spatial curvature
 * 2. Ergosphere -- 3D oblate ergosphere surface with event horizon
 * 3. Light Cones -- Tilting light cones showing causal structure
 * 4. Frame Dragging -- Vector field showing inertial frame dragging
 *
 * All visualizations respond to mass and spin parameters from the
 * main simulation via shared state.
 */
export function SpacetimeCanvas({
  mass = 1.0,
  spin = 0.0,
  className = "",
}: SpacetimeCanvasProps) {
  const [mode, setMode] = useState<VisualizationMode>("volumetric");
  const [wireframe, setWireframe] = useState(false);

  const modeLabels: Record<VisualizationMode, string> = {
    volumetric: "Volumetric Grid",
    ergosphere: "Ergosphere",
    lightcones: "Light Cones",
    framedrag: "Frame Dragging",
  };

  const cycleMode = useCallback(() => {
    const modes: VisualizationMode[] = [
      "volumetric",
      "ergosphere",
      "lightcones",
      "framedrag",
    ];
    setMode((prev) => {
      const idx = modes.indexOf(prev);
      return modes[(idx + 1) % modes.length];
    });
  }, []);

  return (
    <div
      className={`spacetime-viz ${className}`}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 400,
        background: "#0a0a12",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Controls overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 24,
          zIndex: 10,
          display: "flex",
          gap: 8,
          flexDirection: "column",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.7)",
            borderRadius: 6,
            padding: "8px 14px",
            color: "#e0e0e0",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {modeLabels[mode]}
        </div>
        <button
          onClick={cycleMode}
          style={{
            background: "rgba(60,60,100,0.6)",
            border: "1px solid rgba(100,100,180,0.4)",
            borderRadius: 4,
            padding: "6px 12px",
            color: "#c0c0ff",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            cursor: "pointer",
            letterSpacing: "0.05em",
          }}
        >
          NEXT MODE
        </button>
        <button
          onClick={() => setWireframe((w) => !w)}
          style={{
            background: wireframe
              ? "rgba(80,120,80,0.6)"
              : "rgba(60,60,100,0.6)",
            border: "1px solid rgba(100,100,180,0.4)",
            borderRadius: 4,
            padding: "6px 12px",
            color: "#c0c0ff",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            cursor: "pointer",
            letterSpacing: "0.05em",
          }}
        >
          {wireframe ? "SOLID" : "WIREFRAME"}
        </button>
      </div>

      {/* Parameter display */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          right: 24,
          zIndex: 10,
          background: "rgba(0,0,0,0.7)",
          borderRadius: 6,
          padding: "8px 14px",
          color: "#888",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          lineHeight: 1.6,
          pointerEvents: "none",
        }}
      >
        <div>
          M = <span style={{ color: "#e0e0e0" }}>{mass.toFixed(2)}</span>
        </div>
        <div>
          a* = <span style={{ color: "#c0c0ff" }}>{spin.toFixed(3)}</span>
        </div>
        <div>
          r_h ={" "}
          <span style={{ color: "#ff8866" }}>
            {(
              mass +
              Math.sqrt(Math.max(0, mass * mass - spin * spin * mass * mass))
            ).toFixed(3)}
            M
          </span>
        </div>
      </div>

      <Canvas
        camera={{
          position: mode === "volumetric" ? [20, 15, 25] : [15, 8, 15],
          fov: 50,
          near: 0.1,
          far: 200,
        }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#0a0a12"]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} />
        <pointLight position={[0, -10, 0]} intensity={0.3} color="#4466ff" />

        <Suspense fallback={null}>
          {mode === "volumetric" && <VolumetricGrid mass={mass} spin={spin} />}

          {mode === "ergosphere" && (
            <ErgosphereMesh mass={mass} spin={spin} opacity={0.3} />
          )}

          {mode === "lightcones" && (
            <>
              <LightCones mass={mass} spin={spin} />
              {/* Reference horizon sphere */}
              <mesh>
                <sphereGeometry
                  args={[
                    mass +
                      Math.sqrt(
                        Math.max(0, mass * mass - spin * spin * mass * mass),
                      ),
                    24,
                    24,
                  ]}
                />
                <meshBasicMaterial color="#000000" />
              </mesh>
            </>
          )}

          {mode === "framedrag" && (
            <>
              <FrameDragField mass={mass} spin={spin} />
              <mesh>
                <sphereGeometry
                  args={[
                    mass +
                      Math.sqrt(
                        Math.max(0, mass * mass - spin * spin * mass * mass),
                      ),
                    24,
                    24,
                  ]}
                />
                <meshBasicMaterial color="#111" />
              </mesh>
            </>
          )}

          {/* Reference rings (skip in volumetric mode -- it has its own scaled system) */}
          {mode !== "volumetric" && <ReferenceRings mass={mass} spin={spin} />}
        </Suspense>

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={3}
          maxDistance={80}
        />

        {/* Ground grid via gridHelper primitive */}
        <GroundGrid />
      </Canvas>
    </div>
  );
}

/**
 * Simple ground grid using THREE.GridHelper via primitive.
 * Avoids issues with drei's <Grid> component args.
 */
function GroundGrid() {
  const grid = useMemo(() => {
    const g = new THREE.GridHelper(100, 50, "#2a2a4e", "#1a1a2e");
    g.position.y = -0.01;
    return g;
  }, []);
  return <primitive object={grid} />;
}

/**
 * Reference rings: ISCO, photon sphere, ergosphere equatorial.
 * These are drawn as thin circles in the equatorial plane.
 */
function ReferenceRings({ mass, spin }: { mass: number; spin: number }) {
  const a = Math.abs(spin) * mass;
  const a2 = a * a;

  // ISCO (exact Bardeen-Press-Teukolsky)
  const absS = Math.abs(spin);
  const z1 =
    1 +
    Math.pow(1 - absS * absS, 1 / 3) *
      (Math.pow(1 + absS, 1 / 3) + Math.pow(1 - absS, 1 / 3));
  const z2 = Math.sqrt(3 * absS * absS + z1 * z1);
  const isco =
    absS < 0.001
      ? 6 * mass
      : mass * (3 + z2 - Math.sqrt((3 - z1) * (3 + z1 + 2 * z2)));

  // Photon sphere
  const aStarClamped = Math.min(Math.max(-spin, -0.9999), 0.9999);
  const rPh = 2 * mass * (1 + Math.cos((2 / 3) * Math.acos(-aStarClamped)));

  // Ergosphere at equator
  const rErgo = mass + Math.sqrt(Math.max(0, mass * mass - a2));

  return (
    <group>
      <RingLine radius={isco} color="#44ff44" label="ISCO" y={0.05} />
      <RingLine radius={rPh} color="#ffaa22" label="Photon Sphere" y={0.1} />
      {Math.abs(spin) > 0.01 && (
        <RingLine radius={rErgo} color="#4466dd" label="Ergosphere" y={0.15} />
      )}
    </group>
  );
}

/**
 * Single ring rendered using THREE.Line via <primitive>.
 * This avoids the JSX <line> element issue in R3F v9 where the
 * reconciler can't resolve the THREE.Line constructor from lowercase "line".
 */
function RingLine({
  radius,
  color,
  label,
  y = 0,
}: {
  radius: number;
  color: string;
  label: string;
  y?: number;
}) {
  const lineObj = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      pts.push(
        new THREE.Vector3(
          radius * Math.cos(theta),
          y,
          radius * Math.sin(theta),
        ),
      );
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(pts);
    const material = new THREE.LineBasicMaterial({ color });
    return new THREE.Line(geometry, material);
  }, [radius, y, color]);

  // Label rendered as a simple sprite
  const sprite = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = color;
      ctx.font = "bold 28px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 4, 32);
    }
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    });
    const s = new THREE.Sprite(mat);
    s.scale.set(2.5, 0.625, 1);
    s.position.set(radius + 1.5, y + 0.5, 0);
    return s;
  }, [radius, y, color, label]);

  return (
    <group>
      <primitive object={lineObj} />
      <primitive object={sprite} />
    </group>
  );
}

export default SpacetimeCanvas;
