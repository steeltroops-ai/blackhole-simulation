# System Architecture & Engineering Specifications

This document outlines the high-performance rendering pipeline, mathematical foundations, and software architecture of the relativistic black hole simulation. It reflects the **Hybrid Rust/WebGL 2.0 Architecture** (with WebGPU support in Alpha) and the project's long-term roadmap for predictive rendering.

---

## 1. Execution Pipeline

The rendering engine operates on a **Zero-Copy Reactive Data Pipeline**, utilizing a strict separation of concerns between the high-level orchestration (TypeScript), the physics kernel (Rust/WASM), the massively parallel rendering engine (WebGPU), and the intelligent supervisor (Cognitive Layer).

```mermaid
graph TD
    %% Global Styles for Professional Light Theme
    classDef input fill:#e0f7fa,stroke:#006064,stroke-width:2px,color:#004d40
    classDef orchestration fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#be5c00
    classDef kernel fill:#f3e5f5,stroke:#4a148c,stroke-width:2px,color:#4a148c
    classDef compute fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px,color:#0d47a1
    classDef memory fill:#fbe9e7,stroke:#bf360c,stroke-width:2px,color:#bf360c
    classDef output fill:#f1f8e9,stroke:#33691e,stroke-width:3px,color:#1b5e20
    classDef wip fill:#fffde7,stroke:#fbc02d,stroke-width:1px,stroke-dasharray: 5 5,color:#f57f17


    subgraph UserInteraction ["User Interaction Layer (React/Typescript)"]
        UI[("User Interface<br/>(Control Panel & Inputs)")]:::input
        State["State Management<br/>(React Hooks / Context)"]:::input
    end

    subgraph CPULogic ["CPU Orchestration & Physics"]
        Orchestrator["Render Loop Orchestrator<br/>(TypeScript)"]:::orchestration
        SAB[("SharedArrayBuffer v2<br/>(Zero-Copy Protocol)")]:::memory

        subgraph CognitiveLayer ["Cognitive Supervisor (Experimental)"]
            Scheduler["Entropy Scheduler<br/>(Variance Analysis)"]:::wip
            Predictor["Saccade Predictor<br/>(Input Heuristics)"]:::wip
        end


        subgraph RustKernel ["Rust Physics Kernel (WASM)"]
            PhysicsTick["Physics Tick (120Hz)"]:::kernel
            EKF["Extended Kalman Filter<br/>(Camera Prediction)"]:::kernel
            Integrator["Adaptive RKF45<br/>(Cash-Karp Geodesics)"]:::kernel
            Spectrum["Spectral Engine<br/>(SPD Basis Functions)"]:::kernel
        end

    end

    subgraph GPULogic ["GPU Compute & Render (WebGPU Alpha)"]
        subgraph Wavefront ["Wavefront Scheduler (Roadmap)"]
            Extension["Ray Extension Kernel"]:::wip
            Shading["Material/Disk Shader"]:::wip
            Comp["Compositor"]:::wip
        end
        NRS["Neural Radiance Surrogate<br/>(MLP Inference)"]:::wip
        GRMHD["Fluid Dynamics<br/>(Curl-Noise Advection)"]:::wip
        PostProcess["Post-Processing<br/>(Bloom / Tone Map)"]:::compute
    end


    Display(("Viewport Output<br/>(Canvas Element)")):::output

    %% Data Flow
    UI --> State
    State -- "Input / Config" --> Orchestrator

    Orchestrator -- "Write Inputs" --> SAB
    SAB <--> PhysicsTick

    PhysicsTick --> EKF
    PhysicsTick --> Integrator
    PhysicsTick --> Spectrum

    Spectrum -- "Generate LUTs" --> SAB
    Integrator -- "Update State" --> SAB

    Orchestrator -- "Dispatch Params" --> ComputeSelect
    SAB -- "Read Physics Data" --> ComputeSelect

    ComputeSelect -- "Active Tiles" --> RayMarch
    RayMarch -- "HDR Buffer" --> PostProcess
    RayMarch -- "Variance Data" --> Variance
    Variance -- "Entropy Map" --> Scheduler
    Scheduler -- "Priority Queue" --> ComputeSelect
    PostProcess --> Display

    %% Feedback Loop
    Display -.-> Orchestrator
```

---

## 2. Project File Structure Analysis

The project is organized into strictly defined modules to separate concerns between the React application lifecycle, the CPU-side physics engine (Rust), and the GPU-side shader programs (WebGPU).

```text
src/
├── app/                                  # Next.js App Router (Entry Points)
│   ├── globals.css                       # Global Tailwind resets & font faces
│   ├── layout.tsx                        # Root layout & SEO Metadata injection
│   ├── page.tsx                          # Main simulation view controller
│   └── ...
│
├── components/                           # UI & Rendering Components
│   ├── canvas/
│   │   └── WebGLCanvas.tsx               # Manages WebGL/WebGPU context
│   └── ui/                               # HUD, Control Panel, Telemetry
│
├── configs/                              # Static Configuration
│   ├── features.ts                       # Feature flags
│   ├── physics.config.ts                 # Simulation constants
│   └── ...
│
├── hooks/                                # Logic & State Management
│   ├── useAnimation.ts                   # Main Render Loop
│   ├── usePhysicsEngine.ts               # Rust/WASM Bridge & SAB Management
│   └── ...
│
├── physics-engine/                       # Rust Physics Kernel
│   ├── Cargo.toml                        # Dependencies (wasm-bindgen, glam)
│   └── src/
│       ├── lib.rs                        # WASM Interface & SAB Protocol
│       ├── kerr.rs                       # Kerr Metric Solvers (f64)
│       ├── integrator.rs                 # Adaptive RKF45 Stepper
│       ├── geodesic.rs                   # Relativistic Geodesic Core
│       ├── derivatives.rs                # Hamiltonian Equations of Motion
│       ├── invariants.rs                 # Numerical Regularization
│       ├── spectrum.rs                   # Spectral Rendering (Gauss-Laguerre)
│       ├── camera.rs                     # EKF Camera Physics
│       └── constants.rs                  # Physical Constants

│
├── rendering/                            # Rendering Orchestration
│   ├── webgpu-renderer.ts                # WebGPU Device & Pass Management
│   └── ...
│
├── shaders/                              # WGSL & GLSL Programs
│   ├── raymarching.wgsl                  # Core Compute Shader
│   ├── postprocess/                      # Bloom, Tone Mapping
│   └── ...
│
├── types/                                # TypeScript Interfaces
│   ├── physics-engine.d.ts               # WASM Module Types
│   └── ...
│
└── utils/                                # Helpers
    ├── errorTracking.ts                  # Global Error Handling
    └── ...
```

