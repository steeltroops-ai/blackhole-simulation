import { describe, it, expect, vi, beforeEach } from "vitest";
import { BloomManager } from "../../rendering/bloom";
import { getSharedQuadBuffer } from "../../utils/webgl-utils";

// Mock WebGL Context
const createMockGL = () => {
  return {
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    useProgram: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    isBuffer: vi.fn(() => true),
    createTexture: vi.fn(() => ({})),
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    createFramebuffer: vi.fn(() => ({})),
    bindFramebuffer: vi.fn(),
    framebufferTexture2D: vi.fn(),
    checkFramebufferStatus: vi.fn(() => 36053), // FRAMEBUFFER_COMPLETE
    viewport: vi.fn(),
    drawArrays: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    uniform1i: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    activeTexture: vi.fn(),
    deleteFramebuffer: vi.fn(),
    deleteTexture: vi.fn(),
    deleteProgram: vi.fn(),
    // Constants
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    TEXTURE_2D: 3553,
    RGBA: 6408,
    UNSIGNED_BYTE: 5121,
    LINEAR: 9729,
    CLAMP_TO_EDGE: 33071,
    FRAMEBUFFER: 36160,
    COLOR_ATTACHMENT0: 36064,
    FRAMEBUFFER_COMPLETE: 36053,
    TRIANGLES: 4,
    TEXTURE0: 33984,
  } as unknown as WebGLRenderingContext;
};

describe("Rendering Pipeline", () => {
  let gl: WebGLRenderingContext;

  beforeEach(() => {
    gl = createMockGL();
  });

  it("BloomManager initializes correctly", () => {
    const bloom = new BloomManager(gl);
    const success = bloom.initialize(800, 600);
    expect(success).toBe(true);
    expect(gl.createFramebuffer).toHaveBeenCalled();
    expect(gl.createTexture).toHaveBeenCalled();
  });

  it("BloomManager returns null and logs warning if FBO missing", () => {
    const bloom = new BloomManager(gl);
    bloom.initialize(800, 600);
    // Force FBO to be null (simulating failure)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bloom as any).sceneFramebuffer = null;

    // Spy on console.warn
    const warnSpy = vi.spyOn(console, "warn");

    const fbo = bloom.beginScene();

    expect(fbo).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Bloom FBO missing"),
    );
  });

  it("BloomManager bypasses Bloom when disabled", () => {
    const bloom = new BloomManager(gl, {
      enabled: false,
      intensity: 1,
      threshold: 0,
      blurPasses: 1,
    });
    bloom.initialize(800, 600);

    const fbo = bloom.beginScene();
    expect(fbo).toBeNull(); // Should return null (screen)
  });

  it("Shared Geometry works", () => {
    const buffer1 = getSharedQuadBuffer(gl);
    const buffer2 = getSharedQuadBuffer(gl);

    expect(gl.createBuffer).toHaveBeenCalledTimes(1); // Should only create once per context
    expect(buffer1).toBe(buffer2); // Should be same instance
  });
});
