import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createDiskShader } from './shaders/diskShader';
import { createLensingShader } from './shaders/lensingShader';
import { createShaderMaterial, updateAspectRatio } from '../../utils/three';

interface BlackHoleSimulationProps {
  width?: number;
  height?: number;
  schwarzschildRadius?: number;
}

export const BlackHoleSimulation: React.FC<BlackHoleSimulationProps> = ({
  width = 800,
  height = 600,
  schwarzschildRadius = 1.0,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mountRef.current) return;

    // Wrap the effect code in a try-catch block
    try {
      // Scene setup
      console.log('Initializing scene...');
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        width / height,
        0.1,
        1000
      );
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      mountRef.current.appendChild(renderer.domElement);

      // Black hole parameters
      console.log('Setting up black hole parameters...');
      const diskInnerRadius = 3.0 * schwarzschildRadius;
      const diskOuterRadius = 20.0 * schwarzschildRadius;

      // Create materials using shader factories
      console.log('Creating shaders...');
      const diskShader = createDiskShader(diskInnerRadius, diskOuterRadius);
      const lensingShader = createLensingShader(schwarzschildRadius);

      // Create accretion disk with shader material
      console.log('Creating accretion disk...');
      const diskGeometry = new THREE.RingGeometry(
        diskInnerRadius,
        diskOuterRadius,
        64
      );
      const diskMaterial = createShaderMaterial(diskShader);
      const accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
      accretionDisk.rotation.x = Math.PI / 2; // Face the camera
      scene.add(accretionDisk);

      // Create event horizon with lensing effect
      console.log('Creating event horizon...');
      const eventHorizon = new THREE.Mesh(
        new THREE.SphereGeometry(schwarzschildRadius, 32, 32),
        createShaderMaterial(lensingShader)
      );
      scene.add(eventHorizon);

      // Lighting
      console.log('Adding lighting...');
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      // Animation loop
      console.log('Starting animation loop...');
      let time = 0;
      const animate = () => {
        time += 0.01;

        // Update uniforms
        diskMaterial.uniforms.time.value = time;

        // Update camera position
        camera.position.x = Math.sin(time * 0.1) * 40;
        camera.position.z = Math.cos(time * 0.1) * 40;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
      };

      // Start animation loop
      const renderLoop = () => {
        requestAnimationFrame(renderLoop);
        animate();
      };
      renderLoop();

      // Handle window resizing
      const handleResize = () => {
        if (mountRef.current) {
          updateAspectRatio(camera, renderer, mountRef.current);
        }
      };
      window.addEventListener('resize', handleResize);

      setLoading(false);

      // Cleanup
      return () => {
        mountRef.current?.removeChild(renderer.domElement);
        renderer.dispose();
        window.removeEventListener('resize', handleResize);
      };
    } catch (error) {
      console.error('An error occurred while initializing the simulation:', error);
    }
  }, [width, height, schwarzschildRadius]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-gray-900 p-4 rounded-lg">
        {loading ? (
          <div className="text-white text-center p-4">Loading simulation...</div>
        ) : (
          <div ref={mountRef} className="w-full aspect-video" />
        )}
      </div>
    </div>
  );
};