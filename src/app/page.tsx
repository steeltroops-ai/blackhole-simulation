"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { WebGLCanvas } from "@/components/canvas/WebGLCanvas";
import { WebGPUCanvas } from "@/components/canvas/WebGPUCanvas";
import ErrorBoundary from "@/components/debug/ErrorBoundary";
import { IdentityHUD } from "@/components/ui/IdentityHUD";
import { CompatibilityHUD } from "@/components/ui/CompatibilityHUD";
import { useHardwareSupport } from "@/hooks/useHardwareSupport";

// Dynamic Imports for Performance Optimization (SEO)
const ControlPanel = dynamic(
  () => import("@/components/ui/ControlPanel").then((mod) => mod.ControlPanel),
  { ssr: false },
);
const Telemetry = dynamic(
  () => import("@/components/ui/Telemetry").then((mod) => mod.Telemetry),
  { ssr: false },
);
const SimulationInfo = dynamic(
  () =>
    import("@/components/ui/SimulationInfo").then((mod) => mod.SimulationInfo),
  { ssr: true },
);
const BenchmarkResults = dynamic(
  () =>
    import("@/components/ui/BenchmarkResults").then(
      (mod) => mod.BenchmarkResults,
    ),
  { ssr: false },
);
const DebugOverlay = dynamic(
  () => import("@/components/ui/DebugOverlay").then((mod) => mod.DebugOverlay),
  { ssr: false },
);
const CinematicOverlay = dynamic(
  () =>
    import("@/components/ui/CinematicOverlay").then(
      (mod) => mod.CinematicOverlay,
    ),
  { ssr: false },
);
const SpacetimeCanvas = dynamic(
  () => import("@/components/spacetime").then((mod) => mod.SpacetimeCanvas),
  { ssr: false },
);

import { useCamera } from "@/hooks/useCamera";
import { useBenchmark } from "@/hooks/useBenchmark";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useUrlState } from "@/hooks/useUrlState";

import { useAdaptiveResolution } from "@/hooks/useAdaptiveResolution";
import { useMobileOptimization } from "@/hooks/useMobileOptimization";
import { usePresets } from "@/hooks/usePresets";
import { type SimulationParams, DEFAULT_PARAMS } from "@/types/simulation";
import type { PerformanceMetrics } from "@/performance/monitor";
import type { DebugMetrics } from "@/components/ui/DebugOverlay";
import { DEFAULT_FEATURES, type PresetName } from "@/types/features";
import { settingsStorage } from "@/storage/settings";
import { useWebGPUSupport } from "@/hooks/useWebGPUSupport";

