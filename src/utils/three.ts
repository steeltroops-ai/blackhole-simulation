// src/utils/three.ts
import * as THREE from 'three';
import { ShaderParameters } from '../types/shader';

export const createShaderMaterial = (
  parameters: ShaderParameters,
  options: THREE.ShaderMaterialParameters = {}
): THREE.ShaderMaterial => {
  const material = new THREE.ShaderMaterial({
    uniforms: parameters.uniforms,
    vertexShader: parameters.vertexShader,
    fragmentShader: parameters.fragmentShader,
    transparent: true,
    ...options
  });

  // Enable better rendering quality
  material.side = THREE.DoubleSide;
  material.depthWrite = true;
  material.depthTest = true;

  return material;
};

export const updateAspectRatio = (
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  container: HTMLElement
): void => {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const aspect = width / height;

  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
};

export const createRenderer = (
  options: THREE.WebGLRendererParameters = {}
): THREE.WebGLRenderer => {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    ...options
  });

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  return renderer;
};

export const createScene = (): THREE.Scene => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x000000, 0.001);
  return scene;
};

export const createCamera = (
  aspect: number,
  position: THREE.Vector3 = new THREE.Vector3(0, 20, 100)
): THREE.PerspectiveCamera => {
  const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  camera.position.copy(position);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  return camera;
};