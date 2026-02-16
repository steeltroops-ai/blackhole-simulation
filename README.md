# Interactive Black Hole Simulation

A scientifically accurate, real-time relativistic ray-marching engine for visualizing Kerr black holes. Built with **Next.js 14**, **WebGPU / WebGL 2.0**, and **Rust (WASM)**.

![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat&logo=https://cdn.simpleicons.org/nextdotjs/white)
![WebGPU](https://img.shields.io/badge/WebGPU-Enabled-00f2ff?style=flat&logo=webgpu)
![Rust](https://img.shields.io/badge/Rust-WASM-DEA584?style=flat&logo=https://cdn.simpleicons.org/rust/white)
![WebGL 2.0](https://img.shields.io/badge/WebGL-2.0-990000?style=flat&logo=https://cdn.simpleicons.org/webgl/white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=https://cdn.simpleicons.org/typescript/white)
![Bun](https://img.shields.io/badge/Bun-v1.2-000000?style=flat&logo=https://cdn.simpleicons.org/bun/white)
![CI/CD](https://github.com/steeltroops-ai/blackhole-simulation/actions/workflows/production.yml/badge.svg)
![License](https://img.shields.io/static/v1?style=flat&message=Proprietary&label=License&color=orange)

---

## Overview

This project implements a high-performance General Relativity simulation in the browser. It solves the **Null Geodesic Equations** in real-time to visualize the extreme light bending (gravitational lensing) and Doppler shifting around a rotating black hole.

### Core Engineering Features

- **Relativistic Ray-Marching**: Solves curved spacetime paths using analytic Kerr metric distance fields.
- **Temporal Anti-Aliasing (TAA)**: Custom reprojection pass with motion-adaptive blending for noise reduction.
- **Physically-Based Bloom**: 9-tap Gaussian blur pyramid for realistic accretion disk glow.
- **Adaptive Resolution**: Dynamic scaling system that adjusts internal resolution to maintain 60 FPS.
- **Volumetric Accretion**: Fractal Brownian Motion (FBM) turbulence simulated on the GPU.

---

## Tech Stack

| Domain         | Technology                             |
| :------------- | :------------------------------------- |
| **Framework**  | Next.js 14 (App Router)                |
| **Physics**    | Rust (Physics Engine), WASM Binding    |
| **Language**   | TypeScript, Rust, GLSL ES 3.0 / WGSL   |
| **Rendering**  | WebGPU (Primary), WebGL 2.0 (Fallback) |
| **Integrator** | Yoshida 6th-Order Symplectic           |
| **Styling**    | TailwindCSS, Lucide Icons              |
| **Tooling**    | Bun, Lefthook, GitHub Actions          |

---

## Architecture

The system uses a **reactive pipeline architecture**. User inputs flow through a React state layer into a high-performance render loop that bridges CPU logic with GPU shader programs.

> For a complete breakdown of the rendering pipeline, shader passes, and file structure, see the [**System Architecture Documentation**](./docs/ARCHITECTURE.md).

### Folder Structure

A high-level map of the project's hybrid architecture:

```text
.
├── .github/workflows/      # Automated CI/CD Production Pipeline
├── docs/                   # Scientific Specs & Architecture Reports
├── physics-engine/         # Core Rust Source (Geodesics, Kerr Metrics)
│   └── src/                # Numerical Integrators & Tensor Math
├── public/wasm/            # Compiled WebAssembly Physics Kernel
└── src/
    ├── app/                # Next.js 14 App Router & Base Styles
    ├── components/         # Premium UI Components (Framer Motion)
    ├── hooks/              # Reactive Logic (WebGPU/WebGL State)
    ├── rendering/          # Hybrid Render Pipeline (TAA, Bloom, G-Buffer)
    └── shaders/            # GPU Kernels (GLSL/WGSL Ray-Marching)
```

---

## Quick Start

### Prerequisites

- **Bun** (v1.2+) - For frontend dependencies and orchestration.
- **Rust Toolchain** (Latest stable) - For the high-performance physics kernel.
- **wasm-pack** - For compiling Rust to WebAssembly.
- **Modern Browser** - WebGPU support (Chrome 113+, Edge 113+) or WebGL 2.0.

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/steeltroops-ai/blackhole-simulation.git

# 2. Install frontend dependencies
bun install

# 3. Build the Physics Engine (WASM)
# This will compile the Rust logic into the public directory
bun run build:wasm

# 4. Start the high-performance dev server
bun run dev
```

Open `http://localhost:3000` to view the simulation.

---

## Controls & Interaction

| Input              | Action                                               |
| :----------------- | :--------------------------------------------------- |
| **Left Drag**      | Orbit Camera (Spherical Coordinates)                 |
| **Arrow Keys**     | Orbit Camera (Precision Control)                     |
| **Scroll / Pinch** | Zoom to Event Horizon / Zoom Out to ISCO             |
| **+/-**            | Zoom In/Out (Keyboard)                               |
| **Space**          | Pause/Resume Simulation                              |
| **H**              | Toggle UI Overlay                                    |
| **Control Panel**  | Adjust Mass ($M$), Spin ($a$), and _Cinematic Tools_ |

---

## Documentation

Detailed engineering specifications are available in the **`docs/`** directory:

1. [**ARCHITECTURE.md**](./docs/ARCHITECTURE.md) - System design, pipeline diagrams, and file structure.
2. [**PHYSICS.md**](./docs/PHYSICS.md) - Mathematical foundations (Kerr Metric, Doppler Shift).
3. [**PERFORMANCE.md**](./docs/PERFORMANCE.md) - Optimization strategies (Uniform Batching, Texture LUTs).

---

## License

Proprietary Software. All rights reserved by **Mayank**.
Unauthorized copying, modification, distribution, or use of this source code is strictly prohibited.
