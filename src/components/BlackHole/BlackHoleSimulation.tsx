// BlackHoleSimulation.tsx improvements

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import diskShader from './shaders/diskShader';
import lensingShader from './shaders/lensingShader';
import postProcessingShader from './shaders/postProcessingShader';
import skyShader from './shaders/skyShader';

interface BlackHoleProps {
  mass: number;
  spin: number;
}

const BlackHoleSimulation: React.FC<BlackHoleProps> = ({ mass, spin }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const composerRef = useRef<EffectComposer>();
  const frameIdRef = useRef<number>();

  // Use useMemo for performance optimization
  const uniforms = useMemo(() => ({
    time: { value: 0 },
    mass: { value: mass },
    spin: { value: spin },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  }), [mass, spin]);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Add Sky Background
    const skyGeometry = new THREE.SphereGeometry(500, 60, 40);
    const skyMaterial = new THREE.ShaderMaterial({
      ...skyShader,
      uniforms: {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      side: THREE.BackSide,
      depthWrite: false
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);

    // Black Hole
    const schwarzschildRadius = 2 * mass;  // Proper scaling with mass
    const blackHoleGeometry = new THREE.SphereGeometry(schwarzschildRadius, 32, 32);
    const blackHoleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x000000,
      side: THREE.DoubleSide
    });
    const blackHole = new THREE.Mesh(blackHoleGeometry, blackHoleMaterial);
    scene.add(blackHole);

    // Improved Accretion Disk
    const innerRadius = 3 * schwarzschildRadius; // Inner stable orbit
    const outerRadius = 6 * schwarzschildRadius; // Smaller outer radius
    const diskGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64, 8);
    
    // Create both sides of the disk
    const diskMaterialFront = new THREE.ShaderMaterial({
      ...diskShader,
      uniforms: {
        time: { value: 0 },
        mass: { value: mass },
        spin: { value: spin },
        side: { value: 1.0 }, // Front side flag
      },
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: true,
    });

    const diskMaterialBack = new THREE.ShaderMaterial({
      ...diskShader,
      uniforms: {
        time: { value: 0 },
        mass: { value: mass },
        spin: { value: spin },
        side: { value: -1.0 }, // Back side flag
      },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: true,
    });

    // Create two disks for front and back
    const diskFront = new THREE.Mesh(diskGeometry, diskMaterialFront);
    const diskBack = new THREE.Mesh(diskGeometry, diskMaterialBack);
    
    // Set proper rotation and position
    diskFront.rotation.x = -Math.PI / 2;
    diskBack.rotation.x = -Math.PI / 2;
    
    scene.add(diskFront);
    scene.add(diskBack);

    // Adjust camera position for better view
    camera.position.set(0, 20, 30);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5 * schwarzschildRadius;
    controls.maxDistance = 50 * schwarzschildRadius;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Update disk shader uniforms
      diskMaterialFront.uniforms.time.value += 0.01;
      diskMaterialBack.uniforms.time.value += 0.01;
      skyMaterial.uniforms.time.value += 0.001; // Update sky animation
      
      controls.update();
      renderer.render(scene, camera);
    };

    animate();


    // Resize handler
    const handleResize = () => {
      if (!camera || !renderer) return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      composerRef.current?.setSize(width, height);
      
      uniforms.resolution.value.set(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      controls.dispose();
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [mass, spin, uniforms]);

  return <div ref={mountRef} style={{ width: '100%', height: '100vh' }} />;
};

export default BlackHoleSimulation;