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
  const aspect = width / height;

  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

export const createRenderer = (
  options: THREE.WebGLRendererParameters = {}
): THREE.WebGLRenderer => {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    ...options,
  });

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  return renderer;
};