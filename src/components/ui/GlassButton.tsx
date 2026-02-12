import React from "react";
import { cn } from "@/utils/cn"; // Assuming you have a cn utility, or I'll just use template literals if not found.

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  label: string;
  icon?: React.ReactNode;
  description?: string; // For things like tooltips if needed
  layout?: "row" | "col" | "grid"; // For internal layout
  isToggle?: boolean; // If true, shows a toggle dot/indicator
}

export const GlassButton = ({
  isActive,
  label,
  icon,
  className,
  children,
  isToggle = false,
  ...props
}: GlassButtonProps) => {
  return (
    <button
      className={`
        relative group flex items-center transition-all duration-300
        rounded-lg border backdrop-blur-xl
        ${
          isActive
            ? "bg-white/90 text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.4)]"
            : "bg-white/[0.06] text-white/70 border-white/10 hover:bg-white/[0.12] hover:border-white/20 hover:text-white"
        }
        ${className}
      `}
      {...props}
    >
      {icon && (
        <span
          className={`mr-2 ${isActive ? "text-white" : "text-white/60 group-hover:text-white"}`}
        >
          {icon}
        </span>
      )}

      <span className="text-[9px] uppercase font-bold tracking-wider truncate">
        {label}
      </span>

      {children}

      {isToggle && isActive && (
        <div className="ml-auto w-1 h-1 bg-white rounded-full shadow-[0_0_5px_white]" />
      )}
    </button>
  );
};
