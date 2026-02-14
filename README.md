# Black Hole Simulation

High-performance, GPU-accelerated relativistic ray-marching engine for Kerr black hole visualization.

---

## Technical Overview

This project implements a real-time simulation of a rotating (Kerr) black hole using general relativistic ray-marching. The core engine is built in GLSL and executed via WebGL 2.0 within a Next.js framework.

### Core Features

- **Geodesic Integration**: Backwards-tracing of null geodesics through curved spacetime.
- **Relativistic Effects**: Real-time Doppler shifting, relativistic beaming, and frame-dragging.
- **Volumetric Rendering**: Turbulent accretion disks simulated with Fractal Brownian Motion.
- **Post-Processing**: Multi-pass adaptive bloom and ACES tone mapping for HDR visual fidelity.
- **Adaptive Resolution**: Dynamic viewport scaling to maintain high framerates across varied hardware.

---

## Quick Start

### Installation

Ensure you have Node.js and Bun installed.

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

### Controls

| Input             | Action                                              |
| :---------------- | :-------------------------------------------------- |
| **Mouse Drag**    | Orbit camera around the event horizon.              |
| **Scroll**        | Adjust zoom distance (AU).                          |
| **Control Panel** | Modify physical parameters (Mass, Spin, Disk Temp). |

---

## Documentation

Extensive technical specifications are available in the `docs/` directory:

- [**Architecture Overview**](./docs/ARCHITECTURE.md): System design, directory structure, and engineering constraints.
- [**Physics Specification**](./docs/PHYSICS.md): Mathematical foundations, Kerr metric implementation, and physical constants.

---

## System Requirements

- **Browser**: Modern WebGL 2.0 compatible browser (Chrome, Firefox, Safari).
- **GPU**: Dedicated GPU recommended for High-Fidelity settings; integrated GPUs supported via Performance LOD.

---

## License

This project is proprietary. Unauthorized use, copying, or distribution is strictly prohibited. See the [LICENSE](LICENSE) file for details.
