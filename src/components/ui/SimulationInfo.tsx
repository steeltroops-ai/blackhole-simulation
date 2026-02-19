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
                        uncharged mass using{" "}
                        <strong className="text-white">
                          Boyer-Lindquist coordinates
                        </strong>
                        . Spacetime curvature is defined by the metric tensor{" "}
                        <i>
                          g<sub>μν</sub>
                        </i>
                        , where the rotation of the singularity induces the{" "}
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
                        the Radiative Transfer Equation, accounting for optical
                        depth and self-absorption.
                      </p>
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
                        { l: "Integrator", v: "Yoshida 6th-Order Symplectic" },
                        { l: "Tone Mapping", v: "ACES Filmic (Narkowicz)" },
                        { l: "Redshift", v: "Gravitational + Doppler Shift" },
                        { l: "Optimization", v: "Octree Bounding Geodesics" },
                        { l: "Spectral", v: "Gaussian Basis SPD Transport" },
                        {
                          l: "Numerical",
                          v: "Hamiltonian Energy Conservation",
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

                  {/* 5. Relativistic Polarimetry */}
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

                  {/* 6. Orbital Constants */}
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

                  {/* 7. Research References */}
                  <section>
                    <h3 className="text-[10px] font-extralight text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                      Verification Sources
                    </h3>
                    <div className="space-y-2 px-4 opacity-70">
                      <p className="text-[9px] font-mono leading-tight">
                        [1] Shakura & Sunyaev (1973): Standard Disk Model
                      </p>
                      <p className="text-[9px] font-mono leading-tight">
                        [2] Boyer & Lindquist (1967): Maximal Analytic Extension
                      </p>
                      <p className="text-[9px] font-mono leading-tight">
                        [3] Yoshida (1990): Symplectic Integration Hierarchy
                      </p>
                      <p className="text-[9px] font-mono leading-tight">
                        [4] Novikov & Thorne (1973): Relativistic Accretion
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
