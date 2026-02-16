import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Radio } from "lucide-react";

interface CinematicOverlayProps {
  isCinematic: boolean;
  zoom: number;
}

// Schwarzschild Radius (Rs) is effectively 2.0 in the simulation's visual units for the "Danger Zone"
// The event horizon is at r=1.0 * Mass, typically. But visually we often scale things.
// Based on useCamera, 2.0 seems to be the critical limit.
const HORIZON_LIMIT = 2.0;
const WARNING_LIMIT = 4.0;
const CRITICAL_LIMIT = 2.5;

export const CinematicOverlay = ({
  isCinematic,
  zoom,
}: CinematicOverlayProps) => {
  // Calculate proximity factor (0 to 1) where 1 is touching the horizon
  const proximity = useMemo(() => {
    if (zoom > WARNING_LIMIT) return 0;
    return Math.max(
      0,
      Math.min(1, (WARNING_LIMIT - zoom) / (WARNING_LIMIT - HORIZON_LIMIT)),
    );
  }, [zoom]);

  const isCritical = zoom < CRITICAL_LIMIT;

  return (
    <AnimatePresence>
      {isCinematic && (
        <div className="fixed inset-0 pointer-events-none z-40 flex flex-col justify-between">
          {/* Center Content / Effects Layer */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Visual Noise / Signal Degradation based on Proximity */}

            {/* Redout / Blackout Gradient near Horizon */}

            {/* Critical Warning HUD */}
            {isCritical && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-mono text-red-500 tracking-[0.3em] uppercase opacity-80 mb-1">
                      EVENT HORIZON PROXIMITY
                    </span>
                    <span className="text-3xl font-thin tracking-[0.2em] uppercase text-white drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">
                      CRITICAL
                    </span>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                </div>

                <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-red-500/50 to-transparent mt-2" />

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[8px] font-mono text-red-400/60 tracking-widest uppercase">
                    SINGULARITY APPROACH VECTOR LOCKED
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Status Indicators (Corner) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute top-[12vh] right-8 flex flex-col items-end gap-2"
          >
            {proximity > 0 && (
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono text-accent-cyan/60 tracking-[0.2em] uppercase">
                    TELEMETRY LINK
                  </span>
                  <div className="h-[1px] w-8 bg-accent-cyan/20" />
                </div>
                <div className="flex items-center gap-2 px-2 py-1 bg-black/20 border border-white/5 rounded-sm backdrop-blur-sm">
                  <Radio
                    className={`w-3 h-3 ${isCritical ? "text-red-500" : "text-accent-cyan"} animate-pulse`}
                  />
                  <span
                    className={`text-[9px] font-mono tracking-[0.15em] uppercase tabular-nums ${isCritical ? "text-red-400" : "text-accent-cyan/90"}`}
                  >
                    SIGNAL: {((1 - proximity) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
