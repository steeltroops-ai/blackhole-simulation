import * as THREE from 'three';

export interface ShaderUniforms {
  time: { value: number };
  resolution: { value: THREE.Vector2 };
}

export interface DiskUniforms extends ShaderUniforms {
  innerRadius: { value: number };
  outerRadius: { value: number };
  temperature: { value: number };
}

export interface LensingUniforms extends ShaderUniforms {
  blackHolePosition: { value: THREE.Vector3 };
  schwarzschildRadius: { value: number };
  distortionStrength: { value: number };
}

export type ShaderParameters = {
  vertexShader: string;
  fragmentShader: string;
  uniforms: DiskUniforms | LensingUniforms;
};
