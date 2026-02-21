# Gravitas -- General Relativity Computation Engine

A high-fidelity, pure-Rust library for computing geodesics, spacetime geometry,
and relativistic observables in Kerr (rotating) black hole spacetimes.

## What This Is

Gravitas is the physics kernel extracted from a real-time black hole simulation.
It has **zero browser/WASM dependencies** -- it's pure Rust that runs anywhere:
native, WASM, embedded, or GPU compute pipelines.

If you're building anything that touches curved spacetime -- a raytracer, a
visualization, a game, an educational tool, or research code -- this library
gives you the hard math as a clean API.

## Features

| Module       | What It Does                                                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `metric`     | Kerr, Schwarzschild, Minkowski metric tensors (covariant + contravariant)                                                                                                       |
| `geodesic`   | Null geodesic integration via Adaptive RKF45, RK4, Symplectic                                                                                                                   |
| `invariants` | Constants of motion (E, Lz, Q), Hamiltonian monitoring, momentum renormalization                                                                                                |
| `tensor`     | 4x4 metric tensor algebra, Christoffel symbols                                                                                                                                  |
| `physics`    | Accretion disk (Novikov-Thorne), redshift, Doppler, spectral rendering                                                                                                          |
| `spacetime`  | True Volumetric Spacetime mappings, Kerr embedding, River Model (Painlevé-Gullstrand) light cones, frame dragging fields, and coordinate-invariant Kretschmann scalar curvature |
| `quantum`    | Hawking temperature                                                                                                                                                             |
| `constants`  | SI and geometric unit constants                                                                                                                                                 |

## Quick Start

```rust
use gravitas::prelude::*;
use gravitas::metric::Metric;

// Create a Kerr black hole: mass = 1, spin = 0.9
let bh = Kerr::new(1.0, 0.9);

// Physical radii
let r_horizon = bh.event_horizon();   // ~1.436 M
let r_isco = bh.isco(Orbit::Prograde); // ~2.321 M
let r_photon = bh.photon_sphere();     // ~1.554 M

// Metric tensor at a point
let g = bh.covariant(5.0, std::f64::consts::FRAC_PI_2);
println!("g_tt = {}", g[(0, 0)]);
```

## Geodesic Tracing

```rust
use gravitas::prelude::*;
use gravitas::metric::Metric;
use gravitas::geodesic::{integrate, GeodesicState};

let bh = Kerr::new(1.0, 0.9);
let ray = GeodesicState::null_ray(
    20.0,  // start at r = 20M
    std::f64::consts::FRAC_PI_2,  // equatorial
    0.0,   // phi = 0
    -1.0,  // inward
    0.0,   // no theta component
    3.5,   // angular momentum
);

let traj = integrate(&ray, &bh, &IntegrationOptions::default());
println!("Ray hit {:?} at r = {:.4}", traj.termination, traj.final_state.r());
println!("Hamiltonian drift: {:.2e}", traj.max_hamiltonian_drift);
```

## Spacetime Visualization

```rust
use gravitas::spacetime::embedding;
use gravitas::spacetime::lightcone;
use gravitas::spacetime::curvature;

// Generate embedding diagram mesh (for Three.js / React Three Fiber)
let mesh = embedding::embedding_mesh(1.0, 0.9, 2.5, 30.0, 100, 64);

// Kretschmann scalar curvature (K) - Coordinate invariant tide strength
let k = curvature::kretschner_kerr(3.0, std::f64::consts::FRAC_PI_2, 1.0, 0.9);

// Light cone tilt angle via the River Model (Painlevé-Gullstrand equivalent)
let tilt = lightcone::light_cone_tilt(
    &gravitas::metric::Kerr::new(1.0, 0.9), 3.0, std::f64::consts::FRAC_PI_2
);

// Frame dragging azimuthal velocity (omega) at arbitrary (r, theta)
let omega = frame_drag::frame_dragging_omega(
    1.0, 0.9, 3.0, std::f64::consts::FRAC_PI_4
);
```

## Architecture

```
gravitas-core/src/
  lib.rs              -- Crate root, module declarations, prelude
  constants.rs        -- Physical constants (SI + geometric units)
  tensor/
    metric_tensor.rs  -- 4x4 MetricTensor4 type
    christoffel.rs    -- Christoffel symbols via finite differences
  metric/
    mod.rs            -- Metric trait definition
    kerr.rs           -- Full Kerr metric (Boyer-Lindquist + Kerr-Schild)
    schwarzschild.rs  -- Schwarzschild (a=0 special case)
    minkowski.rs      -- Flat spacetime (testing baseline)
  geodesic/
    mod.rs            -- GeodesicState, Trajectory, integrate()
    hamiltonian.rs    -- Equations of motion
    integrator.rs     -- RKF45, RK4, Symplectic integrators
    termination.rs    -- Termination conditions
  invariants/
    mod.rs            -- Hamiltonian computation
    constants_of_motion.rs  -- E, Lz, Q, Walker-Penrose
    renormalization.rs      -- Null constraint projection
    audit.rs                -- Analytic vs numerical derivative validation
  physics/
    disk.rs           -- Novikov-Thorne accretion disk temperature
    redshift.rs       -- Gravitational + Doppler redshift
    spectrum.rs       -- Planck law, CIE 1931, blackbody LUT generation
  spacetime/
    embedding.rs      -- Flamm's paraboloid, Kerr embedding, proper distance
    lightcone.rs      -- Light cone tilt angles
    curvature.rs      -- Kretschner scalar
    frame_drag.rs     -- Frame dragging field, ergosphere mesh
  quantum/
    hawking.rs        -- Hawking temperature
```

## Key Design Decisions

1. **Pure Rust, zero WASM deps.** The core library has NO dependency on
   `wasm-bindgen`, `js-sys`, or any browser API. It can be used in native
   applications, CLI tools, servers, or compiled to WASM separately.

2. **Trait-based metric abstraction.** The `Metric` trait lets you plug in any
   spacetime geometry. Implement `covariant()`, `contravariant()`, and
   `hamiltonian_derivatives()`, and the entire integrator + physics stack works
   with your custom metric.

3. **Analytic derivatives.** Instead of numerical finite differences (slow, error-prone),
   the Kerr implementation provides closed-form Hamiltonian derivatives for both
   BL and KS coordinates.

4. **Rigorous Spacetime Modeling.** The `spacetime` module departs from oversimplified "rubber sheet" analogies. It produces mathematically exact 3D volumetric metric grids utilizing the Boyer-Lindquist metric, Kretschmann scalar coloring, and models frame dragging across multiple latitudes tracking the Doran/River model of spacetime flow.

5. **f64 precision.** All physics is computed in double precision. The WASM bridge
   crate downcasts to f32 only when writing to the SharedArrayBuffer for GPU consumption.

## WASM Bridge (gravitas-wasm)

The companion `gravitas-wasm` crate wraps this library for browser usage:

```
[dependencies]
gravitas-core = { path = "../gravitas-core" }
wasm-bindgen = "0.2"
```

It handles:

- SharedArrayBuffer (SAB) protocol for zero-copy GPU communication
- Camera EKF (Extended Kalman Filter) for smooth browser input
- `wasm-bindgen` bindings for JavaScript interop

## License

MIT
