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
  uniform vec2 resolution;
  varying vec2 vUv;

  #define PI 3.141592653589793

  vec2 lens(vec2 pos, float mass, float spin) {
    float r = length(pos);
    float phi = atan(pos.y, pos.x);
    float r_s = 2.0 * mass; // Schwarzschild radius approximation
    float factor = 1.0 - (r_s / r);
    vec2 offset = vec2(cos(phi + spin * r * PI), sin(phi + spin * r * PI)) * (1.0 / factor);
    return pos * factor - offset;
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv *= resolution / min(resolution.x, resolution.y); // Correct aspect ratio
    
    vec2 distorted = lens(uv, mass, spin);

    // Background color simulation
    float angle = atan(distorted.y, distorted.x) + time * 0.1;
    float dist = length(distorted);
    vec3 bgColor = mix(vec3(0.1, 0.1, 0.3), vec3(0.0, 0.0, 0.0), smoothstep(0.0, 1.0, dist));

    // Star field simulation
    if (mod(floor(angle * 20.0) + floor(dist * 20.0), 10.0) < 1.0) {
      bgColor = mix(bgColor, vec3(1.0), 0.5);
    }

    gl_FragColor = vec4(bgColor, 1.0);
  }
`;

const lensingShader = {
  uniforms: {
    time: { value: 0.0 },
    mass: { value: 5.0 },
    spin: { value: 0.5 },
    resolution: { value: new THREE.Vector2() },
  },
  vertexShader,
  fragmentShader
};

export default lensingShader;