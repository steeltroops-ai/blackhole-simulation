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
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vPosition = position;
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
    
    vec3 blackbodyRadiation(float temp) {
      // Approximation of blackbody radiation color
      vec3 color = vec3(0.0);
      temp = clamp(temp, 0.0, 1.0);
      
      // Blue to white hot color gradient
      if (temp < 0.4) {
        color = vec3(0.0, 0.0, temp * 2.5);
      } else if (temp < 0.7) {
        float t = (temp - 0.4) * 3.33;
        color = vec3(t, t, 1.0);
      } else {
        color = vec3(1.0);
      }
      
      return color;
    }
    
    void main() {
      float dist = length(vPosition.xy);
      float normalizedDist = (dist - innerRadius) / (outerRadius - innerRadius);
      float temp = (1.0 - normalizedDist) * temperature;
      
      // Rotational effect
      float angle = atan(vPosition.y, vPosition.x);
      float rotationSpeed = 1.0 - dist / outerRadius;
      float brightness = 0.5 + 0.5 * sin(angle + time * rotationSpeed * 2.0);
      
      vec3 color = blackbodyRadiation(temp) * brightness;
      
      // Add emission glow
      float glow = exp(-normalizedDist * 2.0);
      color += vec3(1.0, 0.6, 0.3) * glow * 0.5;
      
      gl_FragColor = vec4(color, 1.0);
    }
  `,
});