'use client';

import { HTMLAttributes, ReactNode, memo, useMemo } from 'react';

type BadgeColor = 'cyan' | 'green' | 'yellow' | 'red' | 'violet' | 'gray';

interface GlowBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'> {
  children: ReactNode;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Color variant */
  color?: BadgeColor;
  /** Show pulsing dot indicator */
  withDot?: boolean;
  /** Show animated border (for "running" states) */
  animated?: boolean;
}

const colorStyles: Record<BadgeColor, string> = {
  cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  green: 'bg-green-500/10 border-green-500/30 text-green-400',
  yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  red: 'bg-red-500/10 border-red-500/30 text-red-400',
  violet: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
  gray: 'bg-gray-500/10 border-gray-500/30 text-gray-400',
};

export const GlowBadge = memo(function GlowBadge({
  children,
  size = 'sm',
  color = 'cyan',
  withDot = false,
  animated = false,
  className = '',
  ...props
}: Readonly<GlowBadgeProps>) {
  const badgeClassName = useMemo(() => {
    const sizeClasses = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm';
    const colorClasses = colorStyles[color];
    const animatedClass = animated ? 'glow-badge-animated' : '';
    return `inline-flex items-center gap-1.5 border rounded-full font-medium ${sizeClasses} ${colorClasses} ${animatedClass} ${className}`.trim();
  }, [size, color, animated, className]);

  return (
    <span className={badgeClassName} {...props}>
      {animated && (
        <>
          <span className="bubble-extra" />
          <span className="bubble-extra" />
          <span className="bubble-extra" />
          <span className="bubble-extra" />
          <span className="bubble-extra" />
          <span className="bubble-extra" />
          <span className="bubble-extra" />
          <span className="bubble-extra" />
          <span className="bubble-extra" />
          <span className="bubble-extra" />
        </>
      )}
      {withDot && <span className="inline-block w-2 h-2 bg-current rounded-full animate-pulse" />}
      {children}
    </span>
  );
});
