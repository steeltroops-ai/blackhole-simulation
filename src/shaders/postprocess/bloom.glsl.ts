/**
 * Bloom Post-Processing Shaders (WebGL2 / GLSL 300 es)
 *
 * Implements multi-pass bloom effect:
 * 1. Extract bright pixels (threshold)
 * 2. Gaussian blur (horizontal + vertical passes)
 * 3. Combine with original image
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

/**
 * Simple vertex shader for full-screen quad
 * Used for all post-processing passes
 */
export const bloomVertexShader = `#version 300 es
  in vec2 position;
  uniform vec2 u_textureScale;
  out vec2 v_texCoord;
  
  void main() {
    // Standard quad UVs [0..1] scaled by virtual resolution
    v_texCoord = (position * 0.5 + 0.5) * u_textureScale;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

/**
 * Bright pass shader - extracts bright pixels above threshold
 * Requirements: 8.3
 */
export const brightPassShader = `#version 300 es
  precision highp float;
  
  uniform sampler2D u_texture;
  uniform float u_threshold;
  
  in vec2 v_texCoord;
  out vec4 fragColor;
  
  void main() {
    vec4 color = texture(u_texture, v_texCoord);
    
    // Calculate luminance
    float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    
    // Extract bright pixels above threshold
    if (luminance > u_threshold) {
      fragColor = color;
    } else {
      fragColor = vec4(0.0);
    }
  }
`;

/**
 * Gaussian blur shader - separable blur (horizontal or vertical)
 * Requirements: 8.3
 */
export const blurShader = `#version 300 es
  precision highp float;
  
  uniform sampler2D u_texture;
  uniform vec2 u_resolution;
  uniform vec2 u_direction; // (1,0) for horizontal, (0,1) for vertical
  
  in vec2 v_texCoord;
  out vec4 fragColor;
  
  // 9-tap Gaussian blur weights (GLSL 300 es supports array initializers)
  const float weights[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
  
  void main() {
    vec2 texelSize = 1.0 / u_resolution;
    vec3 result = texture(u_texture, v_texCoord).rgb * weights[0];
    
    for (int i = 1; i < 5; i++) {
      vec2 offset = u_direction * texelSize * float(i);
      result += texture(u_texture, v_texCoord + offset).rgb * weights[i];
      result += texture(u_texture, v_texCoord - offset).rgb * weights[i];
    }
    
    fragColor = vec4(result, 1.0);
  }
`;

/**
 * Combine shader - blends bloom with original image
 * Requirements: 8.3
 */
export const combineShader = `#version 300 es
  precision highp float;
  
  uniform sampler2D u_sceneTexture;
  uniform sampler2D u_bloomTexture;
  uniform float u_bloomIntensity;
  
  in vec2 v_texCoord;
  out vec4 fragColor;
  
  void main() {
    vec3 sceneColor = texture(u_sceneTexture, v_texCoord).rgb;
    vec3 bloomColor = texture(u_bloomTexture, v_texCoord).rgb;
    
    // Additive blending with intensity control
    vec3 result = sceneColor + bloomColor * u_bloomIntensity;
    
    fragColor = vec4(result, 1.0);
  }
`;
