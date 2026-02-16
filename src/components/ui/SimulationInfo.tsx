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
              width: isExpanded ? "min(576px, calc(100vw - 3rem))" : "280px",
              borderRadius: isExpanded ? "1.5rem" : "1.25rem"
            }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed md:absolute bottom-6 left-6 z-50 pointer-events-auto overflow-hidden shadow-2xl liquid-glass border border-white/10"
          >
            <div
              className={`relative overflow-hidden group`}
            >
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
                  <span className="text-[7px] font-mono font-black text-white/30 uppercase tracking-[0.15em] bg-white/5 px-2.5 py-1 rounded-full border border-white/5 group-hover:text-white/60 transition-colors whitespace-nowrap">
                    {isExpanded ? "Close" : "Open"}
                  </span>
                </div>
              </button>

              {/* Expandable Content */}
              <motion.div
                initial={false}
                animate={{ 
                  height: isExpanded ? "auto" : 0,
                  opacity: isExpanded ? 1 : 0
                }}
                transition={{ 
                  height: { type: "spring", stiffness: 200, damping: 25 },
                  opacity: { duration: 0.2 }
                }}
                className="overflow-hidden relative z-10"
              >
                <div className="px-6 pb-8 pt-2 space-y-6 h-auto max-h-[65vh] sm:max-h-[80vh] overflow-y-auto custom-scrollbar">
                  {/* 1. Spacetime Geometry */}
                  <section>
                    <h3 className="text-[10px] font-extralight text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                      Spacetime Geometry
                    </h3>
                    <div className="space-y-3 px-4">
                      <p className="text-[12px] leading-relaxed text-white/90 font-light">
                        The engine solves for the geometry of a rotating uncharged
                        mass using Boyer-Lindquist coordinates. Spacetime
                        curvature is defined by the metric tensor <i>ds</i>², where
                        the rotation of the singularity induces a{" "}
                        <strong className="text-white">Frame-Dragging</strong> effect (Lense-Thirring
                        Precession).
                      </p>
                      <div className="p-3 bg-white/[0.05] rounded-lg border border-white/10 font-mono text-[9px] text-white/90 text-center">
                        r₊ = M + √(M² - a²) (Event Horizon Boundary)
                      </div>
                    </div>
                  </section>

                  {/* 2. Optical Phenomena */}
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
                          Intense light distortion creates a secondary,
                          mirror-image of the background starfield.
                        </p>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-[9px] font-extralight text-white uppercase tracking-widest border-b border-white/10 pb-1 inline-block">
                          Photon Sphere
                        </h4>
                        <p className="text-[11px] leading-relaxed text-white/90 font-light">
                          At r = 3M, gravity is strong enough to force photons
                          into circular orbits, creating a luminous boundary.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* 3. Accretion Dynamics */}
                  <section>
                    <h3 className="text-[10px] font-extralight text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                      Accretion Dynamics
                    </h3>
                    <div className="space-y-3 px-4">
                      <p className="text-[12px] leading-relaxed text-white/90 font-light">
                        The plasma disk follows the{" "}
                        <strong className="text-white">Shakura-Sunyaev</strong> power law. Spectral
                        intensity is governed by the Doppler factor, which
                        blue-shifts prograde matter and red-shifts retrograde
                        matter.
                      </p>
                      <div className="p-4 bg-white/[0.05] rounded-2xl border border-white/10 font-mono text-[10px] text-white/90 text-center">
                        I<sub>obs</sub> = I<sub>emit</sub> · δ⁴ (Relativistic Beaming)
                      </div>
                    </div>
                  </section>

                  {/* 4. GPU Integration */}
                  <section>
                    <h3 className="text-[10px] font-extralight text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                      Rendering Core
                    </h3>
                    <div className="grid grid-cols-2 gap-6 mt-4 px-4">
                      {[
                        { l: "Anti-Aliasing", v: "Temporal Reprojection" },
                        { l: "Tone Mapping", v: "ACES Filmic (Narkowicz)" },
                        { l: "Integration", v: "Velocity Verlet (Symplectic)" },
                        { l: "Optimization", v: "Adaptive Step Scaling" },
                      ].map((i, k) => (
                        <div key={k} className="space-y-1">
                          <span className="block text-[8px] text-white/50 uppercase font-black tracking-widest">
                            {i.l}
                          </span>
                          <span className="block text-[11px] text-white font-light">
                            {i.v}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 5. Constants */}
                  <section>
                    <h3 className="text-[10px] font-extralight text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                      Physics Constants
                    </h3>
                    <ul className="space-y-4 px-4">
                      <li className="flex justify-between items-center text-[10px] font-mono border-b border-white/[0.1] pb-1">
                        <span className="text-white/60">Ergosphere Max</span>
                        <span className="text-white font-bold">2M</span>
                      </li>
                      <li className="flex justify-between items-center text-[10px] font-mono border-b border-white/[0.1] pb-1">
                        <span className="text-white/60">ISCO Radius (a=0)</span>
                        <span className="text-[10px] text-white font-bold">6M</span>
                      </li>
                      <li className="flex justify-between items-center text-[10px] font-mono border-b border-white/[0.1] pb-1">
                        <span className="text-white/60">Photon Inner Limit</span>
                        <span className="text-white font-bold">1.5M (a=1)</span>
                      </li>
                    </ul>
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
