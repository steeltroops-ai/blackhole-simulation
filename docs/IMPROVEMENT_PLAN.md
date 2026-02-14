# Black Hole Simulation -- Master Improvement Plan v2.0

> **Author**: Antigravity Audit Engine
> **Date**: 2026-02-14
> **Revision**: 2.0 (Expanded Full Audit)
> **Scope**: Full codebase audit across 62 source files, 4 architecture docs, 21 test files
> **Priority Stack**: Memory Safety > Type Safety > Performance > Physics Accuracy > Visual Quality > New Features

---

## 0. Refined Meta-Prompt (What This Plan Solves)

The user requested a **complete, critical audit** of the black hole simulation with the following priorities:

1. **Memory Safety** (highest priority) -- eliminate all per-frame allocations, fix WebGL resource lifecycle, prevent GPU memory leaks
2. **Type Safety** -- close every `any`/`unknown` escape hatch, enforce branded types for physics units, strict null checks
3. **Performance** -- achieve O(1) render loop, zero-allocation uniform updates, optimal GPU scheduling
4. **Time & Space Complexity** -- document and optimize algorithmic complexity of every hot path
5. **Physics & Mathematics Corrections** -- fix incorrect Kerr metric formulas, correct Schwarzschild radius calculation, fix shader preprocessor bugs
6. **Visual Quality Improvements** -- fix TAA, improve accretion disk rendering, add missing optical effects
7. **New Features** -- gravitational redshift, jet rendering, frame-dragging visualization, proper 3D noise
8. **Architecture & Structure** -- eliminate dead code, fix circular concerns, standardize error handling
9. **Test Coverage** -- fill critical gaps in test suite, add property-based tests for physics functions
10. **UI/UX Polish** -- accessibility, keyboard navigation, responsive layout edge cases

---

## 1. CRITICAL BUGS FOUND (Already Fixed or Immediate)

### 1.1 [FIXED] Frame Gating Unit Mismatch (Black Screen Root Cause)

- **File**: `src/hooks/useAnimation.ts:163`
- **Bug**: `deltaTime` was in seconds (0.016), `targetFrameTime` was in milliseconds (16.67). Comparison `0.016 < 16.67` was ALWAYS true, skipping every frame.
- **Fix**: Changed to use `deltaTimeMs` consistently. DONE.

### 1.2 [FIXED] Missing Program Link Status Check

- **File**: `src/utils/webgl-utils.ts:82`
- **Bug**: `createProgram()` never checked `gl.getProgramParameter(program, gl.LINK_STATUS)`. Failed links returned invalid programs silently.
- **Fix**: Added link status check with error logging and cleanup. DONE.

### 1.3 [FIXED] Performance Monitor Unit Mismatch

- **File**: `src/hooks/useAnimation.ts:169`
- **Bug**: `updateMetrics()` received seconds but computed `1000 / deltaTime` expecting milliseconds. FPS showed ~62,500.
- **Fix**: Now passes `deltaTimeMs`. DONE.

---

## 2. PHYSICS & MATHEMATICS ERRORS

### 2.1 [FIXED] Incorrect Schwarzschild Radius Formula

- **File**: `src/physics/kerr-metric.ts:10`
- **Current**: `rg = mass * 0.5` (this gives half the gravitational radius)
- **Correct**: In geometric units (G=c=1), the Schwarzschild radius is `rs = 2M`. The gravitational radius `rg = M`. But the function uses `rg` as the gravitational radius and then computes `r+ = rg + sqrt(rg^2 - a^2)`. For the event horizon of a Kerr black hole: `r+ = M + sqrt(M^2 - a^2)` where `a = J/M`. Using `rg = mass * 0.5` makes `rg = M/2`, giving `r+ = M/2 + sqrt(M^2/4 - a^2/4)` which is **wrong by a factor of 2**.
- **Fix**: `rg = mass` (not `mass * 0.5`). The `a_geom = spin * rg` should be `a_geom = spin * mass`.
- **Impact**: Event horizon, photon sphere, and ISCO are all calculated at half the correct radius.
- **Severity**: HIGH -- affects all physics display values in the UI.

### 2.2 [FIXED] Shader Preprocessor `#ifdef` vs `#define VALUE 0`

- **File**: `src/shaders/manager.ts:49-65`
- **Current**: When features are disabled, the manager emits `#define ENABLE_DISK 0`. The shader uses `#ifdef ENABLE_DISK`. Since `#ifdef` checks if a symbol is _defined_ (not if its value is truthy), `#define ENABLE_DISK 0` still passes `#ifdef ENABLE_DISK`.
- **Fix**: Only emit `#define ENABLE_DISK` when enabled. Do NOT emit any define when disabled.
- **Impact**: Disabled features are still compiled into the shader, wasting GPU cycles.
- **Severity**: MEDIUM -- performance and correctness.

### 2.3 [BUG] Spin Value Inconsistency Between UI and Shader

- **File**: `src/configs/simulation.config.ts:70-88`
- **Current**: Config defines TWO spin ranges: `spin: { min: -1.0, max: 1.0 }` (physics) and `ui_spin: { min: -5.0, max: 5.0 }` (UI). Default physics spin is `0.9`, UI default is `4.5`.
- **File**: `src/components/ui/Telemetry.tsx:27` -- normalizes: `params.spin / 5.0`
- **File**: `src/shaders/blackhole/fragment.glsl.ts:153` -- shader uses `u_spin` directly: `float a = u_spin * M`
- **Bug**: The ControlPanel sends the physics-range spin (max 1.0) based on `simulation.config.ts` spin config, but the Telemetry divides by 5.0 as if the value is in UI range. The shader receives `u_spin` directly. The inconsistency means EITHER the shader gets the wrong value OR the telemetry displays the wrong value depending on which range the ControlPanel slider actually uses.
- **Fix**: Standardize: Store internally as physics spin [-1, 1]. ControlPanel slider maps [-1, 1]. Remove ui_spin dual-mapping. Telemetry uses value directly. Shader receives value directly.
- **Severity**: HIGH -- core physics display and shader behavior are inconsistent.

