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
    // FIX: When u_textureScale is not set, GLSL defaults it to (0,0).
    // This collapses ALL UVs to the origin, making every fragment sample
    // the same texel. Guard against this by treating (0,0) as (1,1).
    vec2 scale = u_textureScale;
    if (scale.x < 0.01) scale = vec2(1.0, 1.0);
    v_texCoord = (position * 0.5 + 0.5) * scale;
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
  
  // ACES Tone Mapping (Narkowicz 2014)
  vec3 aces_tone_mapping(vec3 color) {
    float A = 2.51;
    float B = 0.03;
    float C = 2.43;
    float D = 0.59;
    float E = 0.14;
    return clamp((color * (A * color + B)) / (color * (C * color + D) + E), 0.0, 1.0);
  }

  void main() {
    vec3 sceneColor = texture(u_sceneTexture, v_texCoord).rgb;
    vec3 bloomColor = texture(u_bloomTexture, v_texCoord).rgb;
    
    // Additive blending in linear space
    vec3 result = sceneColor + bloomColor * u_bloomIntensity;
    
    // FINAL PASS: Apply Tone Mapping & Gamma
    result = aces_tone_mapping(result);
    result = pow(result, vec3(0.4545)); // Gamma 2.2
    
    fragColor = vec4(result, 1.0);
  }
`;
