import Image from "next/image";
import { motion } from "framer-motion";

interface IdentityHUDProps {
  isCinematic?: boolean;
  cinematicMode?: "orbit" | "dive" | null;
}

export const IdentityHUD = ({
  isCinematic,
  cinematicMode,
}: IdentityHUDProps) => {
  // Determine status text and color based on mode
  const isCinematicActive = isCinematic && cinematicMode !== null;
  const statusDotColor = isCinematicActive
    ? "bg-red-500 shadow-[0_0_5px_red]"
    : "bg-accent-cyan shadow-[0_0_5px_#00f2ff]";

  // Text remains cyan/white/original, just the content changes
  let statusText = "Metric: Kerr Vacuum State";
  if (isCinematicActive) {
    if (cinematicMode === "orbit") statusText = "Metric: Cinematic Orbit";
    if (cinematicMode === "dive") statusText = "Metric: Relativistic Infall";
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 lg:gap-4">
        <Image
          src="/icon.png"
          alt="Logo"
          width={40}
          height={40}
          className="w-10 h-10 lg:w-12 lg:h-12 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] shrink-0"
          priority
        />
        <h1 className="flex flex-col lg:block text-xs lg:text-xl font-medium lg:font-extralight tracking-[0.2em] lg:tracking-[0.4em] text-white uppercase leading-5 lg:leading-none">
          <span className="block lg:inline">Blackhole</span>
          <span className="block lg:inline lg:ml-3">Simulation</span>
        </h1>
      </div>
      <div className="flex flex-col gap-2 mt-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[7px] md:text-[8px] font-mono text-accent-cyan/80 tracking-[0.2em] animate-pulse">
                RELATIVISTIC KERNEL
              </span>
              <span className="text-[7px] md:text-[8px] font-mono text-white/60 tracking-[0.1em]">
                |
              </span>
              <span className="text-[7px] md:text-[8px] font-mono text-white/80 tracking-[0.1em] uppercase">
                Active
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="h-[2px] w-16 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-accent-cyan/40"
                  animate={{
                    width: ["40%", "95%", "85%", "100%", "92%"],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </div>
              <span className="text-[6px] font-mono text-white/40 tracking-tighter">
                SYNC_LOCK_0x3F7
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-1.5 py-0.5 bg-accent-cyan/5 border border-accent-cyan/10 rounded-sm w-fit self-start">
          <div
            className={`w-1 h-1 rounded-full animate-flicker ${statusDotColor}`}
          />
          <span className="text-[7px] font-mono text-accent-cyan/90 uppercase tracking-[0.15em] leading-none">
            {statusText}
          </span>
        </div>
      </div>
    </div>
  );
};
