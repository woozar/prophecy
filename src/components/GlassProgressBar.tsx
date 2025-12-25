'use client';

import { memo, useMemo } from 'react';
import {
  FogFill,
  useFillGradientStyle,
  useGlassContainerStyle,
  useGlassHighlightStyle,
} from './GlassBarBase';

interface GlassProgressBarProps {
  /** Current value (0-100) */
  value: number;
  /** Orientation of the bar */
  orientation?: 'horizontal' | 'vertical';
  /** Height for horizontal / Width for vertical (default: 24px) */
  thickness?: number;
  /** Width for horizontal / Height for vertical (default: 100%) */
  length?: number | string;
  /** Fill color (default: cyan-400) */
  color?: string;
}

export const GlassProgressBar = memo(function GlassProgressBar({
  value,
  orientation = 'horizontal',
  thickness = 24,
  length = '100%',
  color = '#22d3ee',
}: Readonly<GlassProgressBarProps>) {
  const clampedValue = useMemo(() => Math.max(0, Math.min(100, value)), [value]);
  const isHorizontal = orientation === 'horizontal';

  // For vertical, swap width/height
  const containerWidth = isHorizontal ? length : thickness;
  const containerHeight = isHorizontal ? thickness : length;

  const baseContainerStyle = useGlassContainerStyle(containerWidth, containerHeight);

  const containerStyle = useMemo(
    () => ({
      ...baseContainerStyle,
      width: containerWidth,
      height: containerHeight,
    }),
    [baseContainerStyle, containerWidth, containerHeight]
  );

  const baseHighlightStyle = useGlassHighlightStyle(thickness);

  const highlightStyle = useMemo(
    () => ({
      ...baseHighlightStyle,
      left: isHorizontal ? 4 : 2,
      right: isHorizontal ? 4 : 2,
      height: isHorizontal ? thickness * 0.3 : undefined,
      bottom: isHorizontal ? undefined : 4,
      width: isHorizontal ? undefined : thickness * 0.3,
    }),
    [baseHighlightStyle, isHorizontal, thickness]
  );

  const fillGradient = useFillGradientStyle(color);

  const fillStyle = useMemo(
    () => ({
      bottom: 0,
      left: 0,
      width: isHorizontal ? `${clampedValue}%` : '100%',
      height: isHorizontal ? '100%' : `${clampedValue}%`,
      ...fillGradient,
      background: `linear-gradient(${isHorizontal ? '90deg' : '0deg'},
      ${color}40 0%,
      ${color}60 50%,
      ${color}40 100%
    )`,
    }),
    [isHorizontal, clampedValue, fillGradient, color]
  );

  const edgeGlowStyle = useMemo(
    () => ({
      ...(isHorizontal
        ? { left: `${clampedValue}%`, top: 0, bottom: 0, width: 4, marginLeft: -2 }
        : { bottom: `${clampedValue}%`, left: 0, right: 0, height: 4, marginBottom: -2 }),
      background: `radial-gradient(${isHorizontal ? 'ellipse 100% 200%' : 'ellipse 200% 100%'} at center, ${color} 0%, transparent 70%)`,
      filter: 'blur(2px)',
    }),
    [isHorizontal, clampedValue, color]
  );

  return (
    <div className="relative rounded-full overflow-hidden" style={containerStyle}>
      {/* Glass highlight */}
      <div className="absolute pointer-events-none rounded-full" style={highlightStyle} />

      {/* Fog fill */}
      <FogFill color={color} style={fillStyle} />

      {/* Inner glow at fill edge */}
      {clampedValue > 0 && clampedValue < 100 && <div className="absolute" style={edgeGlowStyle} />}
    </div>
  );
});