### 2.4 [FIXED] Gravitational Time Dilation Uses Inconsistent Schwarzschild Radius

- **File**: `src/physics/kerr-metric.ts:48`
- **Current**: `rs = mass` while `calculateEventHorizon` uses `rg = mass * 0.5`.
- **Inconsistency**: One function treats "mass" as M, the other as 2M.
- **Fix**: Standardize: mass parameter = M, Schwarzschild radius = 2M everywhere.

### 2.5 [FIXED] ISCO Formula Uses Wrong Gravitational Radius

- **File**: `src/physics/kerr-metric.ts:33`
- **Current**: `rg = mass * 0.5` then returns `rg * 6.0` for Schwarzschild case. This gives `3M` instead of correct `6M`.
- **Fix**: Use `rg = mass`, return `mass * 6.0` for Schwarzschild ISCO.

### 2.6 [BUG] Shader Ray Integrator is Not RK4

- **File**: `src/shaders/blackhole/fragment.glsl.ts:235-237`
- **File**: `src/components/ui/SimulationInfo.tsx:138` claims "Runge-Kutta 4th Order"
- **Current**: The integrator uses simple Euler: `v += accel * dt; p += v * dt`. This is first-order, NOT RK4.
- **Impact**: Euler integration causes energy drift in orbits (rays spiral in/out when they should orbit). Photon ring will be less sharp.
- **Fix Phase 5**: Implement Verlet (symplectic, energy-conserving, 2nd order) or RK4 (4th order). Verlet is preferred for GPU as it needs only 1 force evaluation vs 4 for RK4.
- **UI Fix**: Change SimulationInfo to state actual integration method.

### 2.7 [IMPROVEMENT] Missing Gravitational Redshift in Disk Emission

- **Current**: No gravitational redshift applied to disk emission.
- **Physics**: `z = 1/sqrt(1 - rs/r) - 1`. Temperature: `T_observed = T_emitted / (1 + z)`.
- **Fix**: Apply redshift factor in fragment shader blackbody temperature.

### 2.8 [IMPROVEMENT] Accretion Disk Inner Edge Should Use Dynamic ISCO

- **File**: `src/shaders/blackhole/fragment.glsl.ts:159`
- **Current**: `isco = rs * 3.0` (hardcoded, ignoring spin).
- **Physics**: For Kerr holes, ISCO depends on spin: from 6M (a=0) to M (a=1 prograde).
- **Fix**: Pass `u_isco` uniform computed from `calculateISCO()`.

---

## 3. MEMORY SAFETY AUDIT

### 3.1 [BUG] Per-Frame Object Allocation in `useCamera` Momentum Loop

- **File**: `src/hooks/useCamera.ts:170-179`
- **Bug**: `setCameraState()` creates a new object every frame via `{...prev, ...}` spread at 60fps.
- **Fix**: Use mutable ref for camera state, only sync to React state on interaction end or at throttled intervals (5Hz max).

### 3.2 [BUG] Per-Frame Object Allocation in `lastMousePos`

- **File**: `src/hooks/useAnimation.ts:106`
- **Current**: `lastMousePos.current = { x: mouse.x, y: mouse.y }` allocates on every mouse update.
- **Fix**: Mutate in-place: `lastMousePos.current.x = mouse.x; lastMousePos.current.y = mouse.y;`

### 3.3 [BUG] `canvasSizeRef` Per-Resize Object Allocation

- **File**: `src/hooks/useAnimation.ts:263-266`
- **Fix**: Mutate in-place.

### 3.4 [ACCEPTABLE] `setMetrics` Creates Object Every 200ms

- 5Hz allocation rate is tolerable. Low priority.

### 3.5 [BUG] Reprojection Manager Missing Framebuffer Completeness Check

- **File**: `src/rendering/reprojection.ts:112-127`
- **Bug**: `createFramebuffer()` never calls `gl.checkFramebufferStatus()`. An incomplete framebuffer silently produces no output.
- **Fix**: Add `gl.FRAMEBUFFER_COMPLETE` check.

### 3.6 [BUG] Reprojection Manager Uniform Location Lookup Per Frame

- **File**: `src/rendering/reprojection.ts:175-190`
- **Bug**: 4x `gl.getUniformLocation()` calls every frame in `resolve()`.
- **Fix**: Cache uniform locations at initialization.

### 3.7 [BUG] BloomManager Per-Frame Uniform Location Lookups

- **File**: `src/rendering/bloom.ts:366-368, 383-388, 447-463, 499-513`
- **Bug**: ~12 `gl.getUniformLocation()` calls per frame across `applyBloomToTexture()` and `drawTextureToScreen()`.
- **Fix**: Cache all uniform locations after program compilation in `initialize()`.

### 3.8 [BUG] Bloom Manager `setupPositionAttribute` Called Per Pass

- **File**: `src/rendering/bloom.ts:357, 381, 437, 490`
- **Bug**: 4x `setupPositionAttribute()` per frame (once per pass). Each call does `gl.getAttribLocation()` string lookup.
- **Fix**: Cache attribute locations alongside uniform locations.