---

## 3. Architecture Logic Levels

The system employs a multi-tiered architecture to balance precision, performance, and flexibility.

### 3.1. Level 1: Orchestration (TypeScript)

**Responsibility**: Input handling, UI state, and the main Event Loop.

- **Role**: Conductor. It does not perform heavy math.
- **Data**: Reads user input, writes to the **SharedArrayBuffer (SAB)**, and dispatches GPU commands.

### 3.2. Level 2: Physics Kernel (Rust/WASM)

**Responsibility**: High-precision relativistic calculations and state stability.

- **Role**: The Brain. Runs at a fixed high-frequency tick (e.g., 120Hz).
- **Core Modules**:
  - **`kerr`**: Solves exact horizons and ISCO using `f64`.
  - **`geodesic` / `integrator`**: Integrates ray paths using an **Adaptive RKF45** method.
  - **`spectrum`**: Generates LUTs for Doppler-shifted blackbody radiation.

  - **`camera`**: Uses an **Extended Kalman Filter (EKF)** to predict camera movement and eliminate latency.

### 3.3. Level 3: Compute & Render (WebGPU)

**Responsibility**: Massively parallel ray tracing and pixel processing.

- **Role**: The Muscle. Executes billions of ray steps per second.
- **Key Tech**:
  - **Compute Shaders**: <span style="color:red">**[NOT IMPLEMENTED]**</span> - (WebGL 2.0 Fragment Shaders currently used for primary tracing).
  - **Tiled Rendering**: <span style="color:red">**[NOT IMPLEMENTED]**</span> - (Global quad dispatch currently used).
  - **Variable Rate Shading (VRS)**: <span style="color:red">**[NOT IMPLEMENTED]**</span>.

### 3.4. Level 4: Cognitive Supervisor (Heuristics)

**Responsibility**: Intelligent workload allocation and prediction.

- **Role**: The Tactician. Optimizes _where_ and _when_ to render.
- **Modules**:
  - **Entropy Scheduler**: <span style="color:red">**[NOT IMPLEMENTED]**</span>. Analyzes frame variance to direct compute shaders to "interesting" regions.
  - **Saccade Predictor**: <span style="color:red">**[NOT IMPLEMENTED]**</span>. Detects rapid eye/camera movements and temporarily reduces resolution.

---

## 4. Zero-Copy Communication Protocol (SAB v2)

To eliminate Garbage Collection (GC) pauses, the system uses a rigid binary protocol over a `SharedArrayBuffer` shared between JS, Rust, and (via mapping) the GPU.

| Offset  | Section       | Size     | Content                                                |
| :------ | :------------ | :------- | :----------------------------------------------------- |
| `0x000` | **Control**   | 64B      | Mutex locks, Frame Counters, Ready Flags (Atomics).    |
| `0x040` | **Camera**    | 64B      | Position, Quaternion, Velocity Vectors (EKF State).    |
| `0x080` | **Physics**   | 128B     | Mass, Spin, $r_{horizon}$, $r_{isco}$, $T_{disk}$.     |
| `0x100` | **Telemetry** | 256B     | FPS, Frame Time, GPU Disjoint Timer values.            |
| `0x800` | **LUTs**      | Variable | Spectral Intensity Tables, Accretion Density Profiles. |

---

## 5. Mathematical Framework (Advanced)

### 5.1. Symplectic Integration

Geometric optics are validated using an **Adaptive Runge-Kutta-Fehlberg 4(5)** integrator, which conserves the Hamiltonian energy $H = \frac{1}{2} g^{\mu\nu} p_\mu p_\nu = 0$ by adjusting step sizes to maintain local error bounds, preventing orbital decay near the horizon.

### 5.2. Radiative Transfer

Unlike simple ray-tracing, the engine solves the **Radiative Transfer Equation (RTE)** along the ray path:
$$ \frac{dI*\nu}{d\lambda} = -\alpha*\nu I*\nu + j*\nu $$
This allows for volumetric effects like self-shadowing and realistic limb darkening of the accretion disk.

### 5.3. Spectral Rendering

We transition from RGB colors to **Spectral Radiance**. Light is modeled as a temperature $T$. The observed color is computed by integrating the Planck distribution, shifted by the relativistic Dopper/Gravitational factor $g$, against CIE Color Matching Functions.

---

## 6. Performance Logic

### 6.1. Tiled Compute Rendering

The screen is divided into 8x8 tiles. A coarse pass determines if a tile intersects the Black Hole's influence. Complex compute shaders are dispatched _only_ for active tiles, saving 80% of GPU cycles on empty starfields.

### 6.2. Predictive Latency Compensation

The Rust kernel uses an **Extended Kalman Filter (EKF)** to predict the camera's position at the exact moment of V-Sync ($t + 16.6ms$), virtually eliminating the "rubber-banding" feel of heavy simulations.

---
