# Interactive Black Hole Simulation

A scientifically accurate, real-time relativistic ray-marching engine for visualizing Kerr black holes at near-extremal spin ($a=0.999$). Built with **Next.js 14**, **WebGL 2.0 (High Compatibility)**, **WebGPU (Performance Roadmap)**, and **Rust (Physics Kernel)**.

---

## Technical Specifications

| Domain         | Technology                                    | Implementation          |
| :------------- | :-------------------------------------------- | :---------------------- |
| **Framework**  | Next.js 14 (App Router), React 18             | Orchestration           |
| **Physics**    | Rust (WASM), f64 precision                    | Gravitas-Core Kernel    |
| **Rendering**  | WebGL 2.0 (Primary) / WebGPU (Alpha)          | Geodesic Ray-Marcher    |
| **Integrator** | Adaptive RKF45 (Rust) / Velocity-Verlet (GPU) | 2nd-Order Symplectic    |
| **Memory**     | SharedArrayBuffer (Zero-Copy)                 | Offset-Matched Protocol |
| **Tooling**    | Bun, Rust (uv/cargo), wasm-pack               | High-Performance Stack  |

---

## Core Engineering Features

- **Relativistic Ray-Marching**: Solves curved spacetime geodesics using a numerically regularized **Kerr-Schild Metric** for horizon stability.
- **Hybrid Performance Strategy**: Distributes workload across hardware layers—CPU (Logic), GPU (Pixels), and Rust (Math).
- **Temporal Anti-Aliasing (TAA)**: Custom reprojection pass with **Variance Clipping** in YCoCg color space to eliminate ray-marching noise.
- **Adaptive Quality System**: Detects hardware tiers (e.g., Intel Iris Xe) and dynamically adjust resolution and step counts.
- **True 3D Spacetime Analytics**: Mathematically rigorous 3D volumetric metric grids mapping coordinate-invariant curvature and frame-dragging fields.
- **Spectral Basis Rendering**: Utilizes pre-computed Planckian LUTs to render physically accurate Doppler/Gravitational redshift.

---

## System Architecture

The engine utilizes a **Zero-Copy Reactive Data Pipeline**. High-precision physics and high-throughput rendering communicate over a **SharedArrayBuffer** to eliminate serialization overhead.

```text
.
├── docs/                   # Scientific Specs, Architecture, & Performance Reports
├── physics-engine/         # Rust Physics Kernel (WASM)
│   ├── gravitas-core/      # Core Math Library (Metric Tensors, RKF45)
│   └── gravitas-wasm/      # WASM FFI layer & SAB Protocol
└── src/
    ├── app/                # Next.js 14 Application Entry
    ├── rendering/          # WebGL/WebGPU Pipeline (TAA, Bloom, Adaptive Resolution)
    ├── shaders/            # GPU Geodesic Kernels (Velocity-Verlet)
    ├── workers/            # Multi-threaded Physics Host (75Hz Active / 1Hz Idle)
    └── engine/             # Direct WASM/SAB Bridge
```

> For a complete breakdown of the mathematical framework and performance optimizations, see the [**System Architecture Documentation**](./docs/ARCHITECTURE.md).

---

## Installation & Deployment

### Prerequisites

- **Bun** (v1.2+)
- **Rust Toolchain** (latest stable)
- **wasm-pack**

### Local Setup

```bash
# 1. Install frontend dependencies
bun install

# 2. Build the Physics Engine (WASM)
bun run build:wasm

# 3. Start the high-performance dev server
bun run dev
```

---

## Documentation Index

1. [**ARCHITECTURE.md**](./docs/ARCHITECTURE.md) - System design, pipeline diagrams, and file structure.
2. [**PHYSICS.md**](./docs/PHYSICS.md) - Mathematical foundations (Kerr Metric, Redshift, Geodesics).
3. [**PERFORMANCE.md**](./docs/PERFORMANCE.md) - Optimization strategies (TAA, Uniform Batching, Adaptive LOD).

---

## License

MIT - Copyright (c) 2026 Mayank / steeltroops-ai.
