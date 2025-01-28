import * as THREE from 'three';
import { ShaderParameters, LensingUniforms } from './types';

export const createLensingShader = (
  schwarzschildRadius: number
): ShaderParameters => ({
  uniforms: {
    time: { value: 0 },
    resolution: { value: new THREE.Vector2() },
    blackHolePosition: { value: new THREE.Vector3() },
    schwarzschildRadius: { value: schwarzschildRadius },
    distortionStrength: { value: 1.0 }
  },
  vertexShader: `
    varying vec3 vPosition;
    varying vec3 vNormal;

    void main() {
      vPosition = position;
      vNormal = normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 blackHolePosition;
    uniform float schwarzschildRadius;
    uniform float distortionStrength;
    
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    void main() {
      vec3 direction = normalize(vPosition - blackHolePosition);
      float distance = length(vPosition - blackHolePosition);
      
      // Calculate gravitational lensing effect
      float bendingStrength = schwarzschildRadius / (distance * distance);
      bendingStrength *= distortionStrength;
      
      // Create distortion pattern
      float distortion = sin(time + distance * 0.5) * 0.5 + 0.5;
      
      // Combine effects
      vec3 distortedNormal = normalize(vNormal + direction * bendingStrength);
      float fresnel = pow(1.0 - abs(dot(distortedNormal, direction)), 3.0);
      
      // Final color
      vec3 color = vec3(0.1, 0.2, 0.3) + fresnel * vec3(0.2, 0.4, 0.6);
      color *= (1.0 + distortion * 0.2);
      
      gl_FragColor = vec4(color, fresnel * 0.7);
    }
  `
});

