// src/components/BlackHole/shaders/lensingShader.ts
import * as THREE from 'three';
import { ShaderParameters } from '../types';

export const createLensingShader = (
  schwarzschildRadius: number
): ShaderParameters => ({
  uniforms: {
    time: { value: 0 },
    resolution: { value: new THREE.Vector2() },
    blackHolePosition: { value: new THREE.Vector3() },
    schwarzschildRadius: { value: schwarzschildRadius },
    distortionStrength: { value: 2.0 },
    curvatureIntensity: { value: 1.0 },
  },
  vertexShader: `
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vUv;

    void main() {
      vPosition = position;
      vNormal = normal;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 blackHolePosition;
    uniform float schwarzschildRadius;
    uniform float distortionStrength;
    uniform float curvatureIntensity;
    
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    
    float getGravitationalLensing(float distance) {
      return schwarzschildRadius / (distance * distance) * distortionStrength;
    }
    
    vec3 getSpaceDistortion(vec3 position) {
      vec3 direction = normalize(position - blackHolePosition);
      float distance = length(position - blackHolePosition);
      float lensing = getGravitationalLensing(distance);
      
      return direction * lensing;
    }
    
    void main() {
      vec3 distortion = getSpaceDistortion(vPosition);
      vec3 distortedNormal = normalize(vNormal + distortion);
      
      // Calculate view direction
      vec3 viewDirection = normalize(vPosition - cameraPosition);
      
      // Fresnel effect
      float fresnel = pow(1.0 - abs(dot(distortedNormal, viewDirection)), 3.0);
      
      // Space-time curvature visualization
      float curvature = length(distortion) * curvatureIntensity;
      
      // Time-based effects
      float timeEffect = sin(time * 2.0 + length(vPosition) * 0.5) * 0.5 + 0.5;
      
      // Combine effects for final color
      vec3 baseColor = vec3(0.0, 0.0, 0.1);
      vec3 distortionColor = vec3(0.2, 0.4, 0.8);
      vec3 finalColor = mix(baseColor, distortionColor, curvature);
      
      // Add glow
      finalColor += vec3(0.1, 0.2, 0.4) * fresnel;
      finalColor += distortionColor * timeEffect * 0.2;
      
      // Opacity based on distortion
      float opacity = fresnel * (0.8 - curvature * 0.5);
      
      gl_FragColor = vec4(finalColor, opacity);
    }
  `,
});