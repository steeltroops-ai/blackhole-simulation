/**
 * Telemetry Component
 * Top-right telemetry display showing real-time physics calculations and performance metrics
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 12.4, 12.5
 */

import { useState } from "react";
import type { SimulationParams } from "@/types/simulation";
import type { PerformanceMetrics } from "@/performance/monitor";
import {
  calculateEventHorizon,
  calculateTimeDilation,
} from "@/physics/kerr-metric";

interface TelemetryProps {
  params: SimulationParams;
  metrics?: PerformanceMetrics;
  budgetUsage?: number;
}

export const Telemetry = ({
  params,
  metrics,
  budgetUsage = 0,
}: TelemetryProps) => {
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);

  // Calculate accurate physics values
  const normalizedSpin = Math.max(-1, Math.min(1, params.spin / 5.0));
  const eventHorizonRadius = calculateEventHorizon(params.mass, normalizedSpin);

  // Observer-Dynamic: Calculate metrics at the ACTUAL camera distance (Zoom)
  // This makes the HUD react as the user moves throughout the manifold.
  const timeDilation = calculateTimeDilation(params.zoom, params.mass);
  const redshift = 1 / Math.max(0.001, timeDilation) - 1;

  // Determine FPS color based on thresholds (Requirements 10.4, 10.5)
  const getFPSColor = (fps: number): string => {
    if (fps >= 60) return "text-green-400";
    if (fps >= 30) return "text-yellow-400";
    return "text-red-400";
  };

  // Determine budget bar color
  const getBudgetColor = (usage: number): string => {
    if (usage < 80) return "bg-green-500";
    if (usage < 100) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="flex flex-col items-end gap-1 px-2 sm:px-0">
      <div className="flex flex-wrap md:flex-nowrap justify-end gap-5 md:gap-10 text-right">
        {[
          {
            label: "FPS",
            value: metrics?.currentFPS,
            unit: "hz",
            color: getFPSColor(metrics?.currentFPS || 0),
          },
          {
            label: "Quality",
            value: metrics?.quality,
            unit: "lvl",
          },
          {
            label: "Horizon",
            value: eventHorizonRadius.toFixed(2),
            unit: "Rs",
          },
          {
            label: "Redshift",
            value: `z=${redshift.toFixed(2)}`,
          },
          { label: "Dilation", value: timeDilation.toFixed(3), unit: "x" },
        ].map((item, idx) => (
          <div key={idx} className="flex flex-col items-end">
            <span className="text-[7px] md:text-[8px] text-white/60 font-mono font-bold uppercase tracking-[0.2em] mb-0.5">
              {item.label}
            </span>
            <div className="flex items-baseline gap-0.5">
              <span
                className={`font-mono text-[11px] md:text-base font-black tabular-nums transition-colors duration-500 ${item.color || "text-white/95"}`}
              >
                {item.value || "---"}
              </span>
              {item.unit && (
                <span className="text-[8px] md:text-[9px] text-white/50 font-mono uppercase">
                  {item.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {metrics && budgetUsage > 0 && (
        <div className="w-48 mt-1">
          <div className="flex justify-between items-center mb-1">
            <p className="text-[8px] text-gray-500 uppercase tracking-widest">
              Frame Budget
            </p>
            <p className="text-[8px] font-mono text-gray-400">
              {Math.round(budgetUsage)}%
            </p>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getBudgetColor(budgetUsage)}`}
              style={{ width: `${Math.min(100, budgetUsage)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
