import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SimulationInfoProps {
  isVisible: boolean;
  isExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
}

export const SimulationInfo = ({
  isVisible,
  isExpanded,
  onToggleExpanded,
}: SimulationInfoProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {isExpanded && (
            <div
              className="fixed inset-0 z-40 isolate"
              onClick={() => onToggleExpanded(false)}
            />
          )}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{
              opacity: 1,
              x: 0,
              width: isExpanded
                ? "min(576px, calc(100vw - 2rem))"
                : "min(280px, calc(100vw - 2rem))", // 280px default, constrained on mobile
            }}
            exit={{ opacity: 0, x: -20 }}
            transition={{
              type: "spring",
              stiffness: 250,
              damping: 30,
            }}
            className={`fixed bottom-6 left-4 z-50 pointer-events-auto overflow-hidden shadow-2xl border border-white/10 ${
              isExpanded
                ? "frosted-glass-apple rounded-[1.5rem]"
                : "liquid-glass rounded-[1.25rem]"
            }`}
          >
            <div className={`relative overflow-hidden group`}>
              {/* Glossy Overlay Highlight */}
              <div className="absolute inset-0 liquid-glass-highlight pointer-events-none" />

              {/* Header / Summary Toggle */}
              <button
                onClick={() => onToggleExpanded(!isExpanded)}
                className="w-full px-6 py-2 flex items-center justify-between transition-colors outline-none h-10 group relative z-10"
              >
                <div className="flex items-center min-w-0">
                  <h2 className="text-[10px] sm:text-[11px] font-extralight uppercase tracking-[0.2em] text-white leading-none text-glow truncate">
                    Scientific Specifications
                  </h2>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[7px] font-mono font-black text-white/70 uppercase tracking-[0.15em] bg-white/10 px-2.5 py-1 rounded-full border border-white/20 group-hover:text-white transition-colors whitespace-nowrap">
                    {isExpanded ? "Close" : "Open"}
                  </span>
                </div>
              </button>

              {/* Expandable Content */}
              <motion.div
                initial={false}
                animate={{
                  height: isExpanded ? "auto" : 0,
                  opacity: isExpanded ? 1 : 0,
                }}
                transition={{
                  height: { type: "spring", stiffness: 200, damping: 25 },
                  opacity: { duration: 0.2 },
                }}
                className="overflow-hidden relative z-10"
              >
                <div className="px-6 pb-8 pt-2 space-y-6 h-auto max-h-[65vh] sm:max-h-[80vh] overflow-y-auto custom-scrollbar">
                  {/* 1. Spacetime Topology */}
                  <section>
                    <h3 className="text-[10px] font-extralight text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                      Kerr Spacetime Manifold
                    </h3>
                    <div className="space-y-3 px-4">
                      <p className="text-[12px] leading-relaxed text-white/90 font-light">
                        The engine solves for the geometry of a rotating
                        uncharged mass using both{" "}
                        <strong className="text-white">Boyer-Lindquist</strong>{" "}
                        and <strong className="text-white">Kerr-Schild</strong>{" "}
                        coordinates (ensuring horizon regularity). Spacetime
                        curvature is defined by the exact metric tensor{" "}
                        <i>
                          g<sub>μν</sub>
                        </i>
                        , where the singularity&apos;s rotation induces the{" "}
                        <strong className="text-white">Lense-Thirring</strong>{" "}
                        effect (Frame-Dragging).
                      </p>
                      <div className="p-3 bg-white/[0.05] rounded-lg border border-white/10 font-mono text-[9px] text-white/90 text-center">
                        Δ = r² - 2Mr + a² | Σ = r² + a²cos²θ
                      </div>
                      <div className="p-3 bg-white/[0.05] rounded-lg border border-white/10 font-mono text-[9px] text-white/90 text-center">
                        r₊ = M + √(M² - a²) (Event Horizon Boundary)
                      </div>
                    </div>
                  </section>

                  {/* 2. Relativistic Optics */}
                  <section>
                    <h3 className="text-[10px] font-extralight text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                      Optical Phenomena
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 px-4">
                      <div className="space-y-3">
                        <h4 className="text-[9px] font-extralight text-white uppercase tracking-widest border-b border-white/10 pb-1 inline-block">
                          Gravitational Lensing
                        </h4>
                        <p className="text-[11px] leading-relaxed text-white/90 font-light">
                          Light geodesics are deflected by the potential well,
                          creating
                          <strong className="text-white">
                            {" "}
                            Einstein Rings
                          </strong>{" "}
                          and multiple-image copies of the background starfield.
                        </p>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-[9px] font-extralight text-white uppercase tracking-widest border-b border-white/10 pb-1 inline-block">
                          Photon Sphere
                        </h4>
                        <p className="text-[11px] leading-relaxed text-white/90 font-light">
                          Critical orbits at 1.5M to 3M. Prograde photons can
                          orbit closer to the horizon than retrograde ones due
                          to rotational dragging.
                        </p>
                      </div>
                      <div className="space-y-3 sm:col-span-2">
                        <h4 className="text-[9px] font-extralight text-white uppercase tracking-widest border-b border-white/10 pb-1 inline-block">
                          Bardeen Critical Curve
                        </h4>
                        <p className="text-[11px] leading-relaxed text-white/90 font-light">
                          The exact boundary of the black hole shadow (the
                          &quot;D-shape&quot; anomaly) is computed using the
                          parametric critical impact parameters (<i>ξ</i>,{" "}
                          <i>η</i>) for a rotating black hole, establishing the
                          precise horizon silhouette against the accretion flow.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* 3. Accretion & Radiative Transfer */}
                  <section>
                    <h3 className="text-[10px] font-extralight text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                      Accretion Dynamics
                    </h3>
                    <div className="space-y-3 px-4">
                      <p className="text-[12px] leading-relaxed text-white/90 font-light">
                        The plasma disk follows the{" "}
                        <strong className="text-white">Novikov-Thorne</strong>{" "}
                        model. Spectral radiance is governed by the Redshift
                        Factor <i>g</i>, which blue-shifts prograde matter and
                        red-shifts retrograde matter.
                      </p>
                      <div className="p-4 bg-white/[0.05] rounded-2xl border border-white/10 font-mono text-[10px] text-white/90 text-center">
                        I<sub>obs</sub> = I<sub>emit</sub> · g⁴ (Relativistic
                        Beaming)
                      </div>
                      <p className="text-[11px] leading-relaxed text-white/70 font-light italic">
                        Thermal emission is integrated through the volume using
                        the Radiative Transfer Equation (RTE), accounting for
                        optical depth, limb darkening, and self-absorption.
                      </p>
                    </div>
                  </section>

                  {/* 4. Advanced Ray-Marching Architecture */}
                  <section>
                    <h3 className="text-[10px] font-extralight text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                      GPU Ray-Marching Architecture
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 px-4">
                      <div className="space-y-3">
                        <h4 className="text-[9px] font-extralight text-white uppercase tracking-widest border-b border-white/10 pb-1 inline-block">
                          Curvature-Adaptive Stepping
                        </h4>
                        <p className="text-[11px] leading-relaxed text-white/90 font-light">
                          Integration step size <i>dt</i> scales dynamically
                          with local spacetime curvature (<i>M / r³</i>). Rays
                          take massive steps in flat space and micro-steps at
                          the horizon, preventing warp divergence.
                        </p>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-[9px] font-extralight text-white uppercase tracking-widest border-b border-white/10 pb-1 inline-block">
                          Blue Noise Dithering
                        </h4>
                        <p className="text-[11px] leading-relaxed text-white/90 font-light">
                          Low-discrepancy blue noise is applied to the camera
                          projection matrix. When accumulated over time via TAA,
                          it converts sharp ray-marching banding artifacts into
                          imperceptible high-frequency film grain.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* 4. Computational Physics */}
                  <section>
                    <h3 className="text-[10px] font-extralight text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                      Computation & Integration
                    </h3>
                    <div className="grid grid-cols-2 gap-6 mt-4 px-4">
                      {[
                        {
                          l: "Rust Kernel (CPU)",
                          v: "Adaptive RKF45 (Cash-Karp)",
                        },
                        {
                          l: "GPU Shader",
                          v: "Velocity-Verlet (Symplectic 2nd-Order)",
                        },
                        {
                          l: "Memory Model",
                          v: "Zero-Copy SharedArrayBuffer v2",
                        },
                        {
                          l: "Anti-Aliasing",
                          v: "Temporal Reprojection (Variance Clipping)",
                        },
                        { l: "Tone Mapping", v: "ACES Filmic (Narkowicz)" },
                        { l: "Redshift", v: "Gravitational + Doppler Shift" },
                        {
                          l: "Spectral Output",
                          v: "1D LUT Thermal Basis Interpolation",
                        },
                        {
                          l: "Numerical Stability",
                          v: "Periodic Hamiltonian Renormalization",
                        },
                      ].map((i, k) => (
                        <div key={k} className="space-y-1">
                          <span className="block text-[8px] text-white/70 uppercase font-black tracking-widest">
                            {i.l}
                          </span>
                          <span className="block text-[11px] text-white font-light">
                            {i.v}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 6. Adaptive Hardware Scaling */}
                  <section>
                    <h3 className="text-[10px] font-extralight text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                      Adaptive Hardware Scaling
                    </h3>
                    <div className="space-y-4 px-4">
                      <div className="p-3 bg-white/[0.05] rounded-lg border border-white/10">
                        <p className="text-[11px] leading-relaxed text-white/90 font-light">
                          <strong className="text-white block mb-1">
                            Extended Kalman Filter (EKF)
                          </strong>
                          The Rust kernel predicts camera trajectory fractions
                          of a millisecond into the future to eliminate
                          perceived input latency before offloading arrays.
                        </p>
                      </div>
                      <div className="p-3 bg-white/[0.05] rounded-lg border border-white/10">
                        <p className="text-[11px] leading-relaxed text-white/90 font-light">
                          <strong className="text-white block mb-1">
                            Dynamic Resolution Controller
                          </strong>
                          Uses `EXT_disjoint_timer_query_webgl2` to monitor GPU
                          pipeline latency frame-by-frame, downscaling
                          resolution dynamically on hardware profiles like the
                          Intel Iris Xe to guarantee 60+ FPS without logic
                          truncation.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* 7. Relativistic Polarimetry */}
                  <section>
                    <h3 className="text-[10px] font-extralight text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                      Vector Wave Transport
                    </h3>
                    <div className="space-y-3 px-4">
                      <p className="text-[12px] leading-relaxed text-white/90 font-light">
                        Light acts as a vector wave. We solve the transport of
                        the
                        <strong className="text-white">
                          {" "}
                          Stokes Parameters
                        </strong>{" "}
                        (I, Q, U, V) to visualize the polarization vector
                        rotation within the twisted spacetime.
                      </p>
                      <div className="p-3 bg-white/[0.05] rounded-lg border border-white/10 font-mono text-[9px] text-white/90 text-center">
                        χ&apos; = χ + Δφ<sub>Faraday</sub> (Gravitational
                        Rotation)
                      </div>
                    </div>
                  </section>

                  {/* 8. Orbital Constants */}
                  <section>
                    <h3 className="text-[10px] font-extralight text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                      Critical Limits
                    </h3>
                    <ul className="space-y-4 px-4">
                      <li className="flex justify-between items-center text-[10px] font-mono border-b border-white/[0.1] pb-1">
                        <span className="text-white/80">Ergosphere Max</span>
                        <span className="text-white font-bold">r = 2M</span>
                      </li>
                      <li className="flex justify-between items-center text-[10px] font-mono border-b border-white/[0.1] pb-1">
                        <span className="text-white/80">ISCO Radius (a=0)</span>
                        <span className="text-[10px] text-white font-bold">
                          r = 6M
                        </span>
                      </li>
                      <li className="flex justify-between items-center text-[10px] font-mono border-b border-white/[0.1] pb-1">
                        <span className="text-white/80">ISCO Radius (a=1)</span>
                        <span className="text-white font-bold">r = 1M</span>
                      </li>
                      <li className="flex justify-between items-center text-[10px] font-mono border-b border-white/[0.1] pb-1">
                        <span className="text-white/80">
                          Keplerian Ω<sub>K</sub>
                        </span>
                        <span className="text-white font-bold">
                          √M / (r<sup>3/2</sup> + a√M)
                        </span>
                      </li>
                    </ul>
                  </section>

                  {/* 9. Research References */}
                  <section>
                    <h3 className="text-[10px] font-extralight text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                      Verification Sources
                    </h3>
                    <div className="space-y-2 px-4 opacity-70">
                      <p className="text-[9px] font-mono leading-tight">
                        [1] Kerr, R. P. (1963): Gravitational Field of a
                        Spinning Mass
                      </p>
                      <p className="text-[9px] font-mono leading-tight">
                        [2] Bardeen, J. M. (1973): Timelike and Null Geodesics
                        in Kerr Metric
                      </p>
                      <p className="text-[9px] font-mono leading-tight">
                        [3] Novikov, I. & Thorne, K. S. (1973): Relativistic
                        Accretion Disks
                      </p>
                      <p className="text-[9px] font-mono leading-tight">
                        [4] Cash, J. R. & Karp, A. H. (1990): Adaptive
                        Runge-Kutta Methods
                      </p>
                      <p className="text-[9px] font-mono leading-tight">
                        [5] Gralla, Lupsasca & Marolf (2020): Observational
                        Appearance of Black Holes
                      </p>
                    </div>
                  </section>

                  <div className="pt-4 opacity-10 text-center">
                    <div className="w-0.5 h-0.5 rounded-full bg-white mx-auto shadow-[0_0_5px_white]" />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
