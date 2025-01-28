import * as THREE from 'three';
import { ShaderParameters } from '../components/BlackHole/types';

export const createShaderMaterial = (
  parameters: ShaderParameters,
  options: THREE.ShaderMaterialParameters = {}
): THREE.ShaderMaterial => {
  return new THREE.ShaderMaterial({
    uniforms: parameters.uniforms,
    vertexShader: parameters.vertexShader,
    fragmentShader: parameters.fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    ...options,
  });
};

export const updateAspectRatio = (
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  container: HTMLElement
) => {
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
};

export const createScene = (): THREE.Scene => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  return scene;
};

export const createCamera = (
  width: number,
  height: number
): THREE.PerspectiveCamera => {
  const camera = new THREE.PerspectiveCamera(
    75, // Field of view
    width / height, // Aspect ratio
    0.1, // Near plane
    1000 // Far plane
  );
  
  camera.position.z = 40;
  camera.lookAt(0, 0, 0);
  
  return camera;
};

export const createRenderer = (
  width: number,
  height: number,
  options: THREE.WebGLRendererParameters = {}
): THREE.WebGLRenderer => {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    ...options,
  });
  
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  return renderer;
};

export const handleWindowResize = (
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  container: HTMLElement
) => {
  const onResize = () => {
    updateAspectRatio(camera, renderer, container);
  };
  
  window.addEventListener('resize', onResize);
  
  return () => {
    window.removeEventListener('resize', onResize);
  };
};