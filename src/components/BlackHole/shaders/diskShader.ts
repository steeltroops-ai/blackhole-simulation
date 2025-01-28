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

  #define PI 3.141592653589793

  // Noise functions for adding turbulence
  float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }

  float noise(vec2 p) {
    return fract(sin(dot(p.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  vec3 getDiskColor(float temp, float doppler) {
    // Temperature-based color calculation
    vec3 hotColor = vec3(1.0, 0.7, 0.3);  // Hot yellow-white
    vec3 coolColor = vec3(0.6, 0.2, 0.1);  // Cooler red
    
    // Apply temperature and doppler effect
    vec3 color = mix(coolColor, hotColor, temp);
    color *= doppler;
    
    return color;
  }

  void main() {
    vec2 center = vec2(0.5, 0.5);
    vec2 pos = vUv - center;
    float radius = length(pos);
    float angle = atan(pos.y, pos.x) + time * 0.1;

    // Define inner and outer radius for the disk
    float innerRadius = 0.08; // Adjust this to control the size of the inner hole (simulating ISCO)
    float outerRadius = 0.5;  // Adjust this to control the outer extent of the disk

    // Normalize radius for calculations
    float normalizedRadius = (radius - innerRadius) / (outerRadius - innerRadius);

    if (normalizedRadius < 0.0) {
      // Inside the inner radius, we simulate the transition to the event horizon
      float eventHorizonFade = smoothstep(0.0, innerRadius, radius);
      gl_FragColor = vec4(vec3(0.0), eventHorizonFade); // Fade to black towards the center
      return;
    }

    if (normalizedRadius > 1.0) {
      // Outside the disk, we make it transparent with a fade for a natural look
      float outerFade = smoothstep(1.0, 1.05, normalizedRadius);
      gl_FragColor = vec4(vec3(0.0), 1.0 - outerFade);
      return;
    }

    // Calculate orbital velocity (simplified for this context)
    float velocity = sqrt(mass / radius);
    float orbitalPeriod = 2.0 * PI * sqrt(pow(radius, 3.0) / mass);
    
    // Doppler effect based on orbital motion
    float dopplerFactor = 1.0 / (1.0 + velocity * sin(angle) * 0.3);
    
    // Temperature decreases with radius but with a glow at the center
    float temperature = mix(0.95, 0.2, normalizedRadius); // Higher base temp for inner parts

    // Add turbulence pattern combining both noise functions for varied detail
    float turbulence = mix(rand(pos * 50.0 + time), noise(vec2(angle * 10.0 + time, normalizedRadius * 2.0)), 0.5);
    temperature = mix(temperature, temperature * turbulence, 0.3);

    // Get base color from temperature
    vec3 color = getDiskColor(temperature, dopplerFactor);
    
    // Add time-based rotation
    float rotationOffset = time * 0.5 / orbitalPeriod;
    float brightness = 0.8 + 0.2 * sin(angle + rotationOffset * 2.0 * PI);
    color *= brightness;

    // Add subtle pulsing glow
    float glow = 0.1 + 0.05 * sin(time * 2.0);
    color += glow * vec3(1.0, 0.6, 0.3);

    // Add noise for realism, simulating hot spots or flares
    float flare = rand(pos * 100.0 + time);
    if (flare > 0.99) {
      color += vec3(1.0, 0.8, 0.6) * 2.0;
    }

    // Smooth edge transitions
    float edgeFade = smoothstep(0.0, 0.01, normalizedRadius) * 
                     smoothstep(1.0, 0.99, normalizedRadius);

    gl_FragColor = vec4(color, edgeFade);
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