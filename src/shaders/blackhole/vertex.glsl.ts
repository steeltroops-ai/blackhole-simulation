/**
 * Vertex Shader for Black Hole Simulation
 *
 * Purpose: Renders a full-screen quad for fragment shader ray tracing.
 * This shader simply passes through vertex positions to cover the entire viewport,
 * allowing the fragment shader to perform per-pixel ray tracing calculations
 * for gravitational lensing and accretion disk rendering.
 *
 * WebGL2 / GLSL 300 es
 */
export const vertexShaderSource = `#version 300 es
  in vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;
