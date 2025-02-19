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

  // Improved noise functions for better turbulence
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  // Improved Simplex noise
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  vec3 getDiskColor(float temp, float doppler) {
    // Enhanced temperature-based color calculation
    vec3 hotColor = vec3(1.0, 0.9, 0.6);  // Hotter, more intense yellow-white
    vec3 medColor = vec3(1.0, 0.6, 0.2);  // Medium temperature orange
    vec3 coolColor = vec3(0.8, 0.2, 0.0);  // Cooler, more vibrant red
    
    // Multi-step temperature gradient
    vec3 color;
    if (temp > 0.66) {
      color = mix(medColor, hotColor, (temp - 0.66) * 3.0);
    } else if (temp > 0.33) {
      color = mix(coolColor, medColor, (temp - 0.33) * 3.0);
    } else {
      color = coolColor * temp * 3.0;
    }
    
    // Enhanced relativistic effects
    float relativisticBoost = pow(doppler, 3.0);
    color *= relativisticBoost;
    
    return color;
  }

  void main() {
    vec2 center = vec2(0.5, 0.5);
    vec2 pos = vUv - center;
    float radius = length(pos);
    float angle = atan(pos.y, pos.x);

    // Enhanced inner and outer radius calculations based on mass
    float innerRadius = 0.08 * mass; // ISCO radius scales with mass
    float outerRadius = 0.5 * mass;  // Outer disk extent scales with mass

    float normalizedRadius = (radius - innerRadius) / (outerRadius - innerRadius);

    // Enhanced event horizon transition
    if (normalizedRadius < 0.0) {
      float eventHorizonFade = smoothstep(-0.1, 0.0, normalizedRadius);
      vec3 horizonGlow = vec3(0.1, 0.0, 0.0) * (1.0 - eventHorizonFade);
      gl_FragColor = vec4(horizonGlow, eventHorizonFade);
      return;
    }

    // Improved outer disk transition
    if (normalizedRadius > 1.0) {
      float outerFade = smoothstep(1.0, 1.2, normalizedRadius);
      gl_FragColor = vec4(vec3(0.0), 1.0 - outerFade);
      return;
    }

    // Enhanced orbital dynamics
    float velocity = sqrt(mass / (radius * (1.0 + spin * spin)));
    float orbitalPeriod = 2.0 * PI * sqrt(pow(radius, 3.0) / mass);
    
    // Improved relativistic effects
    float dopplerFactor = 1.0 / (1.0 + velocity * sin(angle + time * spin) * 0.5);
    float redshift = 1.0 / sqrt(1.0 - min(0.9, velocity * velocity));
    
    // Enhanced temperature distribution
    float baseTemp = mix(0.95, 0.2, pow(normalizedRadius, 0.5));
    
    // Complex turbulence pattern using Simplex noise
    float turbScale = 20.0 * (1.0 + spin);
    float timeScale = time * (0.1 + spin * 0.2);
    float turb1 = snoise(vec2(angle * 10.0 + timeScale, normalizedRadius * turbScale));
    float turb2 = snoise(vec2(angle * 20.0 - timeScale, normalizedRadius * turbScale * 2.0));
    float turbulence = mix(turb1, turb2, 0.5) * 0.5 + 0.5;
    
    float temperature = mix(baseTemp, baseTemp * turbulence, 0.4);
    temperature = temperature * redshift;

    // Enhanced color calculation
    vec3 color = getDiskColor(temperature, dopplerFactor);
    
    // Dynamic rotation based on mass and spin
    float rotationSpeed = spin * sqrt(mass / pow(radius, 3.0));
    float rotationOffset = time * rotationSpeed;
    float brightness = 0.8 + 0.2 * sin(angle + rotationOffset * 2.0 * PI);
    color *= brightness;

    // Enhanced accretion effects
    float accretionPulse = 0.15 + 0.1 * sin(time * 1.5) * sin(angle * 4.0 + time);
    color += accretionPulse * vec3(1.0, 0.6, 0.3) * (1.0 - normalizedRadius);

    // Dynamic hot spots and flares
    float flareIntensity = snoise(vec2(angle * 5.0 + time, normalizedRadius * 10.0 + time * 0.5));
    if (flareIntensity > 0.7) {
      float flareBrightness = (flareIntensity - 0.7) * 3.0;
      color += vec3(1.0, 0.8, 0.6) * flareBrightness * (1.0 - normalizedRadius);
    }

    // Improved edge transitions with mass-dependent smoothing
    float edgeWidth = 0.02 * (1.0 + mass * 0.01);
    float edgeFade = smoothstep(-edgeWidth, edgeWidth, normalizedRadius) * 
                    smoothstep(1.0 + edgeWidth, 1.0 - edgeWidth, normalizedRadius);

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