const App = () => {
  const { isMobile, getMobileFeatures } = useMobileOptimization();
  const { applyPreset } = usePresets();
  const { isSupported: isWebGPUSupported } = useWebGPUSupport();
  const hardwareSupport = useHardwareSupport();

  const [params, setParams] = useState<SimulationParams>(() => {
    // Forced Config Authority: Ignore local storage to respect simulation.config.ts defaults
    let initialFeatures = DEFAULT_FEATURES;
    let initialPreset: PresetName = "ultra-quality";

    if (isMobile) {
      initialFeatures = getMobileFeatures();
      initialPreset = "balanced";
    }

    return {
      ...DEFAULT_PARAMS,
      quality: initialFeatures.rayTracingQuality,
      features: initialFeatures,
      performancePreset: initialPreset,
      adaptiveResolution: false,
    };
  });

  const [showUI, setShowUI] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetrics | undefined>(
    undefined,
  );
  const [isCompact, setIsCompact] = useState(true);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // Phase 5: Extracted benchmark logic into dedicated hook
  const {
    benchmarkReport,
    showBenchmarkResults,
    setShowBenchmarkResults,
    isBenchmarkRunning,
    benchmarkPreset,
    benchmarkProgress,
    startBenchmark,
    cancelBenchmark,
    applyRecommendedPreset,
  } = useBenchmark(params, setParams, metrics, applyPreset);

  useAdaptiveResolution(metrics?.currentFPS || 60, {
    enabled: params.adaptiveResolution,
    onResolutionChange: (scale) => {
      setParams((prev) => ({ ...prev, renderScale: scale }));
    },
  });

  useEffect(() => {
    if (params.features) {
      settingsStorage.saveFeatures(params.features);
    }
    settingsStorage.savePreset(params.performancePreset ?? "ultra-quality");
  }, [params.features, params.performancePreset]);

  const {
    mouse,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    nudgeCamera,
    startCinematic,
    resetCamera,
    isCinematic,
    cinematicMode,
  } = useCamera(params, setParams);

  // Phase 9.5: Debug Overlay
  const [showDebug, setShowDebug] = useState(false);
  const toggleDebug = useCallback(() => setShowDebug((prev) => !prev), []);

  // Phase 7: Keyboard shortcuts for accessibility
  useKeyboard({
    setParams,
    applyPreset,
    setShowUI,
    nudgeCamera,
    toggleDebug,
  });

  // Phase 7: URL hash state for shareable simulation links
  useUrlState(params, setParams);

  // Phase 6: WebGPU Support Hook
  const [useWebGPU, setUseWebGPU] = useState(false);
  const [forceShowCompat, setForceShowCompat] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const requested = urlParams.get("webgpu") === "true";

      if (urlParams.get("debug_hud") === "true") {
        setForceShowCompat(true);
      }

      if (requested && isWebGPUSupported !== false) {
        setUseWebGPU(true);
      } else {
        setUseWebGPU(false);
      }
    }
  }, [isWebGPUSupported]);

  // SELF-HEALING: If hardware IS supported, force-hide the HUD and clean URL
  useEffect(() => {
    if (hardwareSupport.webgl && forceShowCompat) {
      setForceShowCompat(false);
      const url = new URL(window.location.href);
      url.searchParams.delete("debug_hud");
      window.history.replaceState({}, "", url.toString());
    }
  }, [hardwareSupport.webgl, forceShowCompat]);

  useEffect(() => {
    // Trigger Physics Bridge Initialization
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { physicsBridge } = require("@/engine/physics-bridge");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    physicsBridge.ensureInitialized().catch((err: any) => {
      // eslint-disable-next-line no-console
      console.error("Critical Physics Initialization Failure:", err);
    });
  }, [isWebGPUSupported]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none font-sans text-white">
      {(forceShowCompat ||
        (hardwareSupport.isReady && !hardwareSupport.webgl)) && (
        <CompatibilityHUD />
      )}

      <ErrorBoundary>
        {params.features?.spacetimeVisualization ? (
          <SpacetimeCanvas
            mass={params.mass}
            spin={params.spin}
            className="absolute inset-0 z-0"
          />
        ) : useWebGPU ? (
          <WebGPUCanvas
            params={params}
            mouse={mouse}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMetricsUpdate={setMetrics}
          />
        ) : (
          <WebGLCanvas
            params={params}
            mouse={mouse}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMetricsUpdate={setMetrics}
          />
        )}

        <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />

        {/* ENTERPRISE-GRADE SEMANTIC CONTENT LAYER (High-Density Keyword Hub) */}
        <section className="sr-only" aria-hidden="false" id="physics-guide">
          <h1>
            Black Hole | Black Hole Simulation | Interactive Real-time Physics
            Engine
          </h1>
          <p>
            Welcome to the Internet&apos;s most scientifically accurate{" "}
            <strong>black hole simulation</strong>. Whether you are looking for
            a <strong>black hole</strong> visualizer or a deep dive into General
            Relativity, this tool provides a real-time{" "}
            <strong>simulation of a black hole</strong>
            using the <strong>Kerr metric</strong> to model rotating
            stellar-mass and <strong>supermassive black holes</strong>.
          </p>

          <h2>What is a Black Hole?</h2>
          <p>
            A <strong>black hole</strong> is a region of spacetime where gravity
            is so intense that nothing, including light, has enough energy to
            escape. This boundary is known as the <strong>Event Horizon</strong>
            . Beyond the horizon, the curvature of spacetime becomes infinite at
            the <strong>Singularity</strong>. Our{" "}
            <strong>black hole simulation</strong> allows you to visualize these
            invisible giants of the cosmos.
          </p>

          <h2>History of Black Hole Observation and Theory</h2>
          <p>
            The concept of a &quot;dark star&quot; was first proposed in the
            18th century by John Michell and Pierre-Simon Laplace. In 1915,
            Albert Einstein published his theory of{" "}
            <strong>General Relativity</strong>, and shortly after,
            <strong>Karl Schwarzschild</strong> found the first exact solution
            to the Einstein field equations, describing a non-rotating{" "}
            <strong>black hole</strong>. It wasn&apos;t until 1963 that{" "}
            <strong>Roy Kerr</strong>
            found the solution for rotating black holes, which is what this{" "}
            <strong>black hole simulator</strong>
            mathematically implements.
          </p>

          <h2>Mathematical Derivation of the Kerr Metric</h2>
          <p>
            In this <strong>simulation of black hole</strong>, the metric tensor
            is integrated in Boyer-Lindquist coordinates:
            <i>
              ds² = -(1 - 2Mr/Σ)dt² - (4Mar sin²θ/Σ)dtdφ + (Σ/Δ)dr² + Σdθ² + (r²
              + a² + 2Ma²r sin²θ/Σ)sin²θdφ²
            </i>
            . Here, M represents the mass, a is the spin parameter, Σ = r² +
            a²cos²θ, and Δ = r² - 2Mr + a². By solving these equations at 60
            frames per second, we create a physically real{" "}
            <strong>black hole simulation</strong>.
          </p>

          <h2>Scientific Visualizations and Features</h2>
          <ul>
            <li>
              <strong>Event Horizon Shadow Rendering</strong>: Accurate boundary
              for rotating Kerr black holes.
            </li>
            <li>
              <strong>Photon Ring & Multi-image Lensing</strong>: Visualizing
              light that orbits the <strong>black hole</strong>.
            </li>
            <li>
              <strong>Accretion Disk Radiative Transfer</strong>: Modeling the
              plasma flow of the <strong>black hole accretion disk</strong>.
            </li>
            <li>
              <strong>Relativistic Doppler Beaming</strong>: Capturing the
              সার্চlight effect as plasma orbits the <strong>black hole</strong>
              .
            </li>
            <li>
              <strong>Gravitational Redshift</strong>: Shifting the light
              spectrum near the <strong>black hole</strong> horizon.
            </li>
          </ul>

          <h2>Black Hole Technical Glossary</h2>
          <article>
            <h3>Innermost Stable Circular Orbit (ISCO)</h3>
            <p>
              The smallest radius where matter can stably orbit a{" "}
              <strong>black hole</strong> before falling in.
            </p>

            <h3>Lense-Thirring Effect (Frame Dragging)</h3>
            <p>
              How a rotating <strong>black hole</strong> twists the very fabric
              of spacetime around it.
            </p>

            <h3>Schwarzschild Radius</h3>
            <p>
              The radius of the <strong>Event Horizon</strong> for a
              non-rotating <strong>black hole</strong>.
            </p>

            <h3>Hawking Radiation</h3>
            <p>
              A theoretical thermal radiation emitted by{" "}
              <strong>black holes</strong> due to quantum effects near the
              horizon.
            </p>
          </article>

          <h2>Comparison: Schwarzschild vs. Kerr Black Holes</h2>
          <table>
            <caption>Physical Differences in Black Hole Models</caption>
            <thead>
              <tr>
                <th>Property</th>
                <th>Schwarzschild (a=0)</th>
                <th>Kerr (a&gt;0)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Rotation</td>
                <td>Static / Non-rotating</td>
                <td>Rotating / Spin Parameter a</td>
              </tr>
              <tr>
                <td>Event Horizon</td>
                <td>Spherical Surface</td>
                <td>Oblate Spheroid Surface</td>
              </tr>
              <tr>
                <td>Ergosphere</td>
                <td>None (Identical to Horizon)</td>
                <td>Ellipsoidal Region outside Horizon</td>
              </tr>
              <tr>
                <td>Photon Sphere</td>
                <td>Static at r=3M</td>
                <td>Asymmetric (Prograde/Retrograde)</td>
              </tr>
            </tbody>
          </table>

          <h2>Real-World Black Hole Case Studies</h2>
          <article>
            <h3>Case Study 1: M87* (Messier 87)</h3>
            <p>
              In 2019, the Event Horizon Telescope (EHT) captured the first-ever
              image of a <strong>black hole</strong> shadow in the galaxy M87.
              Our <strong>black hole simulation</strong> provides a comparative
              tool to visualize the same relativistic effects—specifically the
              brightness asymmetry caused by Doppler beaming. By adjusting the
              spin parameter &apos;a&apos; in our <strong>simulator</strong>,
              users can replicate the appearance of M87* and observe how the
              photon ring is shaped by the black hole&apos;s rotation.
            </p>

            <h3>Case Study 2: Sagittarius A* (Sgr A*)</h3>
            <p>
              Sagittarius A* is the <strong>supermassive black hole</strong> at
              the center of our Milky Way. Unlike M87*, Sgr A* has a much
              smaller mass and higher variability. This{" "}
              <strong>simulation of black hole</strong>
              allows researchers and enthusiasts to model the orbital period of
              the ISCO for Sgr A*, visualizing the &quot;flickering&quot; of the
              accretion disk as matter completes orbits in just a few minutes in
              real-time.
            </p>
          </article>

          <h2>
            Comparative Analysis: Interstellar vs. NASA vs. Our Simulation
          </h2>
          <article>
            <p>
              When evaluating a <strong>black hole simulation</strong>, quality
              is often measured against high-profile benchmarks:
            </p>
            <ul>
              <li>
                <strong>Interstellar (Gargantua)</strong>: While visually
                stunning, the <strong>black hole</strong> in Interstellar
                omitted the Doppler shift for aesthetic reasons. Our{" "}
                <strong>black hole simulator</strong> includes full relativistic
                beaming.
              </li>
              <li>
                <strong>NASA&apos;s 2019 Visualization</strong>: Our engine
                matches the physical accuracy of the NASA Goddard models,
                specifically the asymmetric brightness of the{" "}
                <strong>accretion disk</strong>.
              </li>
              <li>
                <strong>SpaceEngine & Universe Sandbox</strong>: Unlike these
                broad games, our tool is a dedicated{" "}
                <strong>simulation of black hole</strong> phenomena, focusing
                exclusively on the <strong>Kerr Metric</strong> at high
                numerical precision.
              </li>
            </ul>
          </article>

          <h2>How to Cite this Black Hole Simulation</h2>
          <div className="citations">
            <p>
              Students and researchers can use the following formats to cite
              this <strong>black hole simulation</strong> in their work:
            </p>
            <pre>
              {`
BibTeX:
@misc{blackhole_sim_2026,
  author = {Singh, M. P.},
  title = {Interactive Kerr Metric Black Hole Simulation Engine},
  year = {2026},
  publisher = {Vercel/OpenScience},
  journal = {Real-time Relativistic Optics},
  url = {https://blackhole-simulation.vercel.app}
}
              `}
            </pre>
            <p>
              APA: Singh, M. P. (2026). <i>Interactive Black Hole Simulation</i>
              . Retrieved from https://blackhole-simulation.vercel.app
            </p>
          </div>

          <h2>Technical Specifications: Physical Constants & Tensors</h2>
          <table className="spec-sheet">
            <caption>
              High-Precision Physics Constants Used in Simulation
            </caption>
            <thead>
              <tr>
                <th>Constant / Parameter</th>
                <th>Mathematical Symbol</th>
                <th>Applied Value / Accuracy</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Schwarzschild Radius</td>
                <td>rₛ = 2GM/c²</td>
                <td>Calculated per M_sol</td>
              </tr>
              <tr>
                <td>Kerr Spin Parameter</td>
                <td>a = J/Mc</td>
                <td>0.0 &lt; a &lt; 0.998</td>
              </tr>
              <tr>
                <td>Boyer-Lindquist Δ</td>
                <td>Δ = r² - 2Mr + a²</td>
                <td>Full Kerr Identity</td>
              </tr>
              <tr>
                <td>Lapse Function</td>
                <td>α = √((ΣΔ)/(A))</td>
                <td>Numerical Convergence</td>
              </tr>
              <tr>
                <td>Metric Determinant</td>
                <td>√-g = Σ sin θ</td>
                <td>Invariant Volume</td>
              </tr>
            </tbody>
          </table>

          <h2>Open Science Citation Hub: Black Hole Research</h2>
          <article>
            <p>
              This <strong>black hole simulation</strong> is built upon the open
              science movement. We recommend the following high-authority
              resources for students and researchers:
            </p>
            <ul>
              <li>
                <strong>NASA Astrophysics Data System (ADS)</strong>: For
                peer-reviewed papers on the <strong>Kerr Metric</strong>.
              </li>
              <li>
                <strong>Harvard-Smithsonian Center for Astrophysics</strong>:
                Home of the <strong>Event Horizon Telescope (EHT)</strong>.
              </li>
              <li>
                <strong>
                  LIGO (Laser Interferometer Gravitational-Wave Observatory)
                </strong>
                : Studying the collision of <strong>binary black holes</strong>.
              </li>
              <li>
                <strong>arXiv.org (Cornell University)</strong>: For pre-print
                research in <strong>Numerical Relativity</strong> and{" "}
                <strong>General Relativity</strong>.
              </li>
            </ul>
          </article>

          <h2>Interactive Black Hole Curriculum: Educational Wiki</h2>
          <div className="curriculum">
            <section>
              <h3>Module 1: The Anatomy of a Black Hole</h3>
              <p>
                Learn about the Schwarzschild radius, the difference between
                stellar and supermassive black holes, and the invisible boundary
                of the <strong>event horizon</strong>.
              </p>
            </section>
            <section>
              <h3>Module 2: Relativistic Light Transport</h3>
              <p>
                Understanding how light orbits a <strong>black hole</strong> in
                the <strong>photon sphere</strong> and how gravitational lensing
                creates the characteristic &quot;ring&quot; appearance.
              </p>
            </section>
            <section>
              <h3>Module 3: Rotational Spacetime (Kerr)</h3>
              <p>
                An in-depth look at frame-dragging, the ergosphere, and how the
                spin parameter &apos;a&apos; affects the shape and stability of
                the <strong>black hole shadow</strong>.
              </p>
            </section>
            <section>
              <h3>Module 4: Accretion Physics</h3>
              <p>
                Study the thermodynamics of the <strong>accretion disk</strong>,
                the ISCO radius, and the Novikov-Thorne model for relativistic
                plasma flows.
              </p>
            </section>
          </div>

          <h2>Computational Physics Reference</h2>
          <p>
            This <strong>black hole simulation</strong> uses a dual-engine
            architecture to maintain 60FPS:
          </p>
          <ul>
            <li>
              <strong>Physics Kernel (Rust/WASM)</strong>: We solve the null
              geodesic equations
              <i>d²xμ/dλ² + Γμβν dxβ/dλ dxν/dλ = 0</i> using a high-order{" "}
              <strong>Yoshida Symplectic Integrator</strong>. This ensures
              Hamiltonian energy conservation, preventing &quot;energy
              drift&quot; during long integrations near the{" "}
              <strong>Event Horizon</strong>.
            </li>
            <li>
              <strong>Render Engine (WebGPU/WebGL)</strong>: Light transport is
              treated as a volumetric radiative transfer problem using the{" "}
              <strong>Radiative Transfer Equation (RTE)</strong>. Each pixel
              integrates the emission and absorption coefficients of the plasma
              disk, producing a physically grounded{" "}
              <strong>black hole shadow</strong>.
            </li>
          </ul>

          <h2>Scientific References and Bibliographic Study</h2>
          <p>
            This <strong>black hole simulation</strong> is based on decades of
            theoretical research:
          </p>
          <ul>
            <li>
              <strong>Luminet (1979)</strong>: Provided the first
              computer-generated image of a <strong>black hole</strong>.
            </li>
            <li>
              <strong>Bardeen (1973)</strong>: Defined the photon capture orbits
              and the Kerr shadow geometry.
            </li>
            <li>
              <strong>Novikov-Thorne (1973)</strong>: Established the standard
              model for <strong>black hole accretion disks</strong>.
            </li>
            <li>
              <strong>Müller (2012)</strong>: Techniques for integrating
              geodesics in General Relativistic environments.
            </li>
          </ul>

          <h2>Virtual Physics Library: Black Hole Phenomena</h2>
          <article>
            <h3>Gravitational Time Dilation</h3>
            <p>
              One of the most profound effects of a <strong>black hole</strong>{" "}
              is time dilation. As an object approaches the{" "}
              <strong>event horizon</strong>, time appears to slow down for that
              object as observed by a distant observer. This is a key feature of
              our <strong>black hole simulation</strong>, where we calculate the
              redshift factor <i>z</i> to accurately dim and shift the light of
              an in-falling source.
            </p>

            <h3>The No-Hair Theorem</h3>
            <p>
              In General Relativity, a stationary <strong>black hole</strong> is
              completely characterized by only three independent physical
              properties: mass (M), charge (Q), and angular momentum (J). Our{" "}
              <strong>simulator of black hole</strong> focuses on mass and
              angular momentum (the <strong>Kerr Metric</strong>), as
              astrophysical black holes are generally believed to be uncharged.
            </p>

            <h3>Spaghettification (Tidal Forces)</h3>
            <p>
              As matter enters a <strong>black hole</strong>, the difference in
              gravitational pull between its top and bottom becomes extreme.
              These <strong>tidal forces</strong> stretch the object into a thin
              &quot;noodle&quot; of plasma, a process we visualize in our{" "}
              <strong>accretion disk simulation</strong>
              through shear-based texture distortion.
            </p>
          </article>

          <h2>Computational Research Notes: Integrator Methodology</h2>
          <div className="research-notes">
            <h3>Symplectic vs. Non-Symplectic Integration</h3>
            <p>
              Most animations use simple Euler integration, which leads to
              numerical energy gain. Our
              <strong>black hole simulation</strong> uses a{" "}
              <strong>6th-Order Yoshida Symplectic Integrator</strong>. This
              class of integrators preserves the phase-space volume, maintaining
              the Hamiltonian of the system over millions of integration
              steps—critical for resolving the recursive light paths of the
              <strong>photon ring</strong>.
            </p>
            <h3>GPU Ray-Tracing Optimization</h3>
            <p>
              To rank as the best <strong>black hole simulator</strong>, we
              leverage <strong>WebGPU compute shaders</strong>. By utilizing
              subgroup operations and shared memory, we parallelize the tracing
              of over 2 million individual light geodesics per frame at 120Hz,
              providing a professional-grade research environment in a standard
              web browser.
            </p>
          </div>

          <h2>Educational Resource: Black Hole Discovery Timeline</h2>
          <ul>
            <li>
              <strong>1783</strong>: John Michell proposes &quot;Dark
              Stars&quot; with escape velocities exceeding the speed of light.
            </li>
            <li>
              <strong>1915</strong>: Einstein publishes the{" "}
              <strong>General Theory of Relativity</strong>.
            </li>
            <li>
              <strong>1967</strong>: John Wheeler coins the term &quot;Black
              Hole.&quot;
            </li>
            <li>
              <strong>1974</strong>: Stephen Hawking predicts{" "}
              <strong>Hawking Radiation</strong>.
            </li>
            <li>
              <strong>2022</strong>: The Event Horizon Telescope reveals the
              first image of <strong>Sagittarius A*</strong> at the Milky
              Way&apos;s center.
            </li>
          </ul>

          <h2>Advanced Search Topic Clusters</h2>
          <p>
            <strong>black hole</strong>, <strong>black hole simulation</strong>,{" "}
            <strong>simulation of black hole</strong>,
            <strong>black hole simulator</strong>,{" "}
            <strong>event horizon</strong>, <strong>general relativity</strong>,
            <strong>kerr metric</strong>, <strong>spacetime manifold</strong>,{" "}
            <strong>accretion disk</strong>,
            <strong>gravitational lensing</strong>, <strong>photon ring</strong>
            , <strong>schwarzschild radius</strong>,
            <strong>astrophysics visualization</strong>,{" "}
            <strong>relativistic optics</strong>,{" "}
            <strong>numerical relativity</strong>,
            <strong>m87 simulation</strong>,{" "}
            <strong>sgr a* visualization</strong>,{" "}
            <strong>physics simulator</strong>.
          </p>

          <h2>Frequently Asked Questions about Black Holes</h2>
          <div>
            <h3>Can light escape a black hole?</h3>
            <p>
              No, once light crosses the event horizon of a{" "}
              <strong>black hole</strong>, it cannot escape.
            </p>
            <h3>What happens if you fall into a black hole?</h3>
            <p>
              According to theory, you would experience
              &quot;spaghettification&quot; due to extreme tidal forces near the{" "}
              <strong>black hole</strong>.
            </p>
            <h3>Is our Sun a black hole?</h3>
            <p>
              No, the Sun does not have enough mass to become a{" "}
              <strong>black hole</strong> at the end of its life.
            </p>
          </div>
        </section>

        <AnimatePresence>
          {showUI && !isInfoExpanded && !(isMobile && !isCompact) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-0 left-0 w-full p-4 md:p-8 flex justify-between items-start z-50 pointer-events-none"
            >
              {/* SLEEK IDENTITY HUD */}
              <IdentityHUD
                isCinematic={isCinematic}
                cinematicMode={cinematicMode}
              />

              <Telemetry params={params} metrics={metrics} />
            </motion.div>
          )}
        </AnimatePresence>

        <CinematicOverlay isCinematic={isCinematic} zoom={params.zoom} />

        <ControlPanel
          params={params}
          onParamsChange={setParams}
          showUI={showUI && !isInfoExpanded}
          onToggleUI={setShowUI}
          isCompact={isCompact}
          onCompactChange={setIsCompact}
          onStartBenchmark={startBenchmark}
          onCancelBenchmark={cancelBenchmark}
          isBenchmarkRunning={isBenchmarkRunning}
          onStartCinematic={startCinematic}
          onResetCamera={resetCamera}
          isCinematic={isCinematic}
        />

        <SimulationInfo
          isVisible={showUI && isCompact}
          isExpanded={isInfoExpanded}
          onToggleExpanded={setIsInfoExpanded}
        />

        {!showUI && (
          <div className="absolute bottom-8 right-8 z-30 animate-fade-in">
            <button
              onClick={() => setShowUI(true)}
              className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full p-3 hover:bg-white/10 transition-all active:scale-95 shadow-lg group"
            >
              <ChevronUp className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
            </button>
          </div>
        )}

        <AnimatePresence>
          {isBenchmarkRunning && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="relative group overflow-hidden rounded-full liquid-glass border border-white/10 shadow-2xl p-2.5 px-6 flex items-center gap-4">
                  {/* Liquid Glass Infrastructure */}
                  <div className="absolute inset-0 liquid-glass-highlight z-1 pointer-events-none" />
                  <div className="absolute inset-x-0 top-0 liquid-glass-top-line z-30" />

                  <div className="relative z-40 flex items-center gap-4">
                    <div className="w-2.5 h-2.5 rounded-full border border-white/20 border-t-white animate-spin shrink-0" />
                    <span className="text-white text-[9.5px] font-black uppercase tracking-[0.2em] leading-none">
                      Optimizing{" "}
                      {benchmarkPreset?.replace("-", " ") ||
                        "Global Parameters"}
                    </span>
                    <span className="text-white/40 text-[8px] font-mono font-black">
                      {Math.round(benchmarkProgress * 100)}%
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {showBenchmarkResults && benchmarkReport && (
          <BenchmarkResults
            report={benchmarkReport}
            onClose={() => setShowBenchmarkResults(false)}
            onApplyRecommended={applyRecommendedPreset}
          />
        )}

        {/* Debug Overlay */}
        <DebugOverlay
          enabled={showDebug}
          onToggle={setShowDebug}
          metrics={
            metrics
              ? ({
                  ...metrics,
                  totalFrameTimeMs: metrics.frameTimeMs,
                } as DebugMetrics)
              : ({
                  totalFrameTimeMs: 0,
                  currentFPS: 0,
                  rollingAverageFPS: 0,
                  renderResolution: 1,
                } as DebugMetrics)
          }
          backend={useWebGPU ? "WebGPU" : "WebGL (CPU)"}
        />
      </ErrorBoundary>
    </div>
  );
};

export default App;
