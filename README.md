# Interactive Black Hole Simulation

A scientifically accurate, real-time relativistic ray-marching engine for visualizing Kerr black holes. Built with **Next.js 15**, **WebGL 2.0**, and **TypeScript**.

![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat&logo=https://cdn.simpleicons.org/nextdotjs/white)
![WebGL 2.0](https://img.shields.io/badge/WebGL-2.0-990000?style=flat&logo=https://cdn.simpleicons.org/webgl/white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=https://cdn.simpleicons.org/typescript/white)
![Bun](https://img.shields.io/badge/Bun-v1.2-000000?style=flat&logo=https://cdn.simpleicons.org/bun/white)
![Engine](https://img.shields.io/static/v1?style=flat&message=Ray--Marching&label=Engine&color=8A2BE2)
![Platform](https://img.shields.io/static/v1?style=flat&message=Web&label=Platform&color=lightgrey)
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

| Domain        | Technology                                           |
| :------------ | :--------------------------------------------------- |
| **Framework** | Next.js 15 (App Router)                              |
| **Language**  | TypeScript, GLSL ES 3.0                              |
| **Rendering** | WebGL 2.0 (Raw Context), React Hardware Acceleration |
| **Styling**   | TailwindCSS, Lucide Icons                            |
| **Tooling**   | Bun, PostCSS                                         |

---

## Architecture

The system uses a **reactive pipeline architecture**. User inputs flow through a React state layer into a high-performance render loop that bridges CPU logic with GPU shader programs.

> For a complete breakdown of the rendering pipeline, shader passes, and file structure, see the [**System Architecture Documentation**](./docs/ARCHITECTURE.md).

### Directory Map

- **`src/shaders/blackhole`**: Core ray-marching physics kernel.
- **`src/physics`**: Riemannian geometry and tensor math modules.
- **`src/rendering`**: Bloom, TAA, and Render Target orchestration.
- **`src/performance`**: Closed-loop framerate monitoring and adaptive scaling.

---

## Quick Start

### Prerequisites

- **Bun** (v1.2+)
- **WebGL 2.0** capable GPU (Discrete GPU recommended for Ultra settings)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/steeltroops-ai/blackhole-simulation.git

# 2. Install dependencies via Bun
bun install

# 3. Start the high-performance dev server
bun run dev
```

Open `http://localhost:3000` to view the event horizon.

---

## Controls & Interaction

| Input              | Action                                                   |
| :----------------- | :------------------------------------------------------- |
| **Left Drag**      | Orbit Camera (Spherical Coordinates)                     |
| **Scroll / Pinch** | Zoom to Event Horizon / Zoom Out to ISCO                 |
| **Control Panel**  | Adjust Mass ($M$), Spin ($a$), and Accretion Temperature |

---

## Documentation

Detailed engineering specifications are available in the **`docs/`** directory:

1. [**ARCHITECTURE.md**](./docs/ARCHITECTURE.md) - System design, pipeline diagrams, and file structure.
2. [**PHYSICS.md**](./docs/PHYSICS.md) - Mathematical foundations (Kerr Metric, Doppler Shift).
3. [**PERFORMANCE.md**](./docs/PERFORMANCE.md) - Optimization strategies (Uniform Batching, Texture LUTs).

---

## License

Proprietary Software. All rights reserved by **SteelTroops AI**.
Unauthorized copying, modification, distribution, or use of this source code is strictly prohibited.
