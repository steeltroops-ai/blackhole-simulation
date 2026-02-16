import { useRef, useEffect } from "react";
import { WebGPURenderer } from "@/rendering/webgpu/renderer";
import type { SimulationParams, MouseState } from "@/types/simulation";
import type { CameraUniforms, PhysicsParams } from "@/types/webgpu";
import { vec3, mat4 } from "gl-matrix";

interface WebGPUCanvasProps {
  params: SimulationParams;
  mouse: MouseState;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onWheel?: (e: React.WheelEvent | WheelEvent) => void;
  onTouchStart?: (e: React.TouchEvent | TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent | TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent | TouchEvent) => void;
  onMetricsUpdate?: (metrics: any) => void; // TODO: specific type
}

import { SIMULATION_CONFIG } from "@/configs/simulation.config";

export const WebGPUCanvas = ({
  params,
  mouse,
  onMetricsUpdate,
  ...handlers
}: WebGPUCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGPURenderer | null>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current || rendererRef.current) return;

    const init = async () => {
      const renderer = new WebGPURenderer();
      const success = await renderer.init(canvasRef.current!);
      if (success) {
        // Initial settings
        const quality = params.features?.rayTracingQuality || "high";
        const steps = SIMULATION_CONFIG.rayTracingSteps[quality] || 150;
        await renderer.initPipelines(renderer.getFormat(), steps);
        rendererRef.current = renderer;
        startLoop();
      } else {
        console.error("Failed to init WebGPU renderer");
      }
    };
    init();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []); // Only init once, subsequent updates via other effects

  useEffect(() => {
    if (rendererRef.current && params.features?.rayTracingQuality) {
      const steps =
        SIMULATION_CONFIG.rayTracingSteps[params.features.rayTracingQuality] ||
        150;
      rendererRef.current.updateSettings(steps);
    }
  }, [params.features?.rayTracingQuality]);

  const startLoop = () => {
    const loop = (t: number) => {
      if (rendererRef.current) {
        renderFrame(t);
      }
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
  };

  const renderFrame = (timestamp: number) => {
    const renderer = rendererRef.current!;
    const canvas = canvasRef.current!;

    // Resize
    const dpr = window.devicePixelRatio || 1;
    // Use client dimensions
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // Check if the canvas is not the same size.
    const needResize =
      canvas.width !== displayWidth * dpr ||
      canvas.height !== displayHeight * dpr;

    if (needResize) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      renderer.resize(canvas.width, canvas.height);
    }

    const width = canvas.width;
    const height = canvas.height;

    // Compute Camera Matrices (Simple Orbit)
    const zoom = Math.max(2.1, params.zoom); // Keep outside horizon (r=2)
    // Map mouse [0,1] to angles. 0.5 is center.
    // Assume mouse.x/y are normalized [0,1]
    const theta = (mouse.x - 0.5) * Math.PI * 4.0; // Horizontal rotation
    const phi = (mouse.y - 0.5) * Math.PI * 2.0; // Vertical rotation

    // Clamp vertical to avoid gimbal lock or flipping (keep simple)
    const clampedPhi = Math.max(
      -Math.PI / 2 + 0.1,
      Math.min(Math.PI / 2 - 0.1, phi),
    );

    // Position (Spherical to Cartesian)
    // x = r sin(theta) cos(phi)
    // y = r sin(phi)
    // z = r cos(theta) cos(phi)
    // Note: Y-up world
    const eye = vec3.fromValues(
      zoom * Math.sin(theta) * Math.cos(clampedPhi),
      zoom * Math.sin(clampedPhi),
      zoom * Math.cos(theta) * Math.cos(clampedPhi),
    );

    const target = vec3.fromValues(0, 0, 0);
    const up = vec3.fromValues(0, 1, 0);

    const view = mat4.create();
    mat4.lookAt(view, eye, target, up);

    const proj = mat4.create();
    const fov = (60 * Math.PI) / 180;
    mat4.perspective(proj, fov, width / height, 0.1, 1000.0);

    const invView = mat4.create();
    mat4.invert(invView, view);

    const invProj = mat4.create();
    mat4.invert(invProj, proj);

    const dir = vec3.create();
    vec3.subtract(dir, target, eye);
    vec3.normalize(dir, dir);

    // Construct Uniforms
    const cameraUniforms: CameraUniforms = {
      viewMatrix: view as Float32Array,
      projectionMatrix: proj as Float32Array,
      inverseView: invView as Float32Array,
      inverseProjection: invProj as Float32Array,
      position: new Float32Array([eye[0], eye[1], eye[2], 0]), // vec3 + pad
      direction: new Float32Array([dir[0], dir[1], dir[2], 0]), // vec3 + pad
    };

    // Physics Param filtering
    const physSpin = Math.max(-1.0, Math.min(1.0, params.spin / 5.0));

    const physParams: PhysicsParams = {
      mass: params.mass,
      spin: physSpin,
      resolution: [width, height],
      time: timestamp / 1000.0,
      dt: 0.016,
      _padding: [0, 0],
    };

    renderer.render(cameraUniforms, physParams);
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full z-0 cursor-move"
      {...handlers}
    />
  );
};
