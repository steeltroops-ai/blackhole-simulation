# Performance Optimization Architecture

This document details the high-performance rendering techniques implemented in the Black Hole Simulation. It serves as a technical reference for reproducing the engine's capability to render relativistic physics on consumer hardware.

---

## 1. Shader Micro-Optimizations (ALU & Bandwidth)

The core bottleneck of any ray-marching engine is the per-pixel cost of the fragment shader. We implemented three critical optimizations to reduce Arithmetic Logic Unit (ALU) load and mask sampling artifacts.

### 1.1 Pre-Computed Texture Turbulence

**Problem**: Procedural 3D noise (Fractal Brownian Motion) requires extensive ALU operations ($O(Octaves \times Samples)$) inside the hottest loop of the shader.
**Technique**:

- Replaced procedural noise with a **256x256 RGBA Noise Texture**.
- Mapped 3D world coordinates to 2D texture UVs using domain warping.
- **Implementation**: `texture(u_noiseTex, uv)` replaces 50+ lines of hash/sin/cos calculations.
  **Benefit**: 40% reduction in per-ray rendering cost.

### 1.2 Blue Noise Dithering

**Problem**: Low ray-marching step counts (required for performance) creating visible "banding" or "slicing" artifacts in the volumetric accretion disk.
**Technique**:

- Introduced a **Blue Noise Texture** to stochastically offset the ray's starting position per pixel.
- **Formula**: `t += texture(u_blueNoise, gl_FragCoord.xy / 256.0).r * step_size`.
  **Benefit**: Converts low-frequency banding into high-frequency noise, which is visually less objectionable and easily removed by Temporal Reprojection.

### 1.3 Adaptive Step Scaling

**Problem**: Uniform step sizes waste cycles in empty space far from the black hole.
**Technique**:

- Implemented a non-linear step scaler based on radial distance.
- **Formula**: `dt = base_step * (1.0 + r / 20.0)`.
  **Benefit**: Rays traverse the "empty" interstellar medium 10x faster, concentrating detail only where gravity is strongest.

---

## 2. Render Pipeline Architecture

To achieve cinematic quality without cinematic frame times, we moved from a single-pass implementation to a multi-stage post-processing pipeline.

### 2.1 Temporal Reprojection (TAA)

**Problem**: Ray-marching at real-time rates is inherently noisy, especially with Blue Noise dithering.
**Technique**:

- **Ping-Pong Buffering**: Maintains two framebuffers (`History` and `Current`).
- **Accumulation Shader**: Blends the current raw frame with the history buffer.
- **Adaptive Feedback**: - **Static Camera**: $\alpha = 0.90$ (High stability, effectively 10x super-sampling). - **Moving Camera**: $\alpha = 0.50$ (Fast convergence, prevents ghosting/smearing).
  **Benefit**: Produces a "butter-smooth" image from a noisy input signal, decoupling visual fidelity from raw ray counts.

### 2.2 Offscreen Bloom & Tone Mapping

**Technique**:

- Rendering occurs to an offscreen HDR floating-point texture (or emulated float).
- **Bright Pass**: Extracts pixels with luminance $> 0.8$.
- **Gaussian Blur**: multi-pass horizontal/vertical blur.
- **Composite**: Recombines using ACES Filmic Tone Mapping.
  **Benefit**: Provides the signature "glowing event horizon" aesthetic without expensive physics calculations for light scattering.

---

## 3. CPU & WebGL Data Structures

JavaScript overhead can become significant when managing high-frequency uniform updates.

### 3.1 Zero-Overhead Uniform Batching

**Problem**: `gl.getUniformLocation` is sync-blocking and slow. Naive uniform updates cause driver validation overhead.
**Technique**:

- **Location Caching**: All active uniform locations are cached in a `Map` at program creation time.
- **Dirty Checking**: The `UniformBatcher` compares the new value against a `valueCache` before issuing a GL command.
- **Direct Access**: Updates write directly to the WebGL context, bypassing redundant validation logic.
  **Benefit**: Reduced CPU time per frame to negligible levels (< 0.5ms).

### 3.2 Shared Geometry Management

**Technique**:

- Implemented a **SharedGeometry Singleton** (`src/utils/geometry.ts`).
- Storage uses a `WeakMap` to associate a single Vertex Buffer Object (VBO) with a WebGL Context.
  **Benefit**: Eliminates redundant VBO allocations across different render passes (Bloom, TAA, Scene), reducing memory footprint and context switching.

---

## 4. Performance Models (LOD Strategy)

The engine scales workload dynamically based on device capability tiers.

### Tier 1: Mobile / Low-Power

- **Ray Steps**: 50 (Analytic Lensing approximation).
- **Features**: No Bloom, No TAA.
- **Precision**: `mediump` floats.

### Tier 2: Integrated Graphics (M1/Intel Iris)

- **Ray Steps**: 100-150.
- **Features**: TAA Enabled, Low-Res Bloom.
- **Precision**: Hybrid `highp`/`mediump`.

### Tier 3: Dedicated GPU (RTX/Radeon)

- **Ray Steps**: 300+ (Full Volumetric Integration).
- **Features**: High-Quality TAA, Multi-Pass Bloom (16 samples).
- **Precision**: Full `highp`.

---

## 5. Future Optimization Roadmap

### 5.1 Web Worker Parallelism

Move the entire `requestAnimationFrame` loop and WebGL context to a **Web Worker** via `OffscreenCanvas`. This will completely decouple the simulation framerate from the React UI thread.

### 5.2 WebGPU Migration

Port the fragment shader to **WGSL Compute Shaders**. This would allow for shared memory access between rays and faster volumetric integration.
