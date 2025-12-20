"use client";

import { ReactNode, ButtonHTMLAttributes, memo, useMemo } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface AiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export const AiButton = memo(function AiButton({ children, className = "", ...props }: AiButtonProps) {
  const reducedMotion = useReducedMotion();

  const borderStyle = useMemo(() => ({
    padding: "2px",
    background: "linear-gradient(90deg, #22d3ee, #14b8a6, #8b5cf6, #a855f7, #22d3ee)",
    backgroundSize: "300% 100%",
    animation: reducedMotion ? "none" : "ai-button-flow 3s linear infinite",
    mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    maskComposite: "exclude" as const,
    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMaskComposite: "xor" as const,
  }), [reducedMotion]);

  const glowStyle = useMemo(() => ({
    background: "radial-gradient(ellipse at center, rgba(6, 182, 212, 0.15) 0%, transparent 70%)",
  }), []);

  const buttonClassName = useMemo(() => `
    relative px-6 py-3 rounded-lg font-semibold text-white
    overflow-hidden
    disabled:opacity-50 disabled:cursor-not-allowed
    ${reducedMotion ? "" : "transition-all duration-300 hover:enabled:scale-105 active:enabled:scale-95"}
    ${className}
  `.trim(), [reducedMotion, className]);

  const glowClassName = useMemo(() =>
    `absolute inset-0 rounded-lg opacity-0 hover:opacity-100 pointer-events-none ${reducedMotion ? "" : "transition-opacity duration-300"}`,
    [reducedMotion]
  );

  return (
    <button
      className={buttonClassName}
      style={{ background: "#102a43" }}
      {...props}
    >
      {/* Animated flowing border gradient */}
      <div
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={borderStyle}
      />
      {/* Inner glow on hover */}
      <div className={glowClassName} style={glowStyle} />
      <span className="relative z-10">{children}</span>
      <style jsx>{`
        @keyframes ai-button-flow {
          0% { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }
      `}</style>
    </button>
  );
});
