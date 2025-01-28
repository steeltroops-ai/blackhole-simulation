// src/shaders/diskShader.ts
import * as THREE from 'three';
import { ShaderParameters } from '../../types/shader';

export const createDiskShader = (
  innerRadius: number,
  outerRadius: number
): ShaderParameters => ({
  uniforms: {
    time: { value: 0 },
    resolution: { value: new THREE.Vector2() },
    innerRadius: { value: innerRadius },
    outerRadius: { value: outerRadius },
    temperature: { value: 1.0 }
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
    
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    
    // Improved blackbody radiation calculation
    vec3 blackbodyRadiation(float temp) {
      vec3 color = vec3(0.0);
      temp = clamp(temp, 0.0, 1.0);
      
      // Enhanced color gradient for more realistic appearance
      if (temp < 0.33) {
        color = vec3(temp * 3.0, 0.0, 0.0); // Deep red to bright red
      } else if (temp < 0.66) {
        float t = (temp - 0.33) * 3.0;
        color = vec3(1.0, t, t * 0.5); // Red to yellow-white
      } else {
        float t = (temp - 0.66) * 3.0;
        color = vec3(1.0, 1.0, t); // Yellow-white to blue-white
      }
      
      return color;
    }
    
    void main() {
      float dist = length(vPosition.xy);
      float normalizedDist = (dist - innerRadius) / (outerRadius - innerRadius);
      float temp = (1.0 - normalizedDist) * temperature;
      
      // Enhanced rotational effect with varying speed
      float angle = atan(vPosition.y, vPosition.x);
      float rotationSpeed = 2.0 - pow(dist / outerRadius, 0.5);
      float brightness = 0.6 + 0.4 * sin(angle + time * rotationSpeed);
      
      // Calculate disk color with improved radiation model
      vec3 color = blackbodyRadiation(temp) * brightness;
      
      // Add atmospheric glow effect
      float glow = exp(-normalizedDist * 3.0);
      vec3 glowColor = vec3(1.0, 0.7, 0.3);
      color += glowColor * glow * 0.6;
      
      // Add edge highlighting
      float edge = smoothstep(0.8, 1.0, normalizedDist);
      color += glowColor * edge * 0.3;
      
      gl_FragColor = vec4(color, 1.0 - normalizedDist * 0.3);
    }
  `
});