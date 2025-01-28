// src/components/BlackHole/shaders/diskShader.ts
import * as THREE from 'three';
import { ShaderParameters } from '../types';

export const createDiskShader = (
  innerRadius: number,
  outerRadius: number
): ShaderParameters => ({
  uniforms: {
    time: { value: 0 },
    resolution: { value: new THREE.Vector2() },
    innerRadius: { value: innerRadius },
    outerRadius: { value: outerRadius },
    temperature: { value: 1.0 },
    diskColor: { value: new THREE.Color(0xff7700) },
    glowIntensity: { value: 1.5 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float innerRadius;
    uniform float outerRadius;
    uniform float temperature;
    uniform vec3 diskColor;
    uniform float glowIntensity;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    vec3 blackbodyRadiation(float temp) {
      vec3 color = vec3(0.0);
      temp = clamp(temp, 0.0, 1.0);
      
      // Temperature-based color gradient
      if (temp < 0.33) {
        color = mix(vec3(0.1, 0.0, 0.0), vec3(1.0, 0.0, 0.0), temp * 3.0);
      } else if (temp < 0.66) {
        color = mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0), (temp - 0.33) * 3.0);
      } else {
        color = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0), (temp - 0.66) * 3.0);
      }
      
      return color;
    }
    
    float getDiskIntensity(float radius) {
      float normalizedRadius = (radius - innerRadius) / (outerRadius - innerRadius);
      return pow(1.0 - normalizedRadius, 2.0);
    }
    
    void main() {
      float radius = length(vPosition.xy);
      float normalizedRadius = (radius - innerRadius) / (outerRadius - innerRadius);
      
      // Temperature distribution
      float temp = temperature * (1.0 - normalizedRadius);
      vec3 bbColor = blackbodyRadiation(temp);
      
      // Rotational effect
      float angle = atan(vPosition.y, vPosition.x);
      float rotationSpeed = 2.0 - normalizedRadius;
      float swirl = sin(angle + time * rotationSpeed);
      
      // Intensity and glow
      float intensity = getDiskIntensity(radius);
      float glow = exp(-normalizedRadius * 2.0) * glowIntensity;
      
      // Combine effects
      vec3 finalColor = mix(diskColor, bbColor, 0.5) * (intensity + glow);
      finalColor += diskColor * swirl * 0.2;
      
      // Add time-based fluctuations
      float flicker = 1.0 + 0.1 * sin(time * 10.0 + radius);
      finalColor *= flicker;
      
      gl_FragColor = vec4(finalColor, intensity);
    }
  `,
});