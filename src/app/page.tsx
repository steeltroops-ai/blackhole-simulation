"use client";

import { useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { WebGLCanvas } from '@/components/canvas/WebGLCanvas';
import { ControlPanel } from '@/components/ui/ControlPanel';
import { Telemetry } from '@/components/ui/Telemetry';
import { useCamera } from '@/hooks/useCamera';
import type { SimulationParams, PerformanceMetrics } from '@/types/simulation';

const App = () => {
  const [params, setParams] = useState<SimulationParams>({
    mass: 1.2,
    spin: 1.5,
    diskDensity: 3.5,
    diskTemp: 1.3,
    lensing: 1.0,
    paused: false,
    zoom: 14.0,
    quality: 'high', // Initialize with high quality
  });

  const [showUI, setShowUI] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetrics | undefined>(undefined);

  // Use camera hook for camera state and handlers
  const {
    mouse,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useCamera(params, setParams);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none font-sans text-white">
      {/* Render Canvas */}
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

      {/* Overlay Effects */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />

      {/* TOP HEADER LAYOUT */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-20 pointer-events-none">
        <div>
          <h1 className="text-xl md:text-2xl font-extralight tracking-tight text-white/90">
            SINGULARITY <span className="font-bold">OS</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-mono text-gray-400 tracking-widest">SYSTEM NOMINAL</span>
          </div>
        </div>

        {/* TELEMETRY & STATS */}
        <Telemetry params={params} metrics={metrics} />
      </div>

      {/* BOTTOM CONTROLS DASHBOARD */}
      <ControlPanel
        params={params}
        onParamsChange={setParams}
        showUI={showUI}
        onToggleUI={setShowUI}
      />

      {/* FLOATING TOGGLE BUTTON (Show when Hidden) */}
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

      {/* Tutorial Tip */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20 text-[10px] tracking-[0.3em] pointer-events-none opacity-100 animate-fade-out">
        INTERACTIVE SYSTEM READY
      </div>

    </div>
  );
};

export default App;