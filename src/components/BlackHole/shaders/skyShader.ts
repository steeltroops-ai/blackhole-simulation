import * as THREE from 'three';

const vertexShader = `
varying vec3 vWorldPosition;
varying vec3 vPosition;
void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float time;
uniform vec3 blackHolePosition;
uniform vec2 resolution;
varying vec3 vWorldPosition;
varying vec3 vPosition;

#define PI 3.14159265359
#define TWO_PI 6.28318530718
#define STAR_LAYERS 8
#define STAR_COUNT 1200.0

// Enhanced color palette
const vec3[8] COLOR_PRESETS = vec3[](
    vec3(0.5, 0.7, 1.0),    // Blue
    vec3(1.0, 0.6, 0.8),    // Pink
    vec3(0.8, 1.0, 0.5),    // Green
    vec3(1.0, 0.8, 0.3),    // Yellow
    vec3(0.8, 0.3, 1.0),    // Purple
    vec3(1.0, 0.4, 0.2),    // Orange
    vec3(0.2, 1.0, 0.8),    // Turquoise
    vec3(1.0, 0.3, 0.5)     // Hot Pink
);

// Enhanced noise functions [previous noise functions remain the same]
[Previous noise functions here]

vec3 enhancedStarField(vec3 pos, float speed) {
    vec3 stars = vec3(0.0);
    
    for(int i = 0; i < STAR_LAYERS; i++) {
        float layer = float(i) * 0.15;
        vec3 seed = pos + vec3(i * 150.0);
        vec3 h = hash33(seed * 250.0);
        
        // Enhanced star brightness and variation
        float star = smoothstep(0.997, 1.0, h.x);
        star *= smoothstep(0.2, 1.6, h.y) * 1.5;
        star *= sin(time * speed + h.z * TWO_PI) * 0.8 + 0.6;
        
        // More varied star colors
        vec3 color = COLOR_PRESETS[i % 8] * (0.7 + h.z * 0.6);
        color = mix(color, vec3(1.0), smoothstep(0.85, 1.0, h.y));
        
        // Enhanced supernovas and star clusters
        float giant = smoothstep(0.9992, 1.0, h.x) * 4.0;
        float cluster = smoothstep(0.99, 1.0, h.y) * 2.0;
        
        color = mix(color, vec3(1.0, 0.8, 0.4), giant); // Brighter supernovas
        color = mix(color, vec3(0.9, 0.9, 1.0), cluster); // Star clusters
        
        star += giant + cluster;
        
        // Add star glow
        float glow = smoothstep(0.99, 1.0, h.x) * 2.0;
        color += vec3(0.2, 0.4, 1.0) * glow;
        
        stars += star * color * (1.0 - layer * 0.5);
    }
    
    return stars * 2.0;
}

vec3 enhancedNebula(vec2 uv, float time) {
    vec3 color = vec3(0.0);
    vec2 st = uv * 0.4;
    
    // Multiple layers of noise for more complex nebulae
    float n1 = abs(snoise(st * 0.4 + vec2(time * 0.02)));
    float n2 = abs(snoise(st * 0.8 - vec2(time * 0.03)));
    float n3 = abs(snoise(st * 2.0 + vec2(time * 0.04)));
    float n4 = abs(snoise(st * 4.0 - vec2(time * 0.05)));
    
    // Complex color mixing for more vibrant nebulae
    vec3 nebula1 = mix(
        mix(vec3(0.5,0.1,0.6), vec3(0.2,0.5,0.9), n1),
        vec3(0.9,0.3,0.5),
        n2
    ) * n3;
    
    vec3 nebula2 = mix(
        mix(vec3(0.1,0.4,0.7), vec3(0.9,0.2,0.4), n2),
        vec3(0.4,0.8,1.0),
        n1
    ) * n4;
    
    vec3 nebula3 = mix(
        mix(vec3(0.3,0.7,0.2), vec3(0.8,0.3,0.7), n3),
        vec3(0.2,0.5,0.8),
        n4
    ) * n2;
    
    color = (nebula1 + nebula2 + nebula3) * 1.5;
    
    // Enhanced glowing cores
    float glow = pow(n3 * n4, 3.0) * 3.0;
    color += vec3(0.9,0.7,1.0) * glow;
    
    // Dust and gas clouds
    float dust = snoise(st * 15.0 + time * 0.1);
    color *= 1.0 + dust * 0.3;
    
    // Energy tendrils
    float tendrils = pow(abs(snoise(st * 8.0 + time * 0.2)), 3.0);
    color += vec3(0.6,0.8,1.0) * tendrils * 0.5;
    
    return color * 1.5;
}

void main() {
    vec2 uv = vPosition.xy;
    
    // Enhanced distortion
    uv = distort(uv, 0.04);
    uv = distort(uv, 0.03);
    
    // Richer space background
    vec3 color = vec3(0.02, 0.03, 0.06);
    
    // Enhanced background galaxies
    vec2 galaxyUV = uv * 0.3 + vec2(time * 0.01);
    float galaxy = snoise(galaxyUV * 6.0) * 0.6 + 0.4;
    color += vec3(0.4,0.3,0.6) * galaxy * 0.4;
    
    // Enhanced nebula and star field
    color += enhancedNebula(uv, time) * 2.0;
    vec3 stars = enhancedStarField(vec3(uv * 70.0, time * 0.1), 0.7);
    color = color * 0.5 + stars * 3.0;
    
    float dist = length(uv - blackHolePosition.xy);
    
    // Enhanced accretion disk
    color += accretionDisk(uv, dist) * smoothstep(0.15, 0.2, dist) * 1.5;
    
    // Enhanced color grading
    color = pow(color * 1.3, vec3(1.4));
    color = mix(color, color * vec3(1.1, 1.0, 0.9), 0.2);
    
    // Enhanced vignette
    float vignette = 1.0 - smoothstep(0.6, 1.3, length(uv));
    color *= vignette * 1.3;
    
    // Enhanced chromatic aberration
    vec3 finalColor;
    finalColor.r = texture2D(prevFrame, uv * 0.997).r;
    finalColor.g = texture2D(prevFrame, uv).g;
    finalColor.b = texture2D(prevFrame, uv * 1.003).b;
    color = mix(color, finalColor, 0.35);
    
    // Subtle film grain
    float grain = fract(sin(dot(uv, vec2(12.9898,78.233))) * 43758.5453);
    color += grain * 0.015;
    
    gl_FragColor = vec4(color, 1.0);
}
`;

const skyShader = {
  uniforms: {
    time: { value: 0.0 },
    blackHolePosition: { value: new THREE.Vector3(0, 0, 0) },
    resolution: { value: new THREE.Vector2() },
    prevFrame: { type: 't', value: null }
  },
  vertexShader,
  fragmentShader
};

export default skyShader;