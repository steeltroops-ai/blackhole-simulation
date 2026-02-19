"use client";

import { motion } from "framer-motion";
import { ExternalLink, ChevronRight, Monitor, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

export const CompatibilityHUD = () => {
  const [env, setEnv] = useState<{
    os: string;
    browser: string;
    isInApp: boolean;
  } | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    let os = "Desktop";
    let browser = "Modern Browser";

    // In-app detection
    const isInApp =
      /Instagram|FBAN|FBAV|LinkedIn|Threads|Messenger|Line|Twitter|MicroMessenger/i.test(
        ua,
      );

    if (/Windows/i.test(ua)) os = "Windows";
    else if (/Mac/i.test(ua)) os = "macOS";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/iPhone|iPad/i.test(ua)) os = "iOS";

    if (/Chrome/i.test(ua)) browser = "Chrome";
    else if (/Firefox/i.test(ua)) browser = "Firefox";
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
    else if (/Edge/i.test(ua)) browser = "Edge";

    setEnv({ os, browser, isInApp });
  }, []);

  const getGuide = () => {
    if (env?.isInApp) {
      if (env.os === "iOS")
        return "Tap the ••• menu and choose 'Open in Safari'";
      if (env.os === "Android")
        return "Tap the menu and choose 'Open in Chrome'";
      return "Switch to a dedicated browser for hardware acceleration.";
    }

    if (env?.os === "iOS")
      return "Open this page in Safari or Chrome for a better experience.";
    if (env?.os === "Android")
      return "Please open this in Chrome or your default mobile browser.";
    return "Check your browser settings to ensure hardware acceleration is enabled.";
  };

  const handlePrimaryAction = () => {
    const url = window.location.href;
    const cleanUrl = url.replace(/^https?:\/\//, "");

    if (env?.os === "Android") {
      // Android: Generic Intent to trigger 'Open with' picker
      window.location.href = `intent://${cleanUrl}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
    } else if (env?.os === "iOS" && env?.isInApp) {
      // iOS In-app: Attempt jump to Chrome or just copy
      window.location.href = `googlechromes://${cleanUrl}`;
      navigator.clipboard.writeText(url);
    } else {
      // Standard desktop or non-app iOS: Just reload or guide
      navigator.clipboard.writeText(url);
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/98 backdrop-blur-xl select-none overflow-hidden font-sans">
      {/* Dynamic Background elements - minimalist & monochromatic */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative max-w-lg w-full px-8 pt-16 flex flex-col items-center text-center"
      >
        {/* Top Status */}
        <div className="flex flex-col items-center gap-1 mb-16">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse" />
            <span className="text-[10px] font-mono text-red-500 tracking-[0.5em] uppercase font-bold">
              System Alert
            </span>
          </div>
          <h1 className="text-5xl font-thin tracking-tight text-white uppercase leading-none">
            Physics Experience <br />
            <span className="font-bold text-red-500">Limited</span>
          </h1>
        </div>

        {/* Info Section */}
        <div className="w-full space-y-10">
          <p className="text-white/40 text-[10px] leading-relaxed tracking-[0.3em] uppercase font-bold max-w-xs mx-auto">
            {env?.isInApp
              ? "Your current browser setup restricts some advanced visual effects."
              : "We couldn't activate the high-performance physics engine on this device."}
          </p>

          {/* Guide Card - Pure Monochromatic */}
          <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col items-center gap-5 backdrop-blur-sm">
            <div className="flex items-center gap-3 opacity-60">
              {env?.os === "Android" || env?.os === "iOS" ? (
                <Smartphone className="w-4 h-4 text-white" />
              ) : (
                <Monitor className="w-4 h-4 text-white" />
              )}
              <span className="text-[9px] font-black text-white tracking-[0.3em] uppercase">
                Navigation Protocol
              </span>
            </div>

            <p className="text-white/95 text-base font-light tracking-wide">
              {getGuide()}
            </p>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2 opacity-30">
                <div className="w-1 h-1 rounded-full bg-white" />
                <span className="text-[8px] font-black uppercase tracking-widest leading-none">
                  Google Chrome
                </span>
              </div>
              <div className="flex items-center gap-2 opacity-30">
                <div className="w-1 h-1 rounded-full bg-white" />
                <span className="text-[8px] font-black uppercase tracking-widest leading-none">
                  Microsoft Edge
                </span>
              </div>
            </div>

            <div className="h-[1px] w-8 bg-white/10" />

            <div className="flex items-center gap-2 text-[8px] font-mono text-white/20 uppercase tracking-[0.2em]">
              Current Environment: {env?.browser} | {env?.os}
              {env?.isInApp && (
                <span className="text-red-500/50 ml-1"> [In-App]</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 items-center">
            <button
              onClick={handlePrimaryAction}
              className="group relative px-10 py-4 bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-red-500 hover:text-white transition-all duration-300 flex items-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95"
            >
              Unlock Full Physics
              <ExternalLink className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
            </button>

            <button
              onClick={() => window.location.reload()}
              className="py-2 text-[9px] font-bold text-white/30 uppercase tracking-[0.4em] hover:text-white transition-colors flex items-center gap-2"
            >
              Reinitialize Kernel
              <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-20 flex items-center gap-12 text-[7px] font-mono text-white/10 uppercase tracking-[0.5em]">
          <span>Ver. 4.0.18</span>
          <span>Metric: Ingoing Kerr</span>
        </div>
      </motion.div>
    </div>
  );
};
