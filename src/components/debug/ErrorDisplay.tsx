"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Home,
  Copy,
  Check,
  AlertTriangle,
  Server,
  Activity,
  WifiOff,
  ShieldAlert,
  FileJson,
} from "lucide-react";
import { useState, useEffect } from "react";
import errorTracker, { type TrackedErrorEvent } from "@/utils/errorTracking";

interface ErrorDisplayProps {
  error: Error | null;
  reset: () => void;
  errorInfo?: any;
  recoveryCount?: number;
}

export const ErrorDisplay = ({
  error,
  reset,
  errorInfo,
  recoveryCount = 0,
}: ErrorDisplayProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  // Error Classification Logic (extracted from ErrorBoundary)
  const classifyError = (error: any) => {
    if (!error)
      return {
        code: "UNKNOWN",
        category: "UNKNOWN",
        message: "An unexpected error occurred",
      };

    let code: string | number | null = null;
    let category = "UNKNOWN";
    let message = error.message || "An unexpected error occurred";

    if (error.status || error.code) {
      code = error.status || error.code;
      if (typeof code === "number" && code >= 500) category = "HTTP_SERVER";
      else if (typeof code === "number" && code >= 400)
        category = "HTTP_CLIENT";
    } else if (error.name) {
      category = "RUNTIME";
      code = error.name.toUpperCase();
    }

    // Special check for Server/Module errors (like the one the user reported)
    if (
      message.includes("Cannot find module") ||
      message.includes("manifest")
    ) {
      category = "HTTP_SERVER";
      code = "MODULE_NOT_FOUND";
    }

    return { code: String(code || "RUNTIME_ERR"), category, message };
  };

  const { code, category, message: displayMessage } = classifyError(error);

  const handleCopy = async () => {
    const report = `SYSTEM ERROR REPORT\nError: ${error?.message}\nStack: ${errorInfo?.componentStack || error?.stack}`;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };

  const CATEGORY_MAP: Record<string, any> = {
    HTTP_CLIENT: {
      color: "text-orange-400",
      label: "Client Error",
      icon: AlertTriangle,
    },
    HTTP_SERVER: { color: "text-red-500", label: "Server Error", icon: Server },
    RUNTIME: {
      color: "text-purple-400",
      label: "Runtime Error",
      icon: Activity,
    },
    NETWORK: {
      color: "text-yellow-400",
      label: "Network Error",
      icon: WifiOff,
    },
    AUTH: {
      color: "text-cyan-400",
      label: "Authentication Error",
      icon: ShieldAlert,
    },
    DATA: { color: "text-pink-400", label: "Data Error", icon: FileJson },
    UNKNOWN: {
      color: "text-neutral-400",
      label: "Unknown Error",
      icon: AlertTriangle,
    },
  };

  const currentCategory = CATEGORY_MAP[category] || CATEGORY_MAP.UNKNOWN;

  return (
    <div
      role="alert"
      className="fixed inset-0 z-[9999] overflow-hidden bg-black text-neutral-300 font-sans selection:bg-red-500/30 selection:text-red-100 flex flex-col items-center justify-center p-4 sm:p-6"
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black opacity-80" />
        <div className="absolute w-full h-full bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
      </div>

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center space-y-8 sm:space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-neutral-400 to-neutral-700 leading-none select-none">
            ERROR
          </h1>
          <div className="flex items-center justify-center gap-3">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-red-500/50" />
            <span className="font-mono text-xs text-red-500 tracking-[0.3em] uppercase opacity-80">
              {code}
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-red-500/50" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4 max-w-md mx-auto"
        >
          <h2 className="text-xl sm:text-2xl font-light text-white leading-tight">
            {displayMessage || "System integrity compromised"}
          </h2>
          <div className="text-sm font-mono text-neutral-500 leading-relaxed uppercase tracking-wider">
            {category === "HTTP_SERVER"
              ? "Server-side manifest breach detected."
              : "Runtime exception occurred."}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center"
        >
          <button
            onClick={reset}
            className="group relative flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white transition-all active:scale-[0.98]"
          >
            <RefreshCw
              className={`w-4 h-4 ${recoveryCount > 0 ? "text-red-400" : "text-white/70"} group-hover:rotate-180 transition-transform duration-500`}
            />
            <span className="text-[10px] uppercase font-bold tracking-widest">
              {recoveryCount > 0 ? "Force Reload" : "Retry System"}
            </span>
          </button>

          <button
            onClick={() => (window.location.href = "/")}
            className="group relative flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-3 rounded-xl bg-transparent border border-white/5 hover:bg-white/[0.02] hover:border-white/10 text-neutral-400 hover:text-white transition-all active:scale-[0.98]"
          >
            <Home className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform duration-300" />
            <span className="text-[10px] uppercase font-bold tracking-widest">
              Return Home
            </span>
          </button>
        </motion.div>

        {error && (
          <div className="w-full max-w-xl">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mx-auto flex items-center gap-2 text-[9px] text-neutral-600 hover:text-neutral-400 transition-colors uppercase tracking-[0.2em] font-mono group"
            >
              <span>Forensic Analysis</span>
              {showDetails ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 overflow-hidden text-left"
                >
                  <div className="rounded-2xl bg-neutral-900/80 border border-white/5 backdrop-blur-md overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <currentCategory.icon
                          className={`w-3 h-3 ${currentCategory.color}`}
                        />
                        <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider">
                          {error.name}
                        </span>
                      </div>
                      <button
                        onClick={handleCopy}
                        className="text-[8px] uppercase tracking-widest text-neutral-500 hover:text-white flex items-center gap-1"
                      >
                        {copied ? (
                          <Check className="w-2 h-2 text-green-400" />
                        ) : (
                          <Copy className="w-2 h-2" />
                        )}
                        {copied ? "Copied" : "Copy Log"}
                      </button>
                    </div>
                    <div className="p-4 max-h-[300px] overflow-y-auto font-mono text-[10px] leading-relaxed">
                      <div className="text-red-300/80">{error.message}</div>
                      <div className="mt-4 pt-4 border-t border-white/5 text-neutral-500 opacity-60 whitespace-pre-wrap">
                        {errorInfo?.componentStack ||
                          error.stack ||
                          "Stack trace unavailable."}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
