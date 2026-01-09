/**
 * Bloom Post-Processing Shaders
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
export const bloomVertexShader = `
  attribute vec2 position;
  varying vec2 v_texCoord;
  
  void main() {
    v_texCoord = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

/**
 * Bright pass shader - extracts bright pixels above threshold
 * Requirements: 8.3
 */
export const brightPassShader = `
  precision highp float;
  
  uniform sampler2D u_texture;
  uniform float u_threshold;
  
  varying vec2 v_texCoord;
  
  void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    
    // Calculate luminance
    float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    
    // Extract bright pixels above threshold
    if (luminance > u_threshold) {
      gl_FragColor = color;
    } else {
      gl_FragColor = vec4(0.0);
    }
  }
`;

/**
 * Gaussian blur shader - separable blur (horizontal or vertical)
 * Requirements: 8.3
 */
export const blurShader = `
  precision highp float;
  
  uniform sampler2D u_texture;
  uniform vec2 u_resolution;
  uniform vec2 u_direction; // (1,0) for horizontal, (0,1) for vertical
  
  varying vec2 v_texCoord;
  
  // 9-tap Gaussian blur weights
  // WebGL 1 compatible array initialization
  float weights[5];
  
  void main() {
    weights[0] = 0.227027;
    weights[1] = 0.1945946;
    weights[2] = 0.1216216;
    weights[3] = 0.054054;
    weights[4] = 0.016216;

    vec2 texelSize = 1.0 / u_resolution;
    vec3 result = texture2D(u_texture, v_texCoord).rgb * weights[0];
    
    for (int i = 1; i < 5; i++) {
      vec2 offset = u_direction * texelSize * float(i);
      result += texture2D(u_texture, v_texCoord + offset).rgb * weights[i];
      result += texture2D(u_texture, v_texCoord - offset).rgb * weights[i];
    }
    
    gl_FragColor = vec4(result, 1.0);
  }
`;

/**
 * Combine shader - blends bloom with original image
 * Requirements: 8.3
 */
export const combineShader = `
  precision highp float;
  
  uniform sampler2D u_sceneTexture;
  uniform sampler2D u_bloomTexture;
  uniform float u_bloomIntensity;
  
  varying vec2 v_texCoord;
  
  void main() {
    vec3 sceneColor = texture2D(u_sceneTexture, v_texCoord).rgb;
    vec3 bloomColor = texture2D(u_bloomTexture, v_texCoord).rgb;
    
    // Additive blending with intensity control
    vec3 result = sceneColor + bloomColor * u_bloomIntensity;
    
    gl_FragColor = vec4(result, 1.0);
  }
`;