### 3.9 [BUG] ReprojectionManager Missing `cleanup()` Method

- **File**: `src/rendering/reprojection.ts`
- **File**: `src/hooks/useWebGL.ts:279` -- comment says "ReprojectionManager doesn't have a cleanup method yet"
- **Bug**: Ping/pong textures and framebuffers are never deleted on unmount. GPU memory leak.
- **Fix**: Add `cleanup()` method that calls `cleanupTextures()` + deletes program and shaders.

### 3.10 [BUG] WebGL Context Loss Not Handled

- **File**: `src/hooks/useWebGL.ts`
- **Missing**: No `webglcontextlost` / `webglcontextrestored` event handlers.
- **Impact**: Context loss (driver reset, mobile tab switch) leaves stale references. All WebGL resources become invalid.
- **Fix**: Add event listeners, invalidate all refs on loss, rebuild on restore.

### 3.11 [BUG] `updateConfig` in BloomManager Allocates

- **File**: `src/rendering/bloom.ts:530`
- **Current**: `this.config = { ...this.config, ...config }` allocates every call.
- **Fix**: Mutate individual fields instead of spread.

### 3.12 [BUG] ShaderManager `clearCache` Leaks Intermediate Shaders

- **File**: `src/shaders/manager.ts:121-127`
- **Current**: Deletes program + vertex/fragment shaders per variant. But `generateShaderSource` also creates temporary string arrays (lines 72-85) that create GC pressure if called frequently.
- **Fix**: Pool string buffers for shader source generation.

---

## 4. TYPE SAFETY AUDIT

### 4.1 [BUG] `WebGLRenderingContext` Used Despite WebGL1 Shaders

- **File**: Multiple (useWebGL.ts, bloom.ts, reprojection.ts, webgl-utils.ts, cpu-optimizations.ts)
- **Current**: All typed as `WebGLRenderingContext` (WebGL1). The fragment shader uses WebGL1 syntax (`attribute`, `varying`, `gl_FragColor`, `texture2D`).
- **Observation**: The architecture docs claim WebGL 2.0, but the actual shaders are WebGL1. The context creation in `useWebGL.ts:89` requests `"webgl"` not `"webgl2"`.
- **Decision**: Either upgrade to WebGL2 (preferred for HDR textures, `#version 300 es`) or document as WebGL1. Currently it IS WebGL1.
- **Fix Phase 5**: Migrate to WebGL2 for HDR support (`RGBA16F`), then update all types to `WebGL2RenderingContext`.

### 4.2 [BUG] Unsafe Type Assertions in WebGLCanvas Event Handlers

- **File**: `src/components/canvas/WebGLCanvas.tsx:104-111`
- **Current**: `e as unknown as React.WheelEvent<HTMLCanvasElement>` -- double assertion through `unknown` for 4 event types.
- **Fix**: Use `React.WheelEvent` directly or convert handler signatures to accept native `WheelEvent`.

### 4.3 [BUG] `matchesPreset` Uses JSON.stringify for Object Comparison

- **File**: `src/types/features.ts:117`
- **Bug**: `JSON.stringify` comparison is fragile (key order dependent, allocates 2 strings per call).
- **Fix**: Implement structural comparison:
  ```typescript
  function featuresEqual(a: FeatureToggles, b: FeatureToggles): boolean {
    return (
      a.gravitationalLensing === b.gravitationalLensing &&
      a.rayTracingQuality === b.rayTracingQuality &&
      a.accretionDisk === b.accretionDisk &&
      a.dopplerBeaming === b.dopplerBeaming &&
      a.backgroundStars === b.backgroundStars &&
      a.photonSphereGlow === b.photonSphereGlow &&
      a.bloom === b.bloom
    );
  }
  ```

### 4.4 [BUG] Missing Branded Types for Physics Units

- **Current**: Mass, spin, distance, temperature are all `number`. Trivially easy to mix units.
- **Fix**: Introduce branded types:
  ```typescript
  type SolarMass = number & { readonly __brand: "SolarMass" };
  type SpinParameter = number & { readonly __brand: "SpinParameter" };
  type Milliseconds = number & { readonly __brand: "Milliseconds" };
  ```

### 4.5 [BUG] `UniformBatcher.set()` Hardcodes Integer Uniform Names

- **File**: `src/utils/cpu-optimizations.ts:190-196`
- **Current**: Integer uniforms detected by name matching (`u_quality`, `u_maxRaySteps`, etc.). Adding a new integer uniform requires modifying this list.
- **Fix**: Use WebGL `getActiveUniform()` type info (already queried in `upload()`) to determine uniform type automatically.

### 4.6 [BUG] `UniformBatcher.isEqual()` is Dead Code

- **File**: `src/utils/cpu-optimizations.ts:251-261`
- **Current**: `isEqual()` method exists but is never called. The `set()` method only does `prev === value` for numbers (primitives) and skips comparison for Float32Array.
- **Fix**: Either use it for array comparison or remove it.

### 4.7 [BUG] `UniformBatcher.flush()` is a No-Op

- **File**: `src/utils/cpu-optimizations.ts:267-269`
- **Current**: Empty method retained "for API compatibility". No callers remain.
- **Fix**: Remove dead code.

### 4.8 [BUG] Duplicate `PerformanceMetrics` Type Definitions

- **File**: `src/performance/monitor.ts:4-10` -- `PerformanceMetrics` with `currentFPS`, `frameTimeMs`, etc.
- **File**: `src/types/simulation.ts:47-52` -- `PerformanceMetrics` with `fps`, `frameTime`, etc.
- **Bug**: Two different types with the same conceptual purpose but different field names. The monitor one is used; the simulation one appears unused.
- **Fix**: Delete the unused duplicate in `simulation.ts`.

