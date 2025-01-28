import * as THREE from 'three';

const vertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float time;
  varying vec3 vWorldPosition;
  
  vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz+19.19);
    return -1.0 + 2.0 * fract(vec3((p3.x + p3.y)*p3.z, (p3.x+p3.z)*p3.y, (p3.y+p3.z)*p3.x));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dot(hash33(i + vec3(0.,0.,0.)), f - vec3(0.,0.,0.)), 
                      dot(hash33(i + vec3(1.,0.,0.)), f - vec3(1.,0.,0.)), u.x),
                  mix(dot(hash33(i + vec3(0.,1.,0.)), f - vec3(0.,1.,0.)), 
                      dot(hash33(i + vec3(1.,1.,0.)), f - vec3(1.,1.,0.)), u.x), u.y),
               mix(mix(dot(hash33(i + vec3(0.,0.,1.)), f - vec3(0.,0.,1.)), 
                      dot(hash33(i + vec3(1.,0.,1.)), f - vec3(1.,0.,1.)), u.x),
                  mix(dot(hash33(i + vec3(0.,1.,1.)), f - vec3(0.,1.,1.)), 
                      dot(hash33(i + vec3(1.,1.,1.)), f - vec3(1.,1.,1.)), u.x), u.y), u.z);
  }

  void main() {
    vec3 viewDirection = normalize(vWorldPosition);
    float t = 0.5 + 0.5 * viewDirection.y;
    vec3 skyColor = mix(vec3(0.1, 0.2, 0.4), vec3(0.0, 0.0, 0.0), t);
    skyColor += 0.5 * noise(vWorldPosition * 0.1 + time); // Add some noise for stars and nebula effect
    gl_FragColor = vec4(skyColor, 1.0);
  }
`;

const skyShader = {
  uniforms: {
    time: { value: 0.0 }
  },
  vertexShader,
  fragmentShader
};

export default skyShader;