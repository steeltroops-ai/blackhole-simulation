import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float time;
  uniform float mass;
  uniform float spin;
  varying vec2 vUv;

  float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }

  void main() {
    vec2 center = vec2(0.5, 0.5);
    float radius = distance(vUv, center);
    float angle = atan(vUv.y - center.y, vUv.x - center.x) + time * 0.1;
    float noise = rand(vUv + vec2(time * 0.01));

    // Simulate Doppler shift and temperature gradient
    float dopplerFactor = 1.0 - (spin * 0.5 * sin(angle));
    float temperature = 1.0 - radius; // hotter closer to center
    temperature *= dopplerFactor; // simulate Doppler effect

    // Map temperature to color
    vec3 color = mix(vec3(1.0, 0.5, 0.0), vec3(0.2, 0.2, 1.0), temperature);
    color = mix(color, vec3(1.0), pow(noise, 4.0)); // Add some noise for realism

    gl_FragColor = vec4(color, 1.0);
  }
`;

const diskShader = {
  uniforms: {
    time: { value: 0.0 },
    mass: { value: 5.0 },
    spin: { value: 0.5 },
  },
  vertexShader,
  fragmentShader
};

export default diskShader;