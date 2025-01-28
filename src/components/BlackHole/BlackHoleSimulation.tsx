import React, { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // Sky and Background
    const skyGeo = new THREE.SphereGeometry(500, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      ...skyShader,
      side: THREE.BackSide,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    // Black Hole
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const blackHoleMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const blackHole = new THREE.Mesh(geometry, blackHoleMaterial);
    scene.add(blackHole);

    // Accretion Disk
    const diskGeometry = new THREE.RingGeometry(1.5, 3, 64);
    const diskMaterial = new THREE.ShaderMaterial({
      ...diskShader,
      uniforms: {
        time: { value: 0 },
        mass: { value: mass },
        spin: { value: spin },
      },
    });
    const disk = new THREE.Mesh(diskGeometry, diskMaterial);
    disk.rotation.x = -Math.PI / 2;
    scene.add(disk);

    // Gravitational Lensing Screen
    const screenGeometry = new THREE.PlaneGeometry(2, 2);
    const screenMaterial = new THREE.ShaderMaterial({
      ...lensingShader,
      uniforms: {
        time: { value: 0 },
        mass: { value: mass },
        spin: { value: spin },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      },
      side: THREE.DoubleSide,
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = -1;
    scene.add(screen);

    // Stars
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      starVertices.push(x, y, z);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    camera.position.z = 5;
    const controls = new OrbitControls(camera, renderer.domElement);

    // Post-processing setup
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    composer.addPass(bloomPass);

    const postProcessingPass = new ShaderPass(postProcessingShader);
    composer.addPass(postProcessingPass);

    const animate = () => {
      requestAnimationFrame(animate);

      diskMaterial.uniforms.time.value += 0.01;
      screenMaterial.uniforms.time.value += 0.01;
      skyMat.uniforms.time.value += 0.001;

      composer.render();
    };

    animate();

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      screenMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [mass, spin]);

  return <div ref={mountRef} style={{ width: '100%', height: '100vh' }} />;
};

export default BlackHoleSimulation;