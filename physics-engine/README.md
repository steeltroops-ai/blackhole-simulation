# Black Hole Physics Engine (`gravitas` Workspace)

I've developed this high-fidelity General Relativity kernel in Rust to serve as the mathematical foundation for the simulation. It handles Kerr metric geodesics, accretion thermodynamics, relativistic telemetry, and mathematically rigorous spacetime geometry via a performant WASM bridge.

---

## 1. Architecture: Decoupled Physics Kernel

I designed the engine with a modular workspace structure to ensure mathematical rigor, zero-copy high-frequency synchronization with the GPU frontend, and pure-Rust reusability.

The workspace is divided into two primary crates:

1. **`gravitas-core`**: The pure-Rust numerics, tensor algebra, and physics library. Zero dependencies on WASM/browser APIs.
2. **`gravitas-wasm`**: The WebAssembly bridge that connects the core physics to the React/WebGPU frontend via `SharedArrayBuffer` for zero-copy data transfer.

---

## 2. Core Modules (`gravitas-core`)

- **`metric`**: Boyer-Lindquist Kerr metric implementations for horizons, ISCO, and full covariant/contravariant tensor representations.
- **`tensor`**: 4x4 metric tensor algebra and finite-difference Christoffel symbols.
- **`geodesic`**: Solver for null geodesics via **Adaptive RKF45**, **RK4**, and **Symplectic** integrators for ground-truth ray integration.
- **`invariants`**: **Conserved Quantities Guard**. Implements Hamiltonian tracking ($H=0$), momentum renormalization, and constants of motion (E, Lz, Q).
- **`physics`**: Thermodynamics of the Novikov-Thorne accretion disk, alongside Doppler/gravitational redshift and spectrum routing.
- **`spacetime`**: **True 3D Spacetime Analytics**. Departs from "rubber sheet" analogies, implementing true volumetric metric grids, Painlevé-Gullstrand (River Model) light cones, coordinate-invariant Kretschmann scalar curvature, and full-latitude frame dragging.
- **`quantum`**: Hawking radiation / temperature approximations.

---

## 3. Technical Specifications

| Feature        | Implementation    | Accuracy/Notes                          |
| :------------- | :---------------- | :-------------------------------------- |
| **Metric**     | Kerr (Stationary) | Full spin support $a \in (-1, 1)$       |
| **Integrator** | Adaptive RKF45    | Precision-gated dynamic stepping        |
| **Protocol**   | **SAB v2**        | Zero-copy `SharedArrayBuffer` sync      |
| **Guard**      | Phase 5.3 Filter  | NaN/Inf detection for horizon stability |
| **Spacetime**  | Isotropic / Doran | Exact 3D Kerr mapping and spatial flow  |

---

## 4. Build & Troubleshooting

### 4.1 Build Command

Building requires compiling the WASM bridge:

```bash
# Uses bun to orchestrate the build process (defined in package.json)
bun run build:wasm
```

_(This essentially executes `wasm-pack build --target web` inside `gravitas-wasm` and outputs to `public/wasm`.)_

### 4.2 Windows Fixes

If `os error 32` (file lock) occurs during compilation:

1. **Terminate Processes**: End `cargo.exe` or `rust-analyzer.exe`.
2. **Clean Target**: Manually delete the `/target` directory or run `cargo clean`.
3. **Rebuild**: Run the build command again.

---

## 5. Numerical Methodology

### 5.1 Hamiltonian Regularization

I implemented **Hamiltonian Regularization** in the `invariants` module to renormalize the momentum vector at every step. This ensures that light rays stay strictly on null geodesics even when integrating deep within the gravitational well where numerical floating-point errors typically accumulate.

### 5.2 Volumetric Spacetime Field Generation

Unlike visual approximations, the `spacetime` module calculates the actual coordinate-invariant tidal forces (Kretschmann scalar) and exact frame-dragging angular velocities ($\omega = -g_{t\phi}/g_{\phi\phi}$) across all latitudes. These raw numerical fields are passed efficiently through WASM into React Three Fiber to render mathematically accurate coordinate grids and Flow-Model logic (representing the literal "waterfall" of space into the horizon).
