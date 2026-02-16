import {
  CameraUniforms,
  PhysicsParams,
  CAMERA_UNIFORM_SIZE,
  PHYSICS_PARAM_SIZE,
  writePhysicsParams,
  writeCameraUniforms,
} from "@/types/webgpu";
import wgslTypes from "@/shaders/types.wgsl";
import wgslCompute from "@/shaders/compute.wgsl";

// Vertex Shader for Blit (Full-screen quad)
const blitShader = `
struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) uv : vec2<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
    vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0)
  );

  var output : VertexOutput;
  output.Position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  // Map [-1, 1] to [0, 1]
  output.uv = pos[VertexIndex] * 0.5 + 0.5;
  // WebGPU texture coords: (0,0) top-left? No, usually matches UV conventions.
  // If we rendered to texture with compute (0,0) top-left?
  // Let's assume standard UV.
  output.uv.y = 1.0 - output.uv.y; 
  return output;
}

@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;

@fragment
fn fs_main(@location(0) uv : vec2<f32>) -> @location(0) vec4<f32> {
  // Simple validations/tone mapping can go here
  let color = textureSample(myTexture, mySampler, uv);
  // Basic Reinhard Tone Mapping
  let mapped = color.rgb / (color.rgb + vec3<f32>(1.0));
  return vec4<f32>(mapped, color.a);
}
`;

export class WebGPURenderer {
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;

  // Compute Pipeline
  private computePipeline: GPUComputePipeline | null = null;
  private computeBindGroup: GPUBindGroup | null = null;

  // Render (Blit) Pipeline
  private renderPipeline: GPURenderPipeline | null = null;
  private renderBindGroup: GPUBindGroup | null = null;

  // Resources
  private cameraBuffer: GPUBuffer | null = null;
  private physicsBuffer: GPUBuffer | null = null;
  private rayBuffer: GPUBuffer | null = null;
  private computeTexture: GPUTexture | null = null;
  private sampler: GPUSampler | null = null;

  private width: number = 0;
  private height: number = 0;

  constructor() {}

  async init(canvas: HTMLCanvasElement): Promise<boolean> {
    if (!navigator.gpu) {
      console.error("WebGPU not supported.");
      return false;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.error("No WebGPU adapter found.");
      return false;
    }

    this.device = await adapter.requestDevice();
    this.context = canvas.getContext("webgpu");

    if (!this.context || !this.device) {
      console.error("Failed to initialize WebGPU context.");
      return false;
    }

    const format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format: format,
      alphaMode: "premultiplied",
    });

    this.width = canvas.width;
    this.height = canvas.height;

    // Initialize Buffers & Pipelines
    this.initBuffers();
    this.initTextures(this.width, this.height);
    this.sampler = this.device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
    });

    await this.initPipelines(format);

    return true;
  }

  private initBuffers() {
    if (!this.device) return;

    // Camera Uniforms (Binding 0)
    this.cameraBuffer = this.device.createBuffer({
      size: CAMERA_UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Physics Params (Binding 1)
    this.physicsBuffer = this.device.createBuffer({
      size: PHYSICS_PARAM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Ray Storage (Binding 2)
    // Size depends on max resolution. For now, allocate for 1080p full screen rays?
    const maxRays = 1920 * 1080;
    const raySize = 80; // from RAY_PAYLOAD_SIZE
    this.rayBuffer = this.device.createBuffer({
      size: maxRays * raySize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
  }

  private initTextures(width: number, height: number) {
    if (!this.device) return;

    // Destroy old texture if exists
    if (this.computeTexture) {
      this.computeTexture.destroy();
    }

    this.computeTexture = this.device.createTexture({
      size: [width, height, 1],
      format: "rgba16float",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
  }

  private currentMaxSteps: number = 150;
  private swapChainFormat: GPUTextureFormat | null = null;

  async initPipelines(
    swapChainFormat: GPUTextureFormat,
    maxSteps: number = 150,
  ) {
    if (!this.device) return;
    this.swapChainFormat = swapChainFormat;
    this.currentMaxSteps = maxSteps;

    // --- Compute Pipeline ---
    // Combine types and compute shader
    const computeSource = wgslTypes + "\n" + wgslCompute;

    const computeModule = this.device.createShaderModule({
      code: computeSource,
    });

    this.computePipeline = this.device.createComputePipeline({
      layout: "auto",
      compute: {
        module: computeModule,
        entryPoint: "main",
        constants: {
          MAX_STEPS: maxSteps,
        },
      },
    });

    // --- Render (Blit) Pipeline ---
    // Only recreate if missing
    if (!this.renderPipeline) {
      const blitModule = this.device.createShaderModule({
        code: blitShader,
      });

      this.renderPipeline = this.device.createRenderPipeline({
        layout: "auto",
        vertex: {
          module: blitModule,
          entryPoint: "vs_main",
        },
        fragment: {
          module: blitModule,
          entryPoint: "fs_main",
          targets: [
            {
              format: swapChainFormat,
            },
          ],
        },
        primitive: {
          topology: "triangle-list",
        },
      });
    }
  }

  public async updateSettings(maxSteps: number) {
    if (this.currentMaxSteps !== maxSteps && this.swapChainFormat) {
      // Rebuild compute pipeline only
      await this.initPipelines(this.swapChainFormat, maxSteps);
      // Invalidate bind group to be safe (though layout likely same)
      this.computeBindGroup = null;
    }
  }

  public getFormat(): GPUTextureFormat {
    return this.swapChainFormat || navigator.gpu.getPreferredCanvasFormat();
  }

  public resize(width: number, height: number) {
    if (this.width !== width || this.height !== height) {
      this.width = width;
      this.height = height;
      this.initTextures(width, height);
      // Invalidate bind groups to force recreation
      this.computeBindGroup = null;
      this.renderBindGroup = null;
    }
  }

  public render(camera: CameraUniforms, physics: PhysicsParams) {
    if (
      !this.device ||
      !this.computePipeline ||
      !this.renderPipeline ||
      !this.context ||
      !this.computeTexture
    )
      return;

    // 1. Update Uniforms
    const cameraData = new Float32Array(CAMERA_UNIFORM_SIZE / 4);
    writeCameraUniforms(cameraData, camera);
    this.device.queue.writeBuffer(this.cameraBuffer!, 0, cameraData);

    const physData = new Float32Array(8);
    writePhysicsParams(physData, physics);
    this.device.queue.writeBuffer(this.physicsBuffer!, 0, physData);

    // 2. Create/Update Bind Groups (if needed)
    if (!this.computeBindGroup) {
      this.computeBindGroup = this.device.createBindGroup({
        layout: this.computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.cameraBuffer! } },
          { binding: 1, resource: { buffer: this.physicsBuffer! } },
          { binding: 2, resource: { buffer: this.rayBuffer! } },
          { binding: 3, resource: this.computeTexture.createView() },
        ],
      });
    }

    if (!this.renderBindGroup) {
      this.renderBindGroup = this.device.createBindGroup({
        layout: this.renderPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: this.sampler! },
          { binding: 1, resource: this.computeTexture.createView() },
        ],
      });
    }

    // 3. Dispatch Compute
    const commandEncoder = this.device.createCommandEncoder();

    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.computePipeline);
    passEncoder.setBindGroup(0, this.computeBindGroup);
    // Dispatch (width/8, height/8)
    passEncoder.dispatchWorkgroups(
      Math.ceil(this.width / 8),
      Math.ceil(this.height / 8),
    );
    passEncoder.end();

    // 4. Blit to Screen
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, this.renderBindGroup);
    renderPass.draw(6);
    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}
