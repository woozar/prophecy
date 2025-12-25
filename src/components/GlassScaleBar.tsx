"use client";

import { memo, useMemo } from "react";
import { GlassBarContainer, FogFill, useFillGradientStyle } from "./GlassBarBase";

interface GlassScaleBarProps {
  /** Current value (-10 to +10) */
  value: number;
  /** Height of the bar (default: 24px) */
  thickness?: number;
  /** Width of the bar (default: 100%) */
  length?: number | string;
  /** Color for positive values (default: cyan-400) */
  positiveColor?: string;
  /** Color for negative values (default: purple-500) */
  negativeColor?: string;
}

export const GlassScaleBar = memo(function GlassScaleBar({
  value,
  thickness = 24,
  length = "100%",
  positiveColor = "#22d3ee",
  negativeColor = "#a855f7",
}: Readonly<GlassScaleBarProps>) {
  const clampedValue = useMemo(() => Math.max(-10, Math.min(10, value)), [value]);
  const isPositive = clampedValue >= 0;
  const color = isPositive ? positiveColor : negativeColor;
  // Convert -10..+10 to 0..50% (how much of each half is filled)
  const fillPercent = useMemo(() => (Math.abs(clampedValue) / 10) * 50, [clampedValue]);

  const fillGradient = useFillGradientStyle(color);

  const fillStyle = useMemo(() => ({
    top: 0,
    bottom: 0,
    // Positive: starts at center (50%), goes right
    // Negative: ends at center (50%), starts from left side of fill
    ...(isPositive
      ? { left: "50%", width: `${fillPercent}%` }
      : { right: "50%", width: `${fillPercent}%` }),
    ...fillGradient,
  }), [isPositive, fillPercent, fillGradient]);

  const edgeGlowStyle = useMemo(() => {
    // Position glow at the outer edge of the fill
    const edgePosition = isPositive ? `${50 + fillPercent}%` : `${50 - fillPercent}%`;
    return {
      left: edgePosition,
      top: 0,
      bottom: 0,
      width: 4,
      marginLeft: -2,
      background: `radial-gradient(ellipse 100% 200% at center, ${color} 0%, transparent 70%)`,
      filter: "blur(2px)",
    };
  }, [isPositive, fillPercent, color]);

  const centerMarkerStyle = useMemo(() => ({
    left: "50%",
    top: 0,
    bottom: 0,
    width: 3,
    marginLeft: -1.5,
    background: "rgba(255, 255, 255, 0.9)",
    boxShadow: `
      0 0 8px rgba(255, 255, 255, 1),
      0 0 16px rgba(255, 255, 255, 0.8),
      0 0 24px rgba(255, 255, 255, 0.5),
      0 0 32px rgba(200, 220, 255, 0.4)
    `,
    filter: "blur(1px)",
    zIndex: 10,
    animation: "center-glow-pulse 2s ease-in-out infinite",
  }), []);

  return (
    <GlassBarContainer length={length} thickness={thickness}>
      {/* Center marker */}
      <div className="absolute" style={centerMarkerStyle} />

      {/* Fog fill */}
      {fillPercent > 0 && (
        <FogFill color={color} style={fillStyle} />
      )}

      {/* Inner glow at fill edge */}
      {fillPercent > 0 && fillPercent < 50 && (
        <div className="absolute" style={edgeGlowStyle} />
      )}
    </GlassBarContainer>
  );
});
