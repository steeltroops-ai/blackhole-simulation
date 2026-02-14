/**
 * Vertex Shader for Reprojection Pass (WebGL2 / GLSL 300 es)
 *
 * Simply passes coordinates through for potential reuse in TAA/Velocity calculation.
 */
export const reprojectionVertexShader = `#version 300 es
  in vec2 position;
  out vec2 v_texCoord;

  void main() {
    v_texCoord = position * 0.5 + 0.5;
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
  uniform float u_blendFactor; // 0.0 = all new, 1.0 = all old
  uniform bool u_cameraMoving;

  in vec2 v_texCoord;
  out vec4 fragColor;

  void main() {
    vec4 current = texture(u_currentFrame, v_texCoord);
    vec4 history = texture(u_historyFrame, v_texCoord);

    // Adaptive Blending
    // If camera is moving, drastically reduce history influence to prevent ghosting
    float alpha = u_cameraMoving ? 0.0 : u_blendFactor;
    
    // Neighborhood clamping (Anti-Ghosting logic would go here)
    // Simple clamp: not implemented in Phase 1 of optimizations
    
    fragColor = mix(current, history, alpha);
  }
`;