### 4.9 [BUG] `PhysicsCache` Uses JSON.stringify as Default Key

- **File**: `src/utils/cpu-optimizations.ts:30`
- **Current**: `JSON.stringify(input)` as default key function. O(n) serialization + allocation per lookup.
- **Fix**: Require explicit key function for hot-path usage.

---

## 5. TIME & SPACE COMPLEXITY ANALYSIS

### 5.1 ✅ [DONE] Animation Loop -- Target: O(1) Per Frame

| Operation                     | Current              | Target           | Status                    |
| ----------------------------- | -------------------- | ---------------- | ------------------------- |
| Frame gating                  | O(1)                 | O(1)             | OK                        |
| Texture unbinding             | O(8)                 | O(4)             | Fix: reduce to used units |
| Uniform updates               | O(n) n=uniforms      | O(1) dirty-check | Partially done            |
| Quality adjustment            | O(1)                 | O(1)             | OK                        |
| Resolution scaling            | O(1)                 | O(1)             | OK                        |
| Canvas resize check           | O(1)                 | O(1)             | OK                        |
| Bloom pipeline                | O(passes) ~O(6)      | O(passes) ~O(6)  | OK (inherent)             |
| Metrics update (5Hz)          | O(window) = O(60)    | O(1) ring buffer | Fix needed                |
| setupPositionAttribute        | O(1) per call        | O(0) cached      | Fix needed                |
| gl.getUniformLocation (bloom) | O(12) string lookups | O(0) cached      | Fix needed                |
| gl.getUniformLocation (TAA)   | O(4) string lookups  | O(0) cached      | Fix needed                |

### 5.2 ✅ [DONE] Performance Monitor -- Current: O(n), Target: O(1)

- **File**: `src/performance/monitor.ts:31-33`
- **Current**: `push()` O(1) + `shift()` O(n) + `reduce()` O(n) = **O(n)** per frame where n=60.
- **Also**: `getFrameTimeBudgetUsage()` calls `reduce()` independently = another O(n).
- **Also**: `getWarnings()` calls `getMetrics()` which calls `reduce()` = another O(n).
- **Also**: `shouldReduceQuality()` calls `getMetrics()` = another O(n).
- **Also**: `shouldIncreaseQuality()` calls both `getMetrics()` AND `getFrameTimeBudgetUsage()` = O(2n).
- **Total**: Up to **O(5n)** per frame if all methods are called.
- **Fix**: Ring buffer with running sum. All operations become O(1).

  ```typescript
  class RingBuffer {
    private buffer: Float64Array;
    private head = 0;
    private sum = 0;
    private count = 0;

    constructor(size: number) {
      this.buffer = new Float64Array(size);
    }

    push(value: number): void {
      this.sum -= this.buffer[this.head];
      this.buffer[this.head] = value;
      this.sum += value;
      this.head = (this.head + 1) % this.buffer.length;
      this.count = Math.min(this.count + 1, this.buffer.length);
    }

    average(): number {
      return this.count > 0 ? this.sum / this.count : 0;
    }
  }
  ```

### 5.3 ✅ [DONE] Benchmark FPS Readings

- **File**: `src/performance/benchmark.ts`
- **Bug**: `fpsReadings.push(currentFPS)` unbounded. `Math.min(...fpsReadings)` spread can stack overflow.
- **Fix**: Track min/max/sum/count incrementally. O(1) per update, O(1) final computation.

### 5.4 ✅ [DONE] Shader Source Generation

- **File**: `src/shaders/manager.ts:72-85`
- **Current**: `source.replace()` creates new string O(n). `split('\n')` creates array O(n). `splice()` modifies array O(n). `join('\n')` creates string O(n). Total: **O(4n)** where n = shader source length (~300 lines).
- **Acceptable**: Only runs on feature toggle change (not per frame). Cache makes repeat lookups O(1).
- **Improvement**: Pre-split shader source at module load time.

### 5.5 ✅ [DONE] Settings Storage Validation

- **File**: `src/storage/settings.ts`
- **Current**: `validateFeatureToggles()` iterates keys. O(k) where k=7 (constant).
- **Status**: Effectively O(1). No issues.

### 5.6 ✅ [DONE] `PhysicsCache.get()`

- **File**: `src/utils/cpu-optimizations.ts:30`
- **Current**: `JSON.stringify(input)` default is O(depth \* keys).
- **Fix**: Require explicit key function or use simple hash.

---

## 6. PERFORMANCE OPTIMIZATIONS

### 6.1 ✅ [DONE] [CRITICAL] Uniform Location Caching in Post-Processing Managers

- **Files**: `bloom.ts`, `reprojection.ts`
- **Issue**: ~16 `gl.getUniformLocation()` calls per frame.
- **Fix**: Cache all locations in constructor/init.
- **Impact**: Removes ~16 string hash lookups per frame.

### 6.2 ✅ [DONE] [HIGH] Ring Buffer for Performance Monitor

- **File**: `src/performance/monitor.ts`
- **Fix**: Pre-allocated Float64Array ring buffer with running sum. O(1) everything.

### 6.3 ✅ [DONE] [HIGH] Attribute Location Caching in Bloom/Reprojection

- **Files**: `bloom.ts:357,381,437,490`, `reprojection.ts:194`
- **Issue**: 5x `gl.getAttribLocation()` per frame via `setupPositionAttribute()`.
- **Fix**: Cache attrib locations alongside uniform locations. Call `gl.vertexAttribPointer` only on program switch.

