'use client';

import { type CSSProperties, type ReactNode, memo, useMemo } from 'react';

// Shared container styles for glass bars
export function useGlassContainerStyle(
  length: number | string,
  thickness: number | string
): CSSProperties {
  return useMemo(
    () => ({
      width: length,
      height: thickness,
      background: 'rgba(16, 42, 67, 0.4)',
      border: '1px solid rgba(6, 182, 212, 0.2)',
      boxShadow: `
      inset 0 2px 4px rgba(0, 0, 0, 0.3),
      inset 0 -1px 2px rgba(255, 255, 255, 0.05),
      0 0 10px rgba(6, 182, 212, 0.1)
    `,
    }),
    [length, thickness]
  );
}

// Shared highlight styles
export function useGlassHighlightStyle(thickness: number): CSSProperties {
  return useMemo(
    () => ({
      top: 2,
      left: 4,
      right: 4,
      height: thickness * 0.3,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)',
    }),
    [thickness]
  );
}

// Fog layer styles hook
export function useFogLayerStyles(color: string) {
  const fogLayer1Style = useMemo(
    () => ({
      inset: '-20%',
      background: `
      radial-gradient(ellipse 50% 100% at 30% 50%, ${color}50 0%, transparent 70%),
      radial-gradient(ellipse 45% 90% at 70% 50%, ${color}45 0%, transparent 65%),
      radial-gradient(ellipse 40% 80% at 50% 50%, ${color}40 0%, transparent 60%)
    `,
      animation: 'fog-wisps 4s ease-in-out infinite alternate',
    }),
    [color]
  );

  const fogLayer2Style = useMemo(
    () => ({
      inset: '-15%',
      background: `
      radial-gradient(ellipse 55% 110% at 45% 50%, ${color}35 0%, transparent 65%),
      radial-gradient(ellipse 50% 100% at 75% 50%, ${color}30 0%, transparent 60%)
    `,
      animation: 'fog-wisps 5s ease-in-out infinite alternate-reverse',
    }),
    [color]
  );

  const fogLayer3Style = useMemo(
    () => ({
      inset: '-10%',
      opacity: 0.35,
      background: `
      radial-gradient(ellipse 35% 70% at 35% 50%, rgba(255,255,255,0.5) 0%, transparent 70%),
      radial-gradient(ellipse 30% 60% at 65% 50%, rgba(255,255,255,0.4) 0%, transparent 65%),
      radial-gradient(ellipse 25% 50% at 50% 50%, rgba(255,255,255,0.3) 0%, transparent 60%)
    `,
      animation: 'fog-wisps 6s ease-in-out infinite alternate',
    }),
    []
  );

  return { fogLayer1Style, fogLayer2Style, fogLayer3Style };
}

// Shared fill gradient style
export function useFillGradientStyle(
  color: string
): Pick<CSSProperties, 'background' | 'boxShadow'> {
  return useMemo(
    () => ({
      background: `linear-gradient(90deg,
      ${color}40 0%,
      ${color}60 50%,
      ${color}40 100%
    )`,
      boxShadow: `
      0 0 10px ${color}40,
      0 0 20px ${color}30,
      0 0 30px ${color}15
    `,
    }),
    [color]
  );
}

interface FogFillProps {
  color: string;
  style: CSSProperties;
}

/** Reusable fog fill layers for glass bars */
export const FogFill = memo(function FogFill({ color, style }: Readonly<FogFillProps>) {
  const { fogLayer1Style, fogLayer2Style, fogLayer3Style } = useFogLayerStyles(color);

  return (
    <div className="absolute transition-all duration-500 ease-out" style={style}>
      {/* Fog layer 1 - large soft blobs */}
      <div className="absolute" style={fogLayer1Style} />
      {/* Fog layer 2 - offset animation */}
      <div className="absolute" style={fogLayer2Style} />
      {/* White highlight wisps */}
      <div className="absolute" style={fogLayer3Style} />
    </div>
  );
});

interface GlassBarContainerProps {
  length: number | string;
  thickness: number;
  children: ReactNode;
}

/** Reusable glass bar container with highlight */
export const GlassBarContainer = memo(function GlassBarContainer({
  length,
  thickness,
  children,
}: Readonly<GlassBarContainerProps>) {
  const containerStyle = useGlassContainerStyle(length, thickness);
  const highlightStyle = useGlassHighlightStyle(thickness);

  return (
    <div className="relative rounded-full overflow-hidden" style={containerStyle}>
      {/* Glass highlight */}
      <div className="absolute pointer-events-none rounded-full" style={highlightStyle} />
      {children}
    </div>
  );
});
