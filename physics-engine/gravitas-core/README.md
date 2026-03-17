# Gravitas -- General Relativity Computation Engine

A high-fidelity, pure-Rust library for computing geodesics, spacetime geometry, and relativistic observables in Kerr (rotating) black hole spacetimes.

## What This Is

Gravitas is a deterministic physics kernel designed for high-precision scientific visualization and research-grade simulation. Extracted from a real-time relativistic engine, it provides a clean, zero-dependency API for solving the equations of motion in curved spacetime.

If you are building a relativistic ray-tracer, an educational gravity visualizer, or performing analytical research into black hole shadows, Gravitas provides the rigorous mathematical foundations as an implementation-ready library.

## Features

| Module           | Core Functionality | Technical Implementation                                     |
| :--------------- | :----------------- | :----------------------------------------------------------- |
| **`metric`**     | Spacetime Geometry | Kerr (KS/BL), Schwarzschild, and Minkowski tensors.          |
| **`geodesic`**   | Path Integration   | **Adaptive RKF45 (Cash-Karp)** with 5th-order error control. |
| **`invariants`** | Stability Audit    | Hamiltonian $H=0$ monitoring & **Null Renormalization**.     |
| **`tensor`**     | Metric Algebra     | Analytic Christoffel symbols and 4x4 tensor calculus.        |
| **`physics`**    | Observables        | Novikov-Thorne disks, Bardeen Shadows, and Redshift.         |
| **`spacetime`**  | Visual Analytics   | 3D Embedding, Light-cone tilts, and Frame-drag fields.       |
| **`quantum`**    | Semi-classical     | Hawking Temperature & Planck-scale fluctuations.             |
| **`constants`**  | Physical Units     | SI and Geometric unit conversion systems.                    |

---

## Quick Start: Basic Metric Usage

```rust
use gravitas::prelude::*;
use gravitas::metric::Metric;

// Create a high-spin Kerr black hole: mass = 1.0, spin = 0.99
let bh = Kerr::new(1.0, 0.99);

// Calculate Physical radii
let r_horizon = bh.event_horizon();   // Inner boundary (~1.14 M)
let r_isco = bh.isco(Orbit::Prograde); // Inner Stable Circular Orbit (~1.45 M)
let r_photon = bh.photon_sphere();     // Unstable photon orbit (~1.07 M)

// Compute the Covariant Metric Tensor at a specific coordinate
// (r=5.0M, theta=pi/2 [Equatorial])
let g = bh.covariant(5.0, std::f64::consts::FRAC_PI_2);
println!("g_tt component: {}", g[(0, 0)]);
```

## High-Precision Geodesic Tracing

```rust
use gravitas::prelude::*;
use gravitas::geodesic::{integrate, GeodesicState};

let bh = Kerr::new(1.0, 0.9);
let initial_state = GeodesicState::null_ray(
    20.0,                        // Radius (r)
    std::f64::consts::FRAC_PI_2, // Theta (Equatorial)
    0.0,                         // Phi
    -1.0,                        // p_r (Inward momentum)
    0.0,                         // p_theta
    3.5,                         // p_phi (Impact parameter/Lz)
);

// Solve path using Adaptive RKF45 (Cash-Karp)
// Includes periodic Hamiltonian renormalization to maintain H=0
let options = IntegrationOptions {
    tolerance: 1e-8,
    record_path: true,
    ..Default::default()
};

let traj = integrate(&initial_state, &bh, &options);
println!("Termination: {:?}", traj.termination);
println!("Max Hamiltonian Drift (Precision): {:.2e}", traj.max_hamiltonian_drift);
```

## Spacetime Visual Analytics

```rust
use gravitas::spacetime::{embedding, lightcone, curvature, frame_drag};

// 1. Generate 3D Embedding Geometry (for Three.js / R3F)
let mesh = embedding::embedding_mesh(1.0, 0.9, 2.0, 20.0, 100, 64);

// 2. Compute Kretschmann Scalar (K) - Coordinate invariant tidal force
let k = curvature::kretschmann_kerr(3.0, std::f64::consts::FRAC_PI_2, 1.0, 0.9);

// 3. Light-cone tilt via the River Model (Painlevé-Gullstrand equivalent)
let tilt = lightcone::light_cone_tilt(&Kerr::new(1.0, 0.9), 3.0, 1.57);

// 4. Frame-dragging azimuthal velocity (omega)
let omega = frame_drag::frame_dragging_omega(1.0, 0.9, 3.0, 1.57);
```

