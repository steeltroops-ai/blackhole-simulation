# Scientific Foundations: Kerr Geodesics

This document details the mathematical framework used to simulate null geodesics in the vicinity of a rotating (Kerr) black hole.

---

## 1. The Kerr Metric

The simulation uses the **Kerr-Schild (KS)** coordinate system for numerical stability. Unlike Boyer-Lindquist coordinates, Kerr-Schild coordinates are regular at the event horizon, preventing mathematical singularities during integration.

### 1.1. Line Element

The Kerr-Schild metric tensor $g_{\mu\nu}$ is expressed as:
$$ g*{\mu\nu} = \eta*{\mu\nu} + f k*\mu k*\nu $$

Where:

- $\eta_{\mu\nu}$ is the flat Minkowski metric.
- $f = \frac{2Mr}{r^2 + a^2 \cos^2 \theta}$ is the scalar function.
- $k_\mu$ is a **null vector** field ($g^{\mu\nu}k_\mu k_\nu = 0$).

This form is preferred for the simulation because:

- **Regularity**: It is mathematically finite at the event horizon.
- **Stability**: Elements of the metric $g_{\mu\nu}$ and its inverse $g^{\mu\nu}$ do not diverge, preventing floating-point overflow.

---

## 2. Numerical Precision Scalability

Numerical precision is scaled according to execution domain:

### 2.1. Rust Kernel: Adaptive RKF45 (Cash-Karp)

- **Role**: High-precision reference and diagnostic output.
- **Precision**: Uses an embedded 5th-order error estimate to adjust step size $h$ dynamically, maintaining local truncation error below $10^{-8}$.
- **Horizon Stability**: Automatically shrinks the step size near the ISCO and photon sphere.

### 2.2. GPU Shader: Regularized Kerr-Schild Acceleration (2nd-Order Symplectic)

- **Role**: Real-time ray-marching (60-144 FPS).
- **Method**: Implements a **Velocity-Verlet** integration of the geodesic acceleration derived from the Kerr potential (Darwin + Spin-Orbit corrections).
- **Benefit**: Provides a superior balance of speed and "stiffness" handling compared to standard Euler.
- **Optimization**: Uses a manual **Curvature-Adaptive Step** logic to reduce $dt$ near the shadow boundary, preventing NaNs on lower-precision mobile hardware.

---

## 3. Light Transport

### 3.1. Relativistic Redshift

The observed frequency $\nu_{obs}$ is related to the emitted frequency $\nu_{em}$ by the redshift factor $g$:
$$ g = \frac{\nu*{obs}}{\nu*{em}} = \frac{(u^\mu p*\mu)*{obs}}{(u^\mu p*\mu)*{em}} $$

The simulation accounts for:

- **Gravitational Redshift**: Time dilation in the strong field.
- **Doppler Shift**: Relativistic beaming from the high-velocity accretion disk.

### 3.2. Spectral Density Basis

Instead of calculating full Planck spectra per pixel, the engine uses **Spectral Basis Functions**. The emission spectrum is pre-integrated into a 1D LUT in the Rust kernel, and the shader performs a single texture lookup using the calculated $g$-factor and local temperature $T$.
