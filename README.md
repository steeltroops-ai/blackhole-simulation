# Black Hole Simulation
> A real-time, interactive WebGL simulation of a Schwarzschild/Kerr black hole with an accretion disk.

![Black Hole Simulation](public/preview.png)

## Overview
This project simulates the visual appearance of a black hole using **General Relativistic Ray Marching**. It runs entirely in the browser using WebGL, calculating light paths through curved spacetime in real-time.

### Key Features
- **Physically Accurate Ray Tracing**: Solves the geodesic equations (using a pseudo-potential approximation) to simulate gravitational lensing.
- **Kerr Metric Support**: Simulates rotating black holes (Kerr black holes) with frame dragging effects.
- **Volumetric Accretion Disk**: Renders a turbulent, hot gas disk with relativistic Doppler beaming (blue-shifting/red-shifting).
- **Performance Optimized**: Uses adaptive step sizing and optimized noise algorithms to run smoothly on consumer hardware.
- **Bloom Post-Processing**: High-quality bloom effect for the photon sphere and accretion disk glow.

## Physics Model
The simulation uses a custom GLSL fragment shader to trace rays from the camera into the scene. 
- **Gravity**: Modeled using an effective potential $V_{eff} = -\frac{M}{r} + \frac{L^2}{2r^2} - \frac{ML^2}{r^3}$ which captures the key features of the Schwarzschild metric (precession, ISCO, photon sphere) without the full computational cost of Christoffel symbols.
- **Accretion Disk**: Modeled as a volumetric density field with Fractal Brownian Motion (FBM) for turbulence.
- **Doppler Beaming**: Light intensity is modulated by the relativistic Doppler factor $\delta = \frac{1}{\gamma(1-\beta\cos\theta)}$, causing the "approaching" side of the disk to appear brighter and bluer.

## Controls
- **Left Click + Drag**: Rotate camera
- **Scroll**: Zoom in/out
- **Control Panel**:
  - **Mass**: Adjust the mass of the black hole
  - **Spin**: Change the rotation speed (angular momentum)
  - **Disk Density/Temp**: Control the accretion disk appearance
  - **Lensing**: Toggle/Adjust gravitational lensing strength

## Technical Details
- **Stack**: Next.js, React, WebGL (GLSL ES 1.00)
- **Performance**: 
  - Adaptive ray marching steps based on distance to photon sphere.
  - Reduced noise octaves for real-time volumetric rendering.
  - Optimized bloom pass (no pipeline stalls).

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
