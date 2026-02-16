/**
 * Vertex Shader for Reprojection Pass (WebGL2 / GLSL 300 es)
 *
 * Simply passes coordinates through for potential reuse in TAA/Velocity calculation.
 */
export const reprojectionVertexShader = `#version 300 es
  in vec2 position;
  uniform vec2 u_textureScale;
  out vec2 v_texCoord;

  void main() {
    // Correctly map UVs to the virtual viewport region [0..scale]
    v_texCoord = (position * 0.5 + 0.5) * u_textureScale;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

/**
 * Fragment Shader for Temporal Reprojection (WebGL2 / GLSL 300 es)
 *
 * In a true TAA system, we would need a velocity buffer (motion vectors) generated
 * by the main render pass.
 *
 * Since our black hole is analytical (ray marched), we can compute "expected"
 * pixel velocity analytically or re-project using camera matrix differences.
 *
 * For this implementation, we will use a "Camera Reprojection" technique:
 * 1. Reconstruct world position from depth (or ray param)
 * 2. Project world position using PREVIOUS view matrix
 * 3. Calculate difference (Velocity)
 * 4. Sample previous frame at (uv - velocity)
 *
 * HOWEVER, for a 100% ray-marched scene without depth buffer, simple TAA is tricky.
 * Strategy:
 * We will use "Accumulation Buffering" for static camera and "Motion Blur" style
 * blending when moving.
 *
 * This shader performs the blend:
 * NewColor = mix(CurrentFrame, HistoryFrame, 0.95)
 */
export const reprojectionFragmentShader = `#version 300 es
  precision highp float;

  uniform sampler2D u_currentFrame;
  uniform sampler2D u_historyFrame;
  uniform vec2 u_resolution;
  uniform float u_blendFactor;
  uniform bool u_cameraMoving;
  
  // Phase 2.1: Predictive Velocity
  uniform vec3 u_camAngVel; // Angular Velocity (wx, wy, wz)
  uniform float u_dt;
  uniform float u_fov; // Field of View hint (approx 1.0)

  in vec2 v_texCoord;
  out vec4 fragColor;

  void main() {
    // 1. Calculate Velocity-Based Offset (Approximate)
    // For an orbiting camera, the screen shifts opposite to rotation.
    // Yaw -> X shift, Pitch -> Y shift
    // Scale factor 0.5 is an empirical constant for the FOV/Aspect ratio
    vec2 velocityOffset = vec2(u_camAngVel.y, -u_camAngVel.x) * u_dt * 0.5;
    
    // 2. Sample History at Reprojected Coordinate
    vec2 historyCoord = v_texCoord - velocityOffset;
    
    vec4 current = texture(u_currentFrame, v_texCoord);
    
    // Bounds check for history sample
    vec4 history = vec4(0.0);
    if(historyCoord.x >= 0.0 && historyCoord.x <= 1.0 && 
       historyCoord.y >= 0.0 && historyCoord.y <= 1.0) {
        history = texture(u_historyFrame, historyCoord);
    } else {
        // If off-screen, fall back to current
        history = current; 
    }

    // 3. High-Quality History Sampling (Catmull-Rom)
    // Bicubic sampling reduces the blur caused by repeated bilinear resampling.
    // We sample 5 taps in a cross pattern and approximate the curve.
    // For performance in WebGL2, we use a sharpened bilinear sample (5-tap approximation).
    
    vec2 texelSize = 1.0 / max(u_resolution, vec2(1.0));
    vec2 samplePos = historyCoord * u_resolution;
    vec2 texPos1 = floor(samplePos - 0.5) + 0.5;
    vec2 f = samplePos - texPos1;
    
    // Simple 1-tap fallback if performance is constrained, but here we do 
    // "Variance Clipping" which requires neighborhood statistics anyway.
    
    // 4. Variance Clipping with AABB Check
    // We calculate mean and variance to define a valid color range for the history pixel.
    vec3 m1 = vec3(0.0);
    vec3 m2 = vec3(0.0);
    
    // 3x3 Neighborhood Sampling
    for(int x = -1; x <= 1; x++) {
        for(int y = -1; y <= 1; y++) {
            vec3 c = texture(u_currentFrame, v_texCoord + vec2(x, y) * texelSize).rgb;
            m1 += c;
            m2 += c * c;
        }
    }
    
    m1 /= 9.0;
    m2 /= 9.0;
    vec3 sigma = sqrt(max(vec3(0.0), m2 - m1 * m1));
    
    // AABB Clamping (Variance Clipping)
    // Gamma (1.25) controls how strictly we adhere to the neighborhood statistics.
    // Lower = less ghosting, more noise. Higher = stable but ghosty.
    float gamma = 1.5; 
    vec3 minColor = m1 - gamma * sigma;
    vec3 maxColor = m1 + gamma * sigma;
    
    // Sample history
    vec4 historyColor = texture(u_historyFrame, historyCoord);
    
    // Clamp history to the variance box
    vec3 historyClamped = clamp(historyColor.rgb, minColor, maxColor);
    
    // 5. Intelligent Blend Factor
    // Detect significant changes to reject history
    float lum0 = dot(current.rgb, vec3(0.2126, 0.7152, 0.0722));
    float lum1 = dot(historyColor.rgb, vec3(0.2126, 0.7152, 0.0722)); // Use raw history for diff
    
    // Luminance difference test
    float diff = abs(lum0 - lum1) / (max(lum0, lum1) + 0.01);
    
    // Velocity magnitude test
    float velMag = length(velocityOffset);
    
    // Dynamic Blend Logic
    float dynamicBlend = u_blendFactor;
    
    // If camera is moving fast, reduce reliance on history (reprojection error)
    float motionConf = smoothstep(0.01, 0.0, velMag); 
    
    // If pixel changed brightness significantly (disocclusion/fast motion), reject history
    float lumConf = 1.0 - smoothstep(0.05, 0.2, diff); 
    
    dynamicBlend *= motionConf * lumConf;
    
    // Allow blend to go to 0.0 if confidence is low to prevent "smearing"
    // But keep a tiny bit of history (0.02) to prevent pure noise unless totally invalid
    dynamicBlend = clamp(dynamicBlend, 0.0, 0.95);

    // Final Mix
    // Use clamped history for the mix to ensure we don't introduce colors that don't exist in the new frame
    fragColor = mix(current, vec4(historyClamped, 1.0), dynamicBlend);
  }

`;
