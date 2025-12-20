"use client";

import { ReactNode, memo, useMemo, HTMLAttributes } from "react";

interface GlowBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  /** Size variant */
  size?: "sm" | "md";
  /** Show pulsing dot indicator */
  withDot?: boolean;
}

export const GlowBadge = memo(function GlowBadge({
  children,
  size = "sm",
  withDot = false,
  className = "",
  ...props
}: GlowBadgeProps) {
  const badgeClassName = useMemo(() => {
    const sizeClasses = size === "sm"
      ? "px-3 py-1 text-xs"
      : "px-4 py-2 text-sm";
    return `inline-block glow-badge ${sizeClasses} rounded-full ${className}`.trim();
  }, [size, className]);

  return (
    <span className={badgeClassName} {...props}>
      {withDot && (
        <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full mr-2 animate-pulse-glow" />
      )}
      {children}
    </span>
  );
});
