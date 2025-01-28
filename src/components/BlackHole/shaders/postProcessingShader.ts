import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`;

const fragmentShader = `
  uniform sampler2D tDiffuse;
  varying vec2 vUv;
  
  void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    // Simple chromatic aberration for visual effect
    float r = texture2D(tDiffuse, vUv + vec2(0.002, 0.0)).r;
    float b = texture2D(tDiffuse, vUv - vec2(0.002, 0.0)).b;
    gl_FragColor = vec4(r, color.g, b, color.a);
  }
`;

const postProcessingShader = {
  uniforms: {
    'tDiffuse': { value: null }
  },
  vertexShader,
  fragmentShader
};

export default postProcessingShader;