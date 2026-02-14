import Image from "next/image";

export const IdentityHUD = () => {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-4">
        <Image
          src="/icon.png"
          alt="Logo"
          width={40}
          height={40}
          className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
          priority
        />
        <h1 className="text-lg md:text-xl font-extralight tracking-[0.4em] text-white uppercase leading-none">
          Blackhole Simulation
        </h1>
      </div>
      <div className="flex items-center gap-2.5 mt-2">
        <span className="text-[8px] md:text-[10px] font-mono text-white/70 tracking-[0.2em] uppercase">
          Event Horizon v5
        </span>
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
      </div>
    </div>
  );
};
