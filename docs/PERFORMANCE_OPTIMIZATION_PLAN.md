# High-Performance Optimization Plan: Memory Safety & Complexity Analysis

This document outlines the strategy for ensuring $O(1)$ critical-path performance, absolute memory safety, and minimal space complexity for the Black Hole Simulation project.

---

## 1. Current State Flaws & Vulnerabilities

### 1.1 CPU-Side Allocation in Render Loop

- **Issue**: Standard JS execution (`requestAnimationFrame`) can trigger frequent Garbage Collection (GC) pauses if objects (Vectors, Arrays) are allocated per frame.
- **Current Mitigation**: `useAnimation` uses refs for some state, but `performanceMonitor.updateMetrics` and `uniformBatcher` might still allocate small objects.
- **Risk**: Micro-stutters during long simulations.

### 1.2 WebGL Resource Lifecycle

- **Issue**: Frequent resizing or quality changes can leave orphaned WebGL textures if `gl.deleteTexture` is missed.
- **Current Mitigation**: `BloomManager` has `cleanup()`. `ReprojectionManager` has `cleanupTextures()`.
- **Risk**: VRAM leaks on mobile devices leading to context loss (crash).

### 1.3 React Reconciliation Overhead

- **Issue**: Passing new object references (e.g., `style={{...}}` or inline functions) to components inside the render tree triggers unnecessary re-renders.
- **Risk**: UI lag affecting the separate WebGL thread (on some browsers) or simply draining battery.

---

## 2. Optimization Strategy: The "Zero-Allocation" Doctrine

To achieve $O(1)$ Time and $O(1)$ Space complexity in the hot path:

### 2.1 Memory Pooling (Space: $O(1)$, Time: $O(1)$)

Instead of `new Vector3()`, we pre-allocate a fixed pool of typed arrays.

- **Technique**: Static `Float32Array` buffers for all physics math.
- **Implementation**:

  ```typescript
  // BAD
  const pos = { x: 0, y: 0 }; // Allocates Object

  // GOOD
  const POS_BUFFER = new Float32Array(3); // Allocated once
  POS_BUFFER[0] = x;
  POS_BUFFER[1] = y;
  ```

### 2.2 Uniform Batching (Time: $O(1)$)

- **Technique**: Upload uniforms as a single block where possible (UBOs in WebGL 2) or minimize `gl.uniform` calls by checking dirty flags.
- **Status**: Partially implemented in `UniformBatcher`. Needs strict `dirty` checks for every single uniform type.

### 2.3 Texture Recycling (Space: $O(1)$)

- **Technique**: Never delete and recreate textures on resize unless absolutely necessary.
- **Strategy**: Allocate textures at the nearest power-of-two (POT) larger than screen size, and use `gl.viewport` to render into a subset. Prevents reallocation during window dragging.

---

## 3. Detailed Implementation Plan

### Phase 1: CPU Optimization (Hot Path)

1. **Refactor `useAnimation`**: Ensure `0` bytes aggregated allocation per frame.
   - Move all temporary variables to module-scope `const` or `useRef` buffers.
   - Replace any `map/filter` in the loop with `for` loops (removes closure allocation).

### Phase 2: GPU Memory Safety

1. **Loose Context Prevention**:
   - Implement `webglcontextlost` and `webglcontextrestored` listeners.
   - Auto-pause limits during background tab throttling.
2. **VRAM Budgeting**:
   - Hard cap resolution scaling at `1.5x` max.
   - Fallback to `Half-Float` textures if `Float` is unsupported (O(Memory) reduction).

### Phase 3: Mathematical Complexity

1. **Ray Marching Optimization**:
   - **Current**: Constant step size or simple adaptive.
   - **Target**: **Relaxed Cone Stepping**. Use the derivative of the distance field to skip empty space.
   - **Shader complexity**: Reduce from $O(Steps)$ to $O(\log(Steps))$ for flat space regions.

---

## 4. Specific Code Actions

### 4.1 Update `UniformBatcher` to use `Float32Array` views

Modify `src/utils/cpu-optimizations.ts` to use a single large `ArrayBuffer` for all uniforms, then create views (`Float32Array`) into it. This ensures data transfer to GPU is a direct memory copy.

### 4.2 Enforce "Struct of Arrays" (SoA) for Particles

If managing particles (accretion disk debris):

- **Don't**: `class Particle { x, y, z, vx, vy, vz }`
- **Do**:

  ```typescript
  const POS_X = new Float32Array(N);
  const POS_Y = new Float32Array(N);
  ...
  ```

- **Benefit**: CPU cache locality (L1/L2) improves performance by 10x.

---

## 5. Formal Verification

- **Memory**: Use Chrome DevTools "Allocation Timeline" to verify 0KB sawtooth pattern in `useAnimation`.
- **Time**: Ensure `frameTime` stays `< 16ms` (60fps) consistently.
