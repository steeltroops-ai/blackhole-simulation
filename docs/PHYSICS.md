# Relativistic Physics Specification

Technical foundations for the Kerr Singularity Engine. This document adheres to the **Professional Technical Minimalism** style from `.gemini/writing_tone.md`.

---

## 1. Metric and Coordinate System

All computations utilize **Geometric Units ($G = c = 1$)**. The simulation implements a modified **Kerr Metric** in a 3D Euclidean ray-marcher.

### Fundamental Parameters

- **Mass ($M$)**: Characteristic gravitational length scale. $r_s = 2M$.
- **Dimensionless Spin ($a^*$)**: $a / M$, where $|a^*| \leq 1$.
- **Event Horizon ($r_+$)**: $r_+ = M + \sqrt{M^2 - a^2}$.
- **Geodesic Mapping**: Integration is performed in the equatorial plane approximation with **Lense-Thirring Banking** for out-of-plane trajectories.

---

## 2. Geodesic Path Integration

Null geodesics (light paths) are calculated using a **Modified Pseudo-Potential** optimized for visual dominance and real-time GPU stability.

### Cinematic Proprietary Acceleration

To produce high-fidelity Einstein rings and pronounced shadow boundaries, the engine utilizes a second-order centrifugal correction term:
$$a = - \frac{\vec{p}}{r} \left( \frac{M}{r^2} + \frac{2ML^2}{r^4} \right) \cdot \lambda$$
Where:

- **$L^2$**: Squared angular momentum $|\vec{r} \times \vec{v}|^2$.
- **$\lambda$**: Global lensing strength coefficient.

### Numerical Methods (Ray-Leap)

To ensure the black hole shadow scales correctly without artifacts:

1. **Adaptive Stepping**: $\Delta t \propto \max(\Delta r_{horizon}, MIN\_STEP)$. Deceleration occurs exponentially near $r_+$ to prevent numerical tunneling.
2. **Iteration Budget**: Hard-capped at **500 steps** per fragment to avoid TDR (Timeout Detection and Recovery) on integrated chipsets.

---

## 3. Accretion Disk Thermodynamics

The plasma disk is modeled as a thin, relativistic gas following circular orbits.

### Thermal Gradient

Radial temperature follows the **Shakura-Sunyaev (1973)** power law:
$$T(r) = T_{peak} \left( \frac{r_{ISCO}}{r} \right)^{0.75}$$
The "Azure" spectral peak is reached when the prograde side hits $T > 40,000K$ due to relativistic shifting.

### Kinematic Effects

- **Doppler Factor ($\delta$)**: $\delta = \gamma^{-1} (1 - \beta \cos \theta)^{-1}$.
- **Intensity Beaming**: Flux is boosted by $\delta^4$ to simulate the searchlight effect.
- **Relativistic Banking**: Disk inclination is modulated by frame-dragging $\omega = 2Ma / (r^3 + a^2r)$.

---

## 4. Optical Phenomena

### The "White Outlines" (Lensed Peaks)

High-intensity rings appearing around the shadow are not UI artifacts but are physics-correct:

1. **The Photon Ring ($r=3M$)**: Concentrated grazing light convergence. In cinematic mode, the ring is sharpened via exponential falloff to resolve a razor-thin boundary.
2. **Einstein Rings**: Focused background starfield light. Intensity is determined by the starfield density threshold ($\tau = 0.998$).

### Viewport Stability

To prevent viewport clipping at extreme mass ($M > 2.0$), the disk outer boundary is dynamically clamped:
$$r_{outer} = \min(M \cdot 15.0, Zoom \cdot 0.9)$$

---

## 5. References

1. **Shakura, N. I., & Sunyaev, R. A. (1973)** - "Black holes in binary systems. Observational appearance."
2. **Bardeen, J. M., et al. (1972)** - "The Inner Stable Circular Orbit around a Rotating Black Hole."
3. **Press, W. H., & Teukolsky, S. A. (1972)** - "Floating Orbits and Black-hole Stability."
