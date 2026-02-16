# Black Hole Physics Engine

I've developed this high-fidelity General Relativity kernel in Rust to serve as the mathematical foundation for the simulation. It handles Kerr metric geodesics, accretion thermodynamics, and relativistic telemetry via a performant WASM bridge.

---

## 1. Architecture: Decoupled Physics Kernel

I designed the engine with a modular structure to ensure mathematical rigor and high-frequency synchronization (120Hz) with the GPU frontend.

### 1.1 Core Modules

- **`metric.rs`**: Boyer-Lindquist Kerr metric implementations for horizion, ISCO, and ergonomic radii.
- **`integrator.rs`**: **Adaptive RKF45** kernel with **Cash-Karp** error estimation for ground-truth ray integration.
- **`geodesic.rs`**: Solver for null geodesics with secondary **Yoshida/Verlet** support for high-speed approximations.
- **`invariants.rs`**: **Conserved Quantities Guard**. Implements Hamiltonian tracking ($H=0$) and momentum renormalization.
- **`camera.rs`**: **Kinematic Filter**. A simplified **Extended Kalman Filter (EKF)** for smooth camera motion and **Auto-Spin** synchronization.
- **`training.rs`**: **Neural Bridge**. Orchestrates the data collection and training loop for **NRS (Neural Radiance Surrogates)**.

---

## 2. Technical Specifications

| Feature        | Implementation    | Accuracy/Notes                          |
| :------------- | :---------------- | :-------------------------------------- |
| **Metric**     | Kerr (Stationary) | Full spin support $a \in (-1, 1)$       |
| **Integrator** | Adaptive RKF45    | Precision-gated dynamic stepping        |
| **Protocol**   | **SAB v2**        | Zero-copy `SharedArrayBuffer` sync      |
| **Guard**      | Phase 5.3 Filter  | NaN/Inf detection for horizon stability |

---

## 3. Project Structure

```text
physics-engine/
├── src/
│   ├── camera.rs       # Camera EKF & Smoothing
│   ├── constants.rs    # Physical Constants (MKS)
│   ├── derivatives.rs  # Hamiltonian Motion Eqs
│   ├── disk.rs         # Disk Thermodynamics
│   ├── geodesic.rs     # Relativistic Path Solver
│   ├── integrator.rs   # Adaptive RKF45 Stepper
│   ├── invariants.rs   # Conserved Quantities Guard
│   ├── kerr.rs         # Horizon & ISCO Logic
│   ├── lib.rs          # WASM/SAB Bridge Logic
│   ├── matter.rs       # Stress-Energy Tensor logic
│   ├── metric.rs       # Spacetime Tensor Abstractions
│   ├── quantum.rs      # Hawking/Planck Effects (WIP)
│   ├── spectrum.rs     # Blackbody & Beaming Logic
│   ├── structs.rs      # WebGPU Memory Layouts
│   ├── tiling.rs       # Tiled Processing
│   └── training.rs     # NRS Training Management
├── Cargo.toml          # Rust Dependencies (glam, wasm-bindgen)
└── README.md           # This Documentation
```

---

## 4. Build & Troubleshooting

### 4.1 Build Command

```bash
# Compile to WebAssembly
wasm-pack build --target web --out-dir ../public/wasm --no-typescript
```

### 4.2 Windows Fixes

If `os error 32` (file lock) occurs:

1. **Terminate Processes**: End `cargo.exe` or `rust-analyzer.exe`.
2. **Clean Target**: Manually delete the `/target` directory.
3. **Rebuild**: Run the build command again.

---

## 5. Numerical Methodology: Hamiltonian Regularization

I implemented **Hamiltonian Regularization** in `invariants.rs` to renormalize the momentum vector at every step. This ensures that light rays stay strictly on null geodesics even when integrating deep within the gravitational well where numerical floating-point errors typically accumulate.
