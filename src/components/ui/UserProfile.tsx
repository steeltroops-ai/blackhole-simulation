import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Twitter, User, Globe } from "lucide-react";

export const UserProfile = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative flex flex-col-reverse items-center gap-4 mb-5">
      {/* Main Identity Toggle - High-End User Icon with thin stroke for 'Premium' feel */}
      <div className="relative flex items-center justify-center">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-white transition-all duration-300 relative z-50 outline-none"
          title="Creator Profile"
        >
          <User
            strokeWidth={1.5}
            className={`w-6 h-6 sm:w-7 h-7 lg:w-8 h-8 transition-all duration-500 ${
              isOpen
                ? "opacity-100 scale-110"
                : "opacity-80 hover:opacity-100 hover:scale-110"
            }`}
          />
        </button>

        {/* Identity Label - Absolute Positioned to left */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute right-[150%] whitespace-nowrap z-[60]"
            >
              <div className="relative liquid-glass bg-black/90 border border-white/10 px-4 py-0.5 rounded-full shadow-2xl overflow-hidden group">
                {/* Glossy Overlay Highlight */}
                <div className="absolute inset-0 liquid-glass-highlight pointer-events-none" />

                <span className="relative z-10 text-[11px] text-white/90 font-medium tracking-wide">
                  Built by <span className="font-bold text-white">Mayank</span>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Social Icons Stack - Directly above the User Icon */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex flex-col items-center gap-5 z-50"
          >
            <a
              href="https://github.com/steeltroops-ai/blackhole-simulation"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white opacity-60 hover:opacity-100 transition-all transform hover:scale-125"
              title="GitHub"
            >
              <Github className="w-5 h-5 sm:w-6 h-6" />
            </a>
            <a
              href="https://twitter.com/steeltroops_ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white opacity-60 hover:opacity-100 transition-all transform hover:scale-125"
              title="Twitter"
            >
              <Twitter className="w-5 h-5 sm:w-6 h-6" />
            </a>
            <a
              href="https://steeltroops.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white opacity-60 hover:opacity-100 transition-all transform hover:scale-125"
              title="Portfolio"
            >
              <Globe className="w-5 h-5 sm:w-6 h-6" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
