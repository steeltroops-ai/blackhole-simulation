// src/shaders/lensingShader.ts
import * as THREE from 'three';
import { ShaderParameters } from '../../types/shader';

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
    
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    
    // Improved gravitational lensing calculation
    float calculateGravitationalLensing(float distance) {
      float rs = schwarzschildRadius;
      return (rs / distance) * (1.0 + 0.5 * (rs / distance));
    }
    
    void main() {
      vec3 direction = normalize(vPosition - blackHolePosition);
      float distance = length(vPosition - blackHolePosition);
      
      // Enhanced gravitational lensing effect
      float bendingStrength = calculateGravitationalLensing(distance);
      bendingStrength *= distortionStrength;
      
      // Improved distortion pattern
      float timeScale = time * 0.3;
      float distortion = sin(timeScale + distance * 0.8) * 0.3 
                      + cos(timeScale * 1.5 + distance * 0.5) * 0.2;
      
      // Calculate distorted normal
      vec3 distortedNormal = normalize(vNormal + direction * bendingStrength);
      float fresnel = pow(1.0 - abs(dot(distortedNormal, direction)), 4.0);
      
      // Enhanced visual effects
      vec3 baseColor = vec3(0.05, 0.1, 0.15);
      vec3 rimColor = vec3(0.3, 0.5, 0.7);
      vec3 color = mix(baseColor, rimColor, fresnel);
      
      // Add subtle time-based color variation
      float colorPulse = sin(timeScale) * 0.1 + 0.9;
      color *= colorPulse;
      
      // Add distortion-based highlighting
      color += vec3(0.2, 0.4, 0.6) * distortion * fresnel;
      
      // Calculate opacity with enhanced edge effects
      float opacity = fresnel * 0.8 + 0.2;
      opacity *= 1.0 - smoothstep(0.0, schwarzschildRadius * 0.5, distance);
      
      gl_FragColor = vec4(color, opacity);
    }
  `
});