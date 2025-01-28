// src/components/BlackHole/BlackHoleSimulation.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { createDiskShader } from './shaders/diskShader';
import { createLensingShader } from './shaders/lensingShader';
import { createShaderMaterial, updateAspectRatio } from '../../utils/three';

interface BlackHoleSimulationProps {
  width: number;
  height: number;
  schwarzschildRadius: number;
}

export const BlackHoleSimulation: React.FC<BlackHoleSimulationProps> = ({
  width,
  height,
  schwarzschildRadius,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameIdRef = useRef<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeScene = useCallback(() => {
    if (!mountRef.current) return;

    // Create Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 40;
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Create Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    // Clear mount point
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    mountRef.current.appendChild(renderer.domElement);

    // Create Black Hole Components
    const diskInnerRadius = 3.0 * schwarzschildRadius;
    const diskOuterRadius = 20.0 * schwarzschildRadius;

    // Create Accretion Disk
    const diskGeometry = new THREE.RingGeometry(
      diskInnerRadius,
      diskOuterRadius,
      64
    );
    const diskMaterial = createShaderMaterial(
      createDiskShader(diskInnerRadius, diskOuterRadius)
    );
    const accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
    accretionDisk.rotation.x = Math.PI / 2;
    scene.add(accretionDisk);

    // Create Event Horizon
    const eventHorizonGeometry = new THREE.SphereGeometry(
      schwarzschildRadius,
      32,
      32
    );
    const eventHorizonMaterial = createShaderMaterial(
      createLensingShader(schwarzschildRadius)
    );
    const eventHorizon = new THREE.Mesh(
      eventHorizonGeometry,
      eventHorizonMaterial
    );
    scene.add(eventHorizon);

    // Add Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    return { scene, camera, renderer, diskMaterial, eventHorizonMaterial };
  }, [width, height, schwarzschildRadius]);

  const animate = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const time = Date.now() * 0.001;

    // Update camera position
    cameraRef.current.position.x = Math.sin(time * 0.1) * 40;
    cameraRef.current.position.z = Math.cos(time * 0.1) * 40;
    cameraRef.current.lookAt(0, 0, 0);

    // Render scene
    rendererRef.current.render(sceneRef.current, cameraRef.current);

    // Continue animation loop
    frameIdRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    try {
      const components = initializeScene();
      if (components) {
        setLoading(false);
        animate();
      }
    } catch (err) {
      console.error('Failed to initialize simulation:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setLoading(false);
    }

    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [initializeScene, animate]);

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="simulation-container" style={{ width, height }}>
      {loading ? (
        <div className="loading-overlay">
          Loading simulation...
        </div>
      ) : (
        <div 
          ref={mountRef}
          className="w-full h-full"
          style={{ minHeight: `${height}px` }}
        />
      )}
    </div>
  );
};