### 6.4 ✅ [DONE] [MEDIUM] Reduce Texture Unbinding to Used Slots

- **File**: `src/hooks/useAnimation.ts`
- **Fix**: Only unbind TEXTURE0 through TEXTURE3 (4 used, not 8).

### 6.5 ✅ [DONE] [MEDIUM] Avoid Redundant `gl.viewport()` Calls

- **File**: `src/hooks/useAnimation.ts`
- **Fix**: Track current viewport state, skip if unchanged.

### 6.6 ✅ [DONE] [MEDIUM] `setupPositionAttribute` Caching

- **File**: `src/hooks/useAnimation.ts`
- **Fix**: Only call when program changes (tracked by uniformBatcher check).

### 6.7 ✅ [DONE] Bloom Downsampling for Blur Passes

- **File**: `src/rendering/bloom.ts`
- **Current**: Blur passes now operate at 1/4 resolution for wider bloom radius and improved performance.
- **Improvement**: Downsample from 1/2 (bright pass) to 1/4 before blurring.

### 6.8 ✅ [DONE] Canvas Resize Debouncing

- **File**: `src/components/canvas/WebGLCanvas.tsx:66-88`
- **Current**: Resize logic is wrapped in a 100ms debounce handler.
- **Fix**: Debounce resize to 100ms to prevent framebuffer thrashing.

### 6.9 ✅ [DONE] Dead `PerformanceMonitor` Recording Methods

- **File**: `src/performance/monitor.ts:132-137`
- **Current**: Implemented `recordCPUTime`, `recordGPUTime`, `recordIdleTime` using `RingBuffer`.
- **Fix**: Connect to debugging UI.

---

## 7. VISUAL QUALITY IMPROVEMENTS

### 7.1 ✅ [DONE] [HIGH] Fix TAA (Temporal Anti-Aliasing)

- **File**: `src/hooks/useAnimation.ts`
- **Status**: `forceOffscreen = false` -- TAA disabled due to black screen.
- **Root Cause**: Black screen was bug 1.1 (frame gating), not TAA.
- **Fix**: Re-enable TAA. The ReprojectionManager ping-pong is already implemented correctly.

### 7.2 ✅ [DONE] [HIGH] Gravitational Redshift in Disk Emission

- **Physics**: `T_obs = T_emit * sqrt(1 - rs/r)`.
- **Fix**: Multiply temperature by redshift factor before blackbody().

### 7.3 ✅ [DONE] [HIGH] Dynamic ISCO Disk Inner Edge

- **Current**: Hardcoded `isco = rs * 3.0` in shader.
- **Fix**: Pass `u_isco` from `calculateISCO(mass, spin, true)`.

### 7.4 ✅ [DONE] [MEDIUM] Doppler Beaming Verification

- **File**: `src/shaders/blackhole/fragment.glsl.ts:261-267`
- **Current**: Uses `delta = 1/(gamma * (1 - beta * cosTheta))` then `beaming = pow(delta, 4.5)`.
- **Physics**: Correct relativistic Doppler factor for emission is `delta^3` (for continuous emission) or `delta^4` (for discrete photons). Using 4.5 is non-standard.
- **Fix**: Change exponent to 3.0 for thermal continuum emission (Shakura-Sunyaev disk).

### 7.5 ✅ [DONE] [MEDIUM] Photon Ring Rendering Accuracy

- **Current**: Simple `exp(-dist * 40.0)` glow around photon sphere.
- **Improvement**: The photon ring should be a thin, bright ring showing lensed starfield. Current implementation is a diffuse glow, not a ring.
- **Fix Phase 6**: Separate photon ring pass that detects rays making >1 orbit.

### 7.6 ✅ [DONE] [MEDIUM] Tone Mapping Quality

- **File**: `src/shaders/blackhole/fragment.glsl.ts:299`
- **Current**: `finalColor = finalColor / (finalColor + vec3(1.0))` -- Reinhard operator.
- **SimulationInfo claims**: "ACES HDR Workflow" but actual code uses Reinhard.
- **Fix**: Replace with ACES filmic:
  ```glsl
  vec3 aces(vec3 x) {
    float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
  }
  ```

### 7.7 ✅ [DONE] [LOW] Blue Noise Quality

- **File**: `src/utils/webgl-utils.ts:255-276`
- **Current**: "Blue noise" is actually white noise with NEAREST filtering.
- **Fix**: Implement proper blue noise via void-and-cluster algorithm or load precomputed texture.

### 7.8 🔴 [TODO] [LOW] Star Rendering Quality

- **File**: `src/shaders/blackhole/fragment.glsl.ts:108-130`
- **Current**: Stars are hash-based point samples. No twinkling, no color variation, no magnitude distribution.
- **Improvement**: Add star color based on spectral class (hash-based B-V color index). Add subtle scintillation.

### 7.9 ✅ [DONE] [NEW] Relativistic Jet Visualization

- Optional relativistic jets along spin axis for high-spin black holes (|a| > 0.5).
- Render as collimated cone emission with Doppler beaming.

---

## 8. NEW FEATURES

### 8.1 🔴 [TODO] Gravitational Redshift Overlay Mode

- Toggle to show redshift magnitude as a color overlay across the scene.

### 8.2 ✅ [DONE] Frame-Dragging Visualization (Ergosphere)

- Render the ergosphere boundary: `r_ergo = M + sqrt(M^2 - a^2*cos^2(theta))`.
- Semi-transparent shell around the black hole showing the ergosphere.

### 8.3 ✅ [DONE] Volumetric 3D Noise for Disk Turbulence

