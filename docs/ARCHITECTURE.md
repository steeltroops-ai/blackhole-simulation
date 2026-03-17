# System Architecture & Engineering Specifications

This document outlines the high-performance rendering pipeline, mathematical foundations, and software architecture of the relativistic black hole simulation. It reflects the **Hybrid Rust/WebGL 2.0 Architecture** and the project's long-term roadmap for predictive rendering.

---

## 1. Execution Pipeline

The rendering engine operates on a **Zero-Copy Reactive Data Pipeline**, utilizing a strict separation of concerns between high-level orchestration (TypeScript), the physics kernel (Rust/WASM), and the massively parallel rendering engine (WebGL 2.0 / WebGPU Alpha).

The system employs a **Hybrid Integrator Strategy**: High-precision adaptive math in the Rust kernel and high-throughput symplectic integration on the GPU.

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
            PhysicsTick["Physics Tick (75Hz Active / 1Hz Idle)"]:::kernel
            EKF["Extended Kalman Filter<br/>(Camera Prediction)"]:::kernel
            Integrator["Adaptive RKF45<br/>(Precise Geodesics)"]:::kernel
            Metric["Kerr-Schild Metric<br/>(Horizon Regularity)"]:::kernel
            Spectrum["Spectral Engine<br/>(SPD Basis Functions)"]:::kernel
        end

    end

    subgraph GPULogic ["GPU Compute & Render"]
        subgraph ShaderEngine ["Renderer (WebGL 2.0 / WebGPU)"]
            RayMarch["Ray-Marching Kernel<br/>(Velocity-Verlet Integrator)"]:::compute
            PostProcess["Post-Processing<br/>(Bloom / Tone Map / TAA)"]:::compute
        end
        subgraph ThreeJS ["Data Visualization (React Three Fiber)"]
            SpacetimeGrid["Spacetime Analytics<br/>(3D Volumetric / Flow)"]:::compute
        end
        NRS["Neural Radiance Surrogate<br/>(MLP Inference)"]:::wip
        GRMHD["Fluid Dynamics<br/>(Curl-Noise Advection)"]:::wip
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

The project is organized into strictly defined modules to separate concerns between the React application lifecycle, the CPU-side physics engine (Rust), and the GPU-side shader programs.

```text
src/
├── app/                                  # Next.js App Router (Entry Points)
├── components/                           # UI & Rendering Components
├── configs/                              # Static Configuration
├── engine/                               # WASM Integration
├── hooks/                                # Logic & State Management
├── rendering/                            # Rendering Orchestration
├── shaders/                              # GLSL & WGSL Programs
├── workers/                              # Off-Main-Thread Computation
└── ...

physics-engine/                           # Rust Physics Kernel
├── gravitas-core/                        # Core Math Library
└── gravitas-wasm/                        # WASM FFI Layer
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

- **Role**: The Brain. Runs at a variable high-frequency tick (75Hz Active / 1Hz Idle).
- **Core Modules**:
  - **`kerr`**: Solves exact physics invariants using `f64`. Implements **Kerr-Schild coordinates** to ensure the metric remains regular at the event horizon.
  - **`geodesic` / `integrator`**: Integrates ray paths using an **Adaptive RKF45** method for scientific ground truth.
  - **`spectrum`**: Generates LUTs for Doppler-shifted blackbody radiation.
  - **`camera`**: Uses an **Extended Kalman Filter (EKF)** to predict camera movement and eliminate latency.

### 3.3. Level 3: Compute & Render (WebGL 2.0 / WebGPU)

**Responsibility**: Massively parallel ray tracing and cinematic visualization.

- **Role**: The Muscle. Executes billions of ray steps per frame.
- **Key Implementation**:
  - **WebGL 2.0 Shaders (Current)**: Primary production engine. Uses **Regularized Kerr-Schild Acceleration** with a **Velocity-Verlet** integrator.
  - **WebGPU (Alpha)**: Strategic transition layer for subgroup-level optimizations and compute-based denoising.
  - **React Three Fiber**: Handles light-weight data visualization overlays (grids, vectors).

### 3.4. Level 4: Cognitive Supervisor (Heuristics)

**Responsibility**: Intelligent workload allocation and prediction.

- **Role**: The Tactician. Optimizes _where_ and _when_ to render.
- **Modules**:
  - **Entropy Scheduler**: **[ROADMAP]**. Analyzes frame variance to direct compute shaders to "interesting" regions.
  - **Saccade Predictor**: **[ROADMAP]**. Detects rapid eye/camera movements and temporarily reduces resolution.

---

## 4. Zero-Copy Communication Protocol (SAB)

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

Geometric optics are validated using an **Adaptive Runge-Kutta-Fehlberg 4(5)** integrator, which conserves the Hamiltonian energy $H = \frac{1}{2} g^{\mu\nu} p_\mu p_\nu = 0$ by adjusting step sizes to maintain local error bounds.

### 5.2. Radiative Transfer

The engine solves the **Radiative Transfer Equation (RTE)** along the ray path:
$$ \frac{dI*\nu}{d\lambda} = -\alpha*\nu I*\nu + j*\nu $$
This allows for volumetric effects like self-shadowing and realistic limb darkening.

---

## 6. Performance Logic

### 6.1. OffscreenCanvas Implementation

- **Purpose**: Future roadmap for Tier 3.
- **Worker Management**: See `src/engine/worker-pool.ts` (WIP).
- **Fallback Logic**: Standard WebGL 2.0 rendering if `SharedArrayBuffer` is unsupported.

### 6.2. Predictive Latency Compensation

The Rust kernel uses an **Extended Kalman Filter (EKF)** to predict the camera's position at the exact moment of V-Sync, eliminating input lag.
