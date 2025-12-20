"use client";

import { memo, useMemo } from "react";

interface GlassProgressBarProps {
  /** Current value (0-100) */
  value: number;
  /** Orientation of the bar */
  orientation?: "horizontal" | "vertical";
  /** Height for horizontal / Width for vertical (default: 24px) */
  thickness?: number;
  /** Width for horizontal / Height for vertical (default: 100%) */
  length?: number | string;
  /** Fill color (default: cyan-400) */
  color?: string;
}

export const GlassProgressBar = memo(function GlassProgressBar({
  value,
  orientation = "horizontal",
  thickness = 24,
  length = "100%",
  color = "#22d3ee",
}: GlassProgressBarProps) {
  const clampedValue = useMemo(() => Math.max(0, Math.min(100, value)), [value]);
  const isHorizontal = orientation === "horizontal";

  const containerStyle = useMemo(() => ({
    width: isHorizontal ? length : thickness,
    height: isHorizontal ? thickness : length,
    background: "rgba(16, 42, 67, 0.4)",
    border: "1px solid rgba(6, 182, 212, 0.2)",
    boxShadow: `
      inset 0 2px 4px rgba(0, 0, 0, 0.3),
      inset 0 -1px 2px rgba(255, 255, 255, 0.05),
      0 0 10px rgba(6, 182, 212, 0.1)
    `,
  }), [isHorizontal, length, thickness]);

  const highlightStyle = useMemo(() => ({
    top: 2,
    left: isHorizontal ? 4 : 2,
    right: isHorizontal ? 4 : 2,
    height: isHorizontal ? thickness * 0.3 : undefined,
    bottom: isHorizontal ? undefined : 4,
    width: isHorizontal ? undefined : thickness * 0.3,
    background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)",
  }), [isHorizontal, thickness]);

  const fillStyle = useMemo(() => ({
    bottom: 0,
    left: 0,
    width: isHorizontal ? `${clampedValue}%` : "100%",
    height: isHorizontal ? "100%" : `${clampedValue}%`,
    background: `linear-gradient(${isHorizontal ? "90deg" : "0deg"},
      ${color}40 0%,
      ${color}60 50%,
      ${color}40 100%
    )`,
    boxShadow: `
      0 0 10px ${color}40,
      0 0 20px ${color}30,
      0 0 30px ${color}15
    `,
  }), [isHorizontal, clampedValue, color]);

  const fogLayer1Style = useMemo(() => ({
    inset: "-20%",
    background: `
      radial-gradient(ellipse 50% 100% at 30% 50%, ${color}50 0%, transparent 70%),
      radial-gradient(ellipse 45% 90% at 70% 50%, ${color}45 0%, transparent 65%),
      radial-gradient(ellipse 40% 80% at 50% 50%, ${color}40 0%, transparent 60%)
    `,
    animation: "fog-wisps 4s ease-in-out infinite alternate",
  }), [color]);

  const fogLayer2Style = useMemo(() => ({
    inset: "-15%",
    background: `
      radial-gradient(ellipse 55% 110% at 45% 50%, ${color}35 0%, transparent 65%),
      radial-gradient(ellipse 50% 100% at 75% 50%, ${color}30 0%, transparent 60%)
    `,
    animation: "fog-wisps 5s ease-in-out infinite alternate-reverse",
  }), [color]);

  const fogLayer3Style = useMemo(() => ({
    inset: "-10%",
    opacity: 0.35,
    background: `
      radial-gradient(ellipse 35% 70% at 35% 50%, rgba(255,255,255,0.5) 0%, transparent 70%),
      radial-gradient(ellipse 30% 60% at 65% 50%, rgba(255,255,255,0.4) 0%, transparent 65%),
      radial-gradient(ellipse 25% 50% at 50% 50%, rgba(255,255,255,0.3) 0%, transparent 60%)
    `,
    animation: "fog-wisps 6s ease-in-out infinite alternate",
  }), []);

  const edgeGlowStyle = useMemo(() => ({
    ...(isHorizontal
      ? { left: `${clampedValue}%`, top: 0, bottom: 0, width: 4, marginLeft: -2 }
      : { bottom: `${clampedValue}%`, left: 0, right: 0, height: 4, marginBottom: -2 }),
    background: `radial-gradient(${isHorizontal ? "ellipse 100% 200%" : "ellipse 200% 100%"} at center, ${color} 0%, transparent 70%)`,
    filter: "blur(2px)",
  }), [isHorizontal, clampedValue, color]);

  return (
    <div
      className="relative rounded-full overflow-hidden"
      style={containerStyle}
    >
      {/* Glass highlight */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={highlightStyle}
      />

      {/* Fog fill */}
      <div
        className="absolute transition-all duration-500 ease-out"
        style={fillStyle}
      >
        {/* Fog layer 1 - large soft blobs */}
        <div className="absolute" style={fogLayer1Style} />
        {/* Fog layer 2 - offset animation */}
        <div className="absolute" style={fogLayer2Style} />
        {/* White highlight wisps */}
        <div className="absolute" style={fogLayer3Style} />
      </div>

      {/* Inner glow at fill edge */}
      {clampedValue > 0 && clampedValue < 100 && (
        <div className="absolute" style={edgeGlowStyle} />
      )}
    </div>
  );
});
