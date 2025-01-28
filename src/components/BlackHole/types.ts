import * as THREE from 'three';

export interface BaseUniforms {
  time: { value: number };
  resolution: { value: THREE.Vector2 };
}

export interface DiskUniforms extends BaseUniforms {
  innerRadius: { value: number };
  outerRadius: { value: number };
  temperature: { value: number };
  diskColor: { value: THREE.Color };
  glowIntensity: { value: number };
}

export interface LensingUniforms extends BaseUniforms {
  blackHolePosition: { value: THREE.Vector3 };
  schwarzschildRadius: { value: number };
  distortionStrength: { value: number };
  curvatureIntensity: { value: number };
}

export type ShaderParameters = {
  vertexShader: string;
  fragmentShader: string;
  uniforms: DiskUniforms | LensingUniforms;
};