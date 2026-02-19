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
    // FIX: Guard against u_textureScale defaulting to (0,0) before it is set.
    vec2 scale = u_textureScale;
    if (scale.x < 0.01) scale = vec2(1.0, 1.0);
    v_texCoord = (position * 0.5 + 0.5) * scale;
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
  uniform vec2 u_textureScale;

  in vec2 v_texCoord;
  out vec4 fragColor;

  vec3 RGBToYCoCg(vec3 rgb) {
    float y = dot(rgb, vec3(0.25, 0.5, 0.25));
    const float co = 0.5; // Offset for bias if needed, but relative is fine
    float co_val = dot(rgb, vec3(0.5, 0.0, -0.5));
    float cg_val = dot(rgb, vec3(-0.25, 0.5, -0.25));
    return vec3(y, co_val, cg_val);
  }

  vec3 YCoCgToRGB(vec3 ycocg) {
    float y = ycocg.x;
    float co = ycocg.y;
    float cg = ycocg.z;
    return vec3(y + co - cg, y + cg, y - co - cg);
  }

  void main() {
    vec3 current = texture(u_currentFrame, v_texCoord).rgb;
    
    // Texture is full size, so texel size must be relative to physical dimensions.
    // u_resolution is (width * scale, height * scale).
    // u_textureScale is (scale, scale).
    // Physical resolution = u_resolution / u_textureScale.
    vec2 scale = u_textureScale;
    if (scale.x < 0.01) scale = vec2(1.0, 1.0);
    vec2 texelSize = scale / u_resolution;

    // 3x3 Neighborhood Sampling
    vec3 m1 = vec3(0.0);
    vec3 m2 = vec3(0.0);
    
    for(int y = -1; y <= 1; y++) {
      for(int x = -1; x <= 1; x++) {
        vec3 s = RGBToYCoCg(texture(u_currentFrame, v_texCoord + vec2(x, y) * texelSize).rgb);
        m1 += s;
        m2 += s * s;
      }
    }

    vec3 mean = m1 / 9.0;
    vec3 std = sqrt(max(m2 / 9.0 - mean * mean, 0.0));
    
    vec3 boxMin = mean - 1.5 * std;
    vec3 boxMax = mean + 1.5 * std;

    vec3 history = RGBToYCoCg(texture(u_historyFrame, v_texCoord).rgb);
    
    // Clamp history sample to the neighborhood AABB to minimize ghosting
    history = clamp(history, boxMin, boxMax);

    float alpha = u_cameraMoving ? 0.0 : u_blendFactor;
    
    vec3 resolved = YCoCgToRGB(mix(RGBToYCoCg(current), history, alpha));
    fragColor = vec4(resolved, 1.0);
  }
`;