---

## Library Architecture

The source is organized into strictly separated physical domains:

```text
gravitas-core/src/
├── lib.rs              -- Crate root, module hierarchy, and prelude.
├── constants.rs        -- Comprehensive SI and Geometric constants.
├── tensor/
│   ├── metric_tensor.rs -- Optimized 4x4 MetricTensor type.
│   └── christoffel.rs   -- Analytic symbols for geodesic equations.
├── metric/
│   ├── mod.rs           -- Metric trait (Abstractions for custom geometries).
│   ├── kerr.rs          -- Kerr (Boyer-Lindquist + Kerr-Schild implementations).
│   ├── schwarzschild.rs -- Schwarzschild (non-rotating) special case.
│   └── minkowski.rs     -- Flat-space baseline for testing.
├── geodesic/
│   ├── mod.rs           -- Ray states and high-level integrate() API.
│   ├── hamiltonian.rs   -- Equations of motion (dx/dl, dp/dl).
│   ├── integrator.rs    -- Cash-Karp 4(5), RK4, and Symplectic solvers.
│   └── termination.rs   -- Horizon, Escape, and Loop detection.
├── invariants/
│   ├── mod.rs           -- Invariant monitoring (H=0).
│   ├── constants_of_motion.rs -- E, Lz, and Carter Constant (Q) calc.
│   ├── renormalization.rs -- Null-cone projection (Drift Correction).
│   └── audit.rs         -- Derivative verification logic.
├── physics/
│   ├── disk.rs          -- Novikov-Thorne thermodynamics.
│   ├── shadow.rs        -- Bardeen critical curve generation.
│   ├── redshift.rs      -- Doppler-Gravitational shifting.
│   └── spectrum.rs      -- Spectral basis LUTs (CIE 1931).
├── spacetime/
│   ├── embedding.rs     -- Proper distance & Isometric embeddings.
│   ├── lightcone.rs     -- Null-cone tilt and causality analysis.
│   ├── curvature.rs     -- Invariant Curvature Tensors (Kretschmann).
│   └── frame_drag.rs    -- Lense-Thirring field visualization.
└── quantum/
    └── hawking.rs       -- Surface gravity & Hawking temperature.
```

---

## Engineering Foundations

### 1. Kerr-Schild Horizon Stability

Gravitas implements the **Kerr-Schild** coordinate system to ensure numerical stability at the black hole's event horizon. Unlike the singular Boyer-Lindquist coordinates, Kerr-Schild components remain finite and regular at $r = r_+$, allowing geodesics to be traced through the horizon boundary without numerical overflow.

### 2. Symplectic Stewardship (Stability Correction)

Numerical integration of null geodesics naturally accumulates floating-point drift, causing the Hamiltonian $H$ to depart from zero (energy non-conservation). Gravitas prevents this through **Periodic Null Renormalization**, projecting the 4-momentum back onto the light-cone constraint $g^{\mu\nu} p_\mu p_\nu = 0$ at user-defined intervals.

### 3. Analytic Hamiltonian Derivatives

The engine avoids noisy and computationally expensive finite-difference approximations. The geodesic equations are solved using **analytic, closed-form derivatives** of the Kerr Hamiltonian:
$$ \dot{x}^\mu = \frac{\partial H}{\partial p*\mu} \quad \dot{p}*\mu = -\frac{\partial H}{\partial x^\mu} $$

### 4. Hardware Independence

- **Pure Rust**: No dependency on `std` (optional), and zero dependency on browser APIs.
- **WASM Optionality**: While designed for the `gravitas-wasm` bridge, the core runs at full speed in native CLI, server-side, or embedded environments.
- **f64 Native**: All physics is double-precision. Downcasting to `f32` is handled only at the visualization/bridge layer.

## Support: WASM Bridge

For browser implementations, use the companion library `gravitas-wasm`. It provides the **SharedArrayBuffer (SAB)** memory protocol, enabling zero-copy streaming of physics state directly into GPU shaders at 120Hz.

## License

MIT © Mayank (steeltroops-ai)