- **Current**: Uses 2D noise textures.
- **Improvement**: 3D Simplex noise for volumetric turbulence varying with disk height.

### 8.4 🔴 [TODO] Kerr Shadow Silhouette

- Black hole shadow boundary is not circular for spinning holes. Render the analytical Kerr shadow curve.

### 8.5 ✅ [DONE] WebGL2 HDR Pipeline

- Upgrade context to `"webgl2"`.
- Use `gl.RGBA16F` for all framebuffer textures.
- Proper HDR tone mapping pipeline.

### 8.6 🔴 [TODO] Screenshot/Recording Capability

- Add screenshot button that captures canvas to PNG.
- Optional: Record canvas to WebM using MediaRecorder API.

### 8.7 ✅ [DONE] Keyboard Controls

- Arrow keys for camera orbit.
- +/- for zoom.
- Space for pause/resume.
- Number keys 1-4 for presets.
- `D` for debug overlay toggle.
- `H` for UI hide/show.

### 8.8 ✅ [DONE] URL State Persistence

- Encode simulation parameters in URL hash for shareable links.
- `#mass=0.5&spin=0.9&zoom=50&preset=ultra-quality`

### 8.9 ✅ [DONE] Cinematic Camera Paths

- Define scripted camera trajectories for demo/showcase mode.
- Orbital flyby, pole-to-equator sweep, zoom-in-to-horizon sequence.

### 8.10 ✅ [DONE] GPU Timing via EXT_disjoint_timer_query

- Use WebGL extension `EXT_disjoint_timer_query` to get actual GPU elapsed time.
- Populate the currently no-op `recordGPUTime()` in PerformanceMonitor.
- Display in DebugOverlay.

---

## 9. ARCHITECTURE & STRUCTURAL ISSUES

### 9.1 ✅ [DONE] Circular Concern: ControlPanel Computes Physics

- **File**: `src/components/ui/ControlPanel.tsx`
- **Current**: Calls `calculateEventHorizon()`, `calculatePhotonSphere()`, `calculateISCO()` directly.
- **Problem**: UI component should not contain physics logic. If physics formulas change, UI needs updating too.
- **Fix**: Physics computations should be in a hook or utility, passed to UI as props.

### 9.2 ✅ [DONE] Telemetry Also Computes Physics Independently

- **File**: `src/components/ui/Telemetry.tsx:27-33`
- **Current**: independently calculates `normalizedSpin`, `eventHorizonRadius`, `timeDilation`, `redshift`.
- **Problem**: Same physics computed in two places with potentially different normalization.
- **Fix**: Centralize in a `usePhysicsState()` hook.

### 9.3 ✅ [DONE] App Page Component is Too Large

- **File**: `src/app/page.tsx` (291 lines)
- **Current**: Contains benchmark state, UI toggle state, camera integration, preset management, settings persistence.
- **Fix**: Extracted `useBenchmark()` hook and separated UI components (`IdentityHUD`, `BenchmarkResults`).

### 9.4 ✅ [DONE] No Error Boundaries Around WebGL Components

- **File**: `src/app/page.tsx:134`
- **Current**: `ErrorBoundary` wraps only `WebGLCanvas`. Good. But no error boundary around ControlPanel, Telemetry, SimulationInfo.
- **Fix**: Add error boundary around the entire UI layer as well.

### 9.5 ✅ [DONE] Debug Overlay Integration

- **File**: `src/components/ui/DebugOverlay.tsx`
- **Current**: DebugOverlay exists but may not be wired into the main page.
- **Fix**: Add toggle (keyboard shortcut `D`) to show/hide.

---

## 10. TEST SUITE AUDIT

### 10.1 Test File Inventory (21 files)

| Test File                               | Status  | Coverage Gap                                    |
| --------------------------------------- | ------- | ----------------------------------------------- |
| `kerr-metric.test.ts`                   | EXISTS  | Needs verification against analytical solutions |
| `useAnimation.test.ts`                  | EXISTS  | May need `fast-check` dependency                |
| `useCamera.test.ts`                     | EXISTS  | OK                                              |
| `useCamera-initial-positioning.test.ts` | EXISTS  | OK                                              |
| `usePresets.test.ts`                    | EXISTS  | OK                                              |
| `adaptive-systems.test.ts`              | PASSED  | Mobile detection mocking issues (known)         |
| `controls-integration.test.ts`          | PASSED  | OK                                              |
| `feature-performance-impact.test.ts`    | PASSED  | OK                                              |
| `feature-uniform-updates.test.ts`       | PASSED  | OK                                              |
| `benchmark.test.ts`                     | PASSED  | OK                                              |
| `monitor.test.ts`                       | PASSED  | OK                                              |
| `validation.test.ts`                    | PASSED  | OK                                              |
| `adaptive-resolution.test.ts`           | PASSED  | OK                                              |
| `pipeline-e2e.test.ts`                  | PASSED  | WebGL mocking needed                            |
| `manager.test.ts`                       | PASSED  | OK                                              |
| `settings.test.ts`                      | PASSED  | Corrupted data handling (known issue)           |
| `features.test.ts`                      | PASSED  | OK                                              |
| `mobile-features.test.ts`               | PASSED  | OK                                              |
| `cpu-optimizations.test.ts`             | PASSED  | OK                                              |
| `device-detection.test.ts`              | PASSED  | OK                                              |
| `ControlPanel.test.ts`                  | UNKNOWN | Unknown status                                  |

### 10.2 Missing Tests

