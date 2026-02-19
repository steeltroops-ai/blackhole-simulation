import { vertexShaderSource } from "@/shaders/blackhole/vertex.glsl";
import { fragmentShaderSource } from "@/shaders/blackhole/fragment.glsl";
import { ShaderManager } from "@/shaders/manager";
import { BloomManager } from "@/rendering/bloom";
import { ReprojectionManager } from "@/rendering/reprojection";
import {
  createNoiseTexture,
  createBlueNoiseTexture,
  getSharedQuadBuffer,
  createTextureFromData,
} from "@/utils/webgl-utils";
import { UniformBatcher } from "@/utils/cpu-optimizations";
import { SIMULATION_CONFIG } from "@/configs/simulation.config";
import { DEFAULT_FEATURES, getMaxRaySteps } from "@/types/features";
import { SimulationParams } from "@/types/simulation";
import { physicsBridge } from "@/engine/physics-bridge";
import { PerformanceMonitor } from "@/performance/monitor";
import { PERFORMANCE_CONFIG } from "@/configs/performance.config";

export interface WebGLError {
  type: "context" | "shader" | "program" | "memory";
  message: string;
  details?: string;
}

export class WebGLRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private shaderManager: ShaderManager | null = null;
  private compiledFeaturesKey = "";
  private bloomManager: BloomManager | null = null;
  private reprojectionManager: ReprojectionManager | null = null;
  private uniformBatcher = new UniformBatcher();

  public error: WebGLError | null = null;
  public onMetricsUpdate?: (metrics: any) => void;

  private noiseTex: WebGLTexture | null = null;
  private blueNoiseTex: WebGLTexture | null = null;
  private diskLUT: WebGLTexture | null = null;
  private spectrumLUT: WebGLTexture | null = null;

  private width = 0;
  private height = 0;
  private time = 0;
  private isCameraMoving = false;
  private moveTimeout: NodeJS.Timeout | null = null;
  private lastMouse = { x: 0, y: 0 };
  private performanceMonitor = new PerformanceMonitor();
  private lastFrameTime = performance.now();
  private lastMetricsUpdate = 0;

  constructor() {}

  public init(canvas: HTMLCanvasElement): boolean {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });

    if (!gl) {
      this.error = { type: "context", message: "WebGL2 not available" };
      return false;
    }
    this.gl = gl;

    // FIX: Set explicit clear color so TAA history starts from a defined state
    // instead of GPU-dependent garbage. Without this, the first several frames
    // blend the scene with uninitialized history (often all-black).
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Enable float textures for HDR
    gl.getExtension("EXT_color_buffer_float");

    this.width = canvas.width;
    this.height = canvas.height;

    this.bloomManager = new BloomManager(gl);
    this.bloomManager.initialize(this.width, this.height);

    this.reprojectionManager = new ReprojectionManager(gl);
    this.reprojectionManager.resize(this.width, this.height);

    this.initTextures();

    try {
      this.initPipelines();
    } catch (e: unknown) {
      // eslint-disable-next-line no-console
      console.error("[WebGLRenderer] Pipeline init failed:", e);
      const message = e instanceof Error ? e.message : String(e);
      const stack = e instanceof Error ? e.stack : undefined;

      this.error = {
        type: "shader",
        message: `Shader pipeline failed: ${message}`,
        details: stack || String(e),
      };
      return false;
    }

    if (!this.program) {
      this.error = {
        type: "program",
        message:
          "Shader program was not created (compilation may have failed silently)",
      };
      return false;
    }

    return true;
  }

  private initTextures() {
    if (!this.gl) return;
    const gl = this.gl;

    this.noiseTex = createNoiseTexture(gl, 256);
    this.blueNoiseTex = createBlueNoiseTexture(gl, 256);

    // LUTs will be initialized when physics starts
  }

  private initPipelines() {
    if (!this.gl) return;
    const gl = this.gl;
    this.shaderManager = new ShaderManager(gl);
    this.recompileShader(DEFAULT_FEATURES);
  }

  /**
   * Recompile the main shader program with the given feature toggles.
   * Uses the ShaderManager's cache, so repeated calls with the same features
   * are effectively free.
   */
  private recompileShader(features: import("@/types/features").FeatureToggles) {
    if (!this.gl || !this.shaderManager) return;
    const gl = this.gl;
    const key = JSON.stringify(features);
    if (key === this.compiledFeaturesKey) return; // Already compiled

    const hasPost = !!(this.bloomManager || this.reprojectionManager);
    const variant = this.shaderManager.compileShaderVariant(
      vertexShaderSource,
      fragmentShaderSource,
      features,
      hasPost,
    );

    if (variant) {
      this.program = variant.program;
      this.uniformBatcher.upload(gl, this.program);
      this.compiledFeaturesKey = key;
    }
  }

  public resize(width: number, height: number) {
    if (this.width === width && this.height === height) return;
    this.width = width;
    this.height = height;

    if (this.bloomManager) this.bloomManager.resize(width, height);
    if (this.reprojectionManager)
      this.reprojectionManager.resize(width, height);
  }

  public render(params: SimulationParams, mouse: { x: number; y: number }) {
    if (!this.gl || !this.program) return;
    const gl = this.gl;

    // 1. Detect Motion for TAA
    const dx = Math.abs(mouse.x - this.lastMouse.x);
    const dy = Math.abs(mouse.y - this.lastMouse.y);
    if (dx > 0.0001 || dy > 0.0001) {
      this.isCameraMoving = true;
      if (this.moveTimeout) clearTimeout(this.moveTimeout);
      this.moveTimeout = setTimeout(() => {
        this.isCameraMoving = false;
      }, 300);
    }
    this.lastMouse = { ...mouse };

    // 2. Physics / LUT Sync
    this.syncLUTs();

    if (!params.paused) this.time += 0.01;

    // --- Dynamic Resolution & Metrics ---
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Filter out huge spikes from tab switching
    const cappedDelta = Math.min(deltaTime, 100);
    const metrics = this.performanceMonitor.updateMetrics(cappedDelta);

    // Throttle UI Updates (5Hz / 200ms)
    if (now - this.lastMetricsUpdate > 200) {
      this.lastMetricsUpdate = now;
      if (this.onMetricsUpdate) {
        this.onMetricsUpdate(metrics);
      }
    }

    // Phase 2.3: Virtual Viewport Scaling
    const dynamicRenderScale = PERFORMANCE_CONFIG.resolution
      .enableDynamicScaling
      ? metrics.renderResolution
      : 1.0;

    // 3. Render Pass
    const features = params.features || DEFAULT_FEATURES;
    // Recompile shader if feature toggles changed (cached if same)
    this.recompileShader(features);
    if (!this.program) return; // Recompile may have invalidated program
    const maxSteps = getMaxRaySteps(features.rayTracingQuality);

    // Update Bloom Config
    if (this.bloomManager) {
      this.bloomManager.updateConfig({
        enabled: features.bloom,
        // Intensity/Threshold could come from params too if added to UI
      });
    }

    // Offscreen for Bloom/TAA
    const forceOffscreen = !!this.reprojectionManager;
    const targetFB = this.bloomManager
      ? this.bloomManager.beginScene(forceOffscreen)
      : null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFB);

    gl.viewport(
      0,
      0,
      this.width * dynamicRenderScale,
      this.height * dynamicRenderScale,
    );
    gl.useProgram(this.program);

    // Bind Textures
    // NOTE: Sampler uniforms MUST be set with integer calls (set/uniform1i),
    // NOT float calls (set1f). Using float for sampler2D is undefined behavior.
    if (this.noiseTex) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.noiseTex);
      this.uniformBatcher.set("u_noiseTex", 2);
    }
    if (this.blueNoiseTex) {
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.blueNoiseTex);
      this.uniformBatcher.set("u_blueNoiseTex", 3);
    }
    if (this.diskLUT) {
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, this.diskLUT);
      this.uniformBatcher.set("u_diskLUT", 4);
    }
    if (this.spectrumLUT) {
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, this.spectrumLUT);
      this.uniformBatcher.set("u_spectrumLUT", 5);
    }

    // Physics Bridge Integration
    // We still call tick() for telemetry/LUT sync, but we compute the camera
    // from the useCamera spherical coordinates (encoded as mouse.x/y) instead
    // of reading static SAB camera data that never updates with user input.
    if (physicsBridge && physicsBridge.isReady()) {
      physicsBridge.tick(0.016); // keep telemetry alive
    }

    // CAMERA: Compute from useCamera's spherical coordinates.
    //
    // useCamera encodes its state as:
    //   mouse.x = cameraState.theta / (2 * PI)  -- azimuthal angle [0, 1]
    //   mouse.y = cameraState.phi / PI           -- polar angle [0, 1]
    //
    // We set u_camPos = (0,0,0) to trigger the FALLBACK camera in the shader,
    // which uses u_mouse + u_zoom for a proper spherical camera. This ensures
    // all user interaction (drag, auto-spin, cinematic) is reflected.
    this.uniformBatcher.set3f("u_camPos", 0.0, 0.0, 0.0);
    this.uniformBatcher.set4f("u_camQuat", 0.0, 0.0, 0.0, 1.0);

    // Set Common Uniforms
    this.uniformBatcher.set2f(
      "u_resolution",
      this.width * dynamicRenderScale,
      this.height * dynamicRenderScale,
    );
    this.uniformBatcher.set1f("u_time", this.time);
    this.uniformBatcher.set1f("u_mass", params.mass);
    this.uniformBatcher.set1f("u_spin", params.spin * params.mass);
    this.uniformBatcher.set1f("u_zoom", params.zoom * 2.0); // FIX: Decoupled from mass so it grows visibly
    this.uniformBatcher.set1f(
      "u_disk_size",
      params.diskSize ?? SIMULATION_CONFIG.diskSize.default,
    );
    this.uniformBatcher.set1f(
      "u_disk_scale_height",
      params.diskScaleHeight ?? SIMULATION_CONFIG.diskScaleHeight.default,
    );
    this.uniformBatcher.set1f("u_maxRaySteps", maxSteps);
    this.uniformBatcher.set1f(
      "u_show_redshift",
      features.gravitationalRedshift ? 1.0 : 0.0,
    );
    this.uniformBatcher.set1f(
      "u_show_kerr_shadow",
      features.kerrShadow ? 1.0 : 0.0,
    );
    this.uniformBatcher.set1f("u_lensing_strength", params.lensing ?? 1.0);
    // Upload mouse (spherical camera coords from useCamera)
    this.uniformBatcher.set2f("u_mouse", mouse.x, mouse.y);
    // Disk appearance uniforms
    this.uniformBatcher.set1f(
      "u_disk_density",
      params.diskDensity ?? SIMULATION_CONFIG.diskDensity.default,
    );

    // THERMODYNAMICS FIX: T ~ M^-1/4 (Shakura-Sunyaev)
    // Small BH = Hotter (Blue), Large BH = Cooler (Red)
    const baseTemp = params.diskTemp ?? SIMULATION_CONFIG.diskTemp.default;
    const massFactor = Math.pow(params.mass, -0.25);
    this.uniformBatcher.set1f("u_disk_temp", baseTemp * massFactor);
    this.uniformBatcher.set1f("u_debug", 0.0);

    const quadBuffer = getSharedQuadBuffer(gl);
    if (quadBuffer) {
      this.uniformBatcher.setupAttribute("position", quadBuffer);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // 4. Post-processing Pipeline
    // SCIENTIFIC ACCURACY: We must ensure signal processing chains (Bloom, TAA)
    // strictly respect the physical model's feature toggles.

    if (this.bloomManager && this.reprojectionManager) {
      const sceneTexture = this.bloomManager.getSceneTexture();
      if (sceneTexture) {
        // Resolve TAA (Temporal Anti-Aliasing)
        this.reprojectionManager.resolve(
          sceneTexture,
          0.75,
          this.isCameraMoving,
          dynamicRenderScale,
        );
        const resolved = this.reprojectionManager.getResultTexture();

        if (resolved) {
          // CRITICAL FIX: Explicitly check features.bloom before applying bloom.
          // Even if bloomManager exists, we must only apply the effect if the
          // FEATURE TOGGLE is active.
          if (features.bloom) {
            this.bloomManager.applyBloomToTexture(resolved, dynamicRenderScale);
          } else {
            // If bloom disabled, just draw the TAA-resolved frame to screen
            this.bloomManager.drawTextureToScreen(resolved, dynamicRenderScale);
          }
        } else {
          // Fallback if TAA failed (should rarely happen)
          if (features.bloom) {
            this.bloomManager.applyBloom(dynamicRenderScale);
          } else {
            this.bloomManager.drawTextureToScreen(
              sceneTexture,
              dynamicRenderScale,
            );
          }
        }
      }
    } else if (this.bloomManager) {
      // Non-TAA Path
      // CRITICAL FIX: Only run bloom pass if explicitly enabled by physics module
      if (features.bloom) {
        this.bloomManager.applyBloom(dynamicRenderScale);
      }
      // If bloom is disabled and TAA is missing, we already rendered to
      // the screen backbuffer (targetFB was null), so no action needed.
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private syncLUTs() {
    if (!this.gl) return;
    const gl = this.gl;

    // BUG FIX: getDiskLUT() and getSpectrumLUT() check `this.engine` which
    // is null in worker mode (the production path). These methods only work
    // in the main-thread fallback path. Wrap in try/catch to prevent
    // silent exceptions from killing the render loop.
    try {
      if (!this.diskLUT) {
        const data = physicsBridge.getDiskLUT();
        if (data) {
          this.diskLUT = createTextureFromData(gl, {
            width: 512,
            height: 1,
            data,
            minFilter: gl.LINEAR,
            magFilter: gl.LINEAR,
            wrap: gl.CLAMP_TO_EDGE,
            internalFormat: gl.R32F,
            format: gl.RED,
            type: gl.FLOAT,
          });
        }
      }

      if (!this.spectrumLUT) {
        const data = physicsBridge.getSpectrumLUT(512, 1, 100000.0);
        if (data) {
          this.spectrumLUT = createTextureFromData(gl, {
            width: 512,
            height: 1,
            data,
            minFilter: gl.LINEAR,
            magFilter: gl.LINEAR,
            wrap: gl.CLAMP_TO_EDGE,
            internalFormat: gl.RGBA32F,
            format: gl.RGBA,
            type: gl.FLOAT,
          });
        }
      }
    } catch {
      // Expected in worker mode where this.engine is null
    }
  }

  public cleanup() {
    if (this.shaderManager) this.shaderManager.clearCache();
    if (this.gl) {
      if (this.noiseTex) this.gl.deleteTexture(this.noiseTex);
      if (this.blueNoiseTex) this.gl.deleteTexture(this.blueNoiseTex);
      if (this.diskLUT) this.gl.deleteTexture(this.diskLUT);
      if (this.spectrumLUT) this.gl.deleteTexture(this.spectrumLUT);
    }
    if (this.bloomManager) this.bloomManager.cleanup();
    if (this.reprojectionManager) this.reprojectionManager.cleanup();
  }
}
