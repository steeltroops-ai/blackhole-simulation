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
    float r_s = 2.0 * mass; // Schwarzschild radius
    
    // Enhanced gravitational lensing with Kerr metric approximation
    float a = spin * r_s * 0.5; // Angular momentum parameter
    float r2 = r * r;
    float a2 = a * a;
    
    // Improved bending calculation
    float bend = r_s / (r2 + a2 * cos(phi) * cos(phi));
    float factor = 1.0 - bend;
    
    // Frame dragging effect
    float drag = a * bend / r;
    phi += drag;
    
    // Calculate distortion
    vec2 offset = vec2(cos(phi), sin(phi)) * (1.0 / max(factor, 0.1));
    return pos * factor - offset * min(r_s / r, 2.0);
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv *= resolution / min(resolution.x, resolution.y); // Correct aspect ratio
    
    vec2 distorted = lens(uv, mass, spin);

    // Enhanced background with dynamic nebula effect
    float angle = atan(distorted.y, distorted.x);
    float dist = length(distorted);
    
    // Create dynamic nebula patterns
    float nebula = sin(angle * 4.0 + time * 0.2) * 0.5 + 0.5;
    nebula *= sin(dist * 3.0 - time * 0.1) * 0.5 + 0.5;
    
    // Dynamic color palette
    vec3 color1 = vec3(0.1, 0.0, 0.3); // Deep purple
    vec3 color2 = vec3(0.0, 0.2, 0.4); // Deep blue
    vec3 color3 = vec3(0.4, 0.0, 0.4); // Purple
    
    vec3 bgColor = mix(color1, color2, nebula);
    bgColor = mix(bgColor, color3, nebula * nebula);
    
    // Enhanced star field
    float stars = fract(sin(dot(distorted + time * 0.1, vec2(12.9898, 78.233))) * 43758.5453);
    stars = smoothstep(0.98, 1.0, stars) * (1.0 - smoothstep(0.0, 4.0, dist));
    bgColor += vec3(stars);

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