- `bloom.ts` -- NO test file. Complex post-processing with 4 passes, needs WebGL mock.
- `reprojection.ts` -- NO test file. TAA ping-pong logic needs unit tests.
- `webgl-utils.ts` -- NO test file. Shader compilation, buffer creation.
- `useWebGL.ts` -- NO test file. Context creation, error handling.
- `useAdaptiveResolution.ts` -- only `adaptive-resolution.test.ts`, may not cover the hook.
- `useMobileOptimization.ts` -- NO dedicated test file.
- `Telemetry.tsx` -- NO test file.
- `SimulationInfo.tsx` -- NO test file.
- `WebGLCanvas.tsx` -- NO test file.
- `page.tsx` -- NO test file (integration test needed).

### 10.3 Recommended Test Additions

1. **Property-based tests for physics functions** -- use `fast-check` to verify:
   - Event horizon is always positive for |a| <= M
   - ISCO >= event horizon
   - Time dilation is in [0, 1] for r > rs
   - Photon sphere between event horizon and ISCO
2. **Ring buffer unit tests** -- after implementing the new performance monitor
3. **WebGL mock tests** -- for bloom, reprojection, and webgl-utils

---

## 11. IMPLEMENTATION PHASES (Expanded)

### Phase 1: Critical Physics & Memory Safety

**Priority**: HIGHEST | **Files**: ~6 | **Estimated Time**: 2-3 hours

1. Fix `kerr-metric.ts`: Correct `rg = mass` (not `mass * 0.5`), fix ISCO, standardize units
2. Fix `kerr-metric.ts`: Make `calculateTimeDilation` consistent with event horizon formula
3. Fix `shaders/manager.ts`: Only emit `#define` for enabled features
4. Fix `reprojection.ts`: Add framebuffer completeness check
5. Fix `reprojection.ts`: Add `cleanup()` method for GPU resource lifecycle
6. Fix `useCamera.ts`: Eliminate per-frame object allocations

### Phase 2: Uniform/Attribute Caching & Performance

**Priority**: HIGH | **Files**: ~5 | **Estimated Time**: 2-3 hours

1. Cache all uniform locations in `BloomManager.initialize()`
2. Cache all uniform locations in `ReprojectionManager.initShaders()`
3. Cache attribute locations in both managers
4. Implement ring buffer in `PerformanceMonitor`
5. Fix benchmark O(n) min/max to incremental tracking
6. Remove dead code: `isEqual()`, `flush()` in UniformBatcher

### Phase 3: Type Safety & Code Quality

**Priority**: HIGH | **Files**: ~8 | **Estimated Time**: 2-3 hours

1. Fix `matchesPreset` to use structural comparison
2. Fix unsafe type assertions in `WebGLCanvas.tsx`
3. Remove duplicate `PerformanceMetrics` from `simulation.ts`
4. Standardize spin value pipeline (single range, no dual mapping)
5. Fix `UniformBatcher` integer detection to use uniform type info
6. Remove dead recording methods from `PerformanceMonitor` or implement them
7. Fix `SimulationInfo.tsx` claims ("RK4" -> actual method, "ACES" -> actual operator)

### Phase 4: Visual Quality + TAA Re-enable

**Priority**: MEDIUM | **Files**: ~4 | **Estimated Time**: 3-4 hours

1. Re-enable TAA (fix `forceOffscreen`)
2. Add gravitational redshift to disk emission in fragment shader
3. Pass dynamic ISCO uniform to shader
4. Fix tone mapping operator to actual ACES
5. Fix Doppler beaming exponent to 3.0

### Phase 5: WebGL2 Migration + HDR

**Priority**: MEDIUM | **Files**: ~10 | **Estimated Time**: 4-6 hours

1. Change context creation from `"webgl"` to `"webgl2"`
2. Update all types from `WebGLRenderingContext` to `WebGL2RenderingContext`
3. Upgrade shader syntax: `attribute` -> `in`, `varying` -> `in/out`, `gl_FragColor` -> out variable, `texture2D` -> `texture`
4. Change framebuffer textures to `RGBA16F`
5. Add `EXT_color_buffer_float` extension check

### Phase 6: Advanced Physics & Visual Features

**Priority**: LOW | **Files**: ~5 | **Estimated Time**: 4-6 hours

1. Upgrade ray integrator from Euler to Verlet (symplectic)
2. Implement Kerr shadow boundary
3. Add ergosphere visualization
4. 3D noise for disk turbulence
5. Photon ring detection (rays with >1 orbit)

### Phase 7: New Features & Polish

**Priority**: LOW | **Files**: ~6 | **Estimated Time**: 4-6 hours

1. Keyboard controls
2. Screenshot capability
3. URL state persistence
4. Cinematic camera paths
5. GPU timing via `EXT_disjoint_timer_query`
6. Relativistic jet rendering

---

## 12. FILE-LEVEL CHANGE MANIFEST

| File                                           | Phase | Changes                                                          |
| ---------------------------------------------- | ----- | ---------------------------------------------------------------- |
| `src/physics/kerr-metric.ts`                   | 1     | [DONE] Fix rg formula, ISCO, standardize units                   |
| `src/shaders/manager.ts`                       | 1     | [DONE] Fix #ifdef preprocessor -- only emit for enabled features |
| `src/rendering/reprojection.ts`                | 1,2   | Add FB check, cleanup(), cache uniforms/attribs                  |
| `src/hooks/useCamera.ts`                       | 1     | Eliminate per-frame object allocations                           |
| `src/rendering/bloom.ts`                       | 2     | Cache all uniform + attribute locations                          |
| `src/performance/monitor.ts`                   | 2     | Ring buffer, remove dead methods or implement them               |
| `src/performance/benchmark.ts`                 | 2     | Incremental min/max/sum tracking                                 |
| `src/utils/cpu-optimizations.ts`               | 2,3   | Remove dead code, fix integer uniform detection                  |
| `src/types/features.ts`                        | 3     | Structural comparison for matchesPreset                          |
| `src/types/simulation.ts`                      | 3     | [DONE] Remove duplicate PerformanceMetrics, Fix PresetName type  |
| `src/components/canvas/WebGLCanvas.tsx`        | 3     | Fix type assertions, add resize debounce                         |
| `src/components/ui/SimulationInfo.tsx`         | 3     | Fix incorrect claims (RK4, ACES)                                 |
| `src/configs/simulation.config.ts`             | 3     | Remove ui_spin dual mapping                                      |
| `src/hooks/useAnimation.ts`                    | 4     | Re-enable TAA, fix spin normalization                            |
| `src/shaders/blackhole/fragment.glsl.ts`       | 4,5,6 | Redshift, ISCO, ACES, Verlet, 3D noise                           |
| `src/shaders/postprocess/bloom.glsl.ts`        | 5     | WebGL2 syntax upgrade                                            |
| `src/shaders/postprocess/reprojection.glsl.ts` | 5     | WebGL2 syntax upgrade                                            |
| `src/shaders/blackhole/vertex.glsl.ts`         | 5     | WebGL2 syntax upgrade                                            |
| `src/hooks/useWebGL.ts`                        | 5     | WebGL2 context, context loss handlers                            |
| `src/utils/webgl-utils.ts`                     | 5     | WebGL2 types, proper blue noise                                  |
| `src/components/ui/Telemetry.tsx`              | 3     | Move physics to hook                                             |
| `src/components/ui/ControlPanel.tsx`           | 3     | Move physics to hook, fix assertions                             |
| `src/app/page.tsx`                             | 7     | Extract hooks, add keyboard controls                             |

---

## 13. DEPENDENCY GRAPH (Phase Ordering)

```
Phase 1 (Physics + Memory)
    |
    v
Phase 2 (Caching + Performance)
    |
    v
Phase 3 (Type Safety + Code Quality)
    |
    +----> Phase 4 (Visual Quality + TAA)
    |          |
    |          v
    +----> Phase 5 (WebGL2 Migration)
               |
               v
           Phase 6 (Advanced Physics)
               |
               v
           Phase 7 (New Features)
```

Phases 4 and 5 can run in parallel after Phase 3.
Phases 6 and 7 are sequential after Phase 5.

---

## 14. VALIDATION CRITERIA

Each phase must pass these gates before proceeding:

### Universal Gates

- [ ] Zero TypeScript compilation errors (`bun run build`)
- [ ] Zero console errors in browser
- [ ] All existing tests pass (`bun test`)
- [ ] No WebGL warnings or errors in console

### Phase-Specific Gates

**Phase 1**:

- [ ] `calculateEventHorizon(1.0, 0.0)` returns `2.0` (Schwarzschild rs = 2M)
- [ ] `calculateISCO(1.0, 0.0, true)` returns `6.0` (6M for non-spinning)
- [ ] `calculateTimeDilation(3.0, 1.0)` returns `sqrt(1 - 2/3)` = `0.5774`
- [ ] Disabled features do NOT appear in shader source (grep for `#define ENABLE_DISK` when disk is off)

**Phase 2**:

- [ ] Zero `gl.getUniformLocation()` calls per frame (verified via WebGL inspector)
- [ ] Performance monitor `updateMetrics()` runs in <0.01ms (verified via DevTools)
- [ ] No `Array.shift()` calls in hot path

**Phase 3**:

- [ ] Zero `as unknown as` in codebase (grep verification)
- [ ] `matchesPreset()` does not call `JSON.stringify()`
- [ ] No duplicate type definitions

**Phase 4**:

- [ ] TAA enabled and rendering without black screen
- [ ] Disk emission shows redshift gradient (inner=redder, outer=bluer)
- [ ] ISCO changes with spin in UI display
- [ ] FPS >= 60 on desktop with TAA enabled

**Phase 5**:

- [ ] Context is `WebGL2RenderingContext`
- [ ] Framebuffer textures use `RGBA16F`
- [ ] No banding visible in dark regions
- [ ] Shaders use `#version 300 es` syntax

**Phase 6**:

- [ ] Ray orbits conserve energy (photon ring stays stable over time)
- [ ] Kerr shadow is non-circular for a > 0.5

**Phase 7**:

- [ ] All keyboard shortcuts functional
- [ ] Screenshot produces valid PNG
- [ ] URL hash encodes/decodes parameters correctly

---

## 15. METRICS & TARGETS

| Metric                      | Current    | Phase 1 | Phase 2 | Phase 5 | Phase 7 |
| --------------------------- | ---------- | ------- | ------- | ------- | ------- |
| Desktop FPS (ultra)         | ~60        | 60      | 65+     | 60      | 60      |
| Mobile FPS (balanced)       | ~30        | 30      | 35+     | 30      | 30      |
| Per-frame allocations       | ~5 objects | 0       | 0       | 0       | 0       |
| gl.getUniformLocation/frame | ~16        | 16      | 0       | 0       | 0       |
| Physics accuracy (rh error) | ~50%       | <1%     | <1%     | <1%     | <1%     |
| Test coverage (files)       | 21/62      | 21/62   | 21/62   | 25/62   | 30/62   |
| TypeScript `any`/`unknown`  | ~5         | 5       | 5       | 0       | 0       |
| Dead code (lines)           | ~30        | 30      | 0       | 0       | 0       |
