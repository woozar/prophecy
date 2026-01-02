'use client';

import { memo, useMemo } from 'react';

import { GlassScaleBar } from './GlassScaleBar';

interface RatingDisplayProps {
  value: number;
  label?: string;
  ratingCount?: number;
  /** Whether to show the average value and scale bar (default: true) */
  showAverage?: boolean;
}

function getDisplayColor(value: number): string {
  return value >= 0 ? '#22d3ee' : '#a855f7';
}

export const RatingDisplay = memo(function RatingDisplay({
  value,
  label,
  ratingCount,
  showAverage = true,
}: Readonly<RatingDisplayProps>) {
  const color = useMemo(() => getDisplayColor(value), [value]);

  const valueStyle = useMemo(
    () => ({
      color,
      textShadow: `0 0 15px ${color}40`,
    }),
    [color]
  );

  const displayLabel = useMemo(() => {
    if (!label && ratingCount === undefined) return null;

    // Build count text if ratingCount is defined
    let countText: string | null = null;
    if (ratingCount !== undefined) {
      const suffix = ratingCount === 1 ? 'Bewertung' : 'Bewertungen';
      countText = `${ratingCount} ${suffix}`;
    }

    // If not showing average, only show count
    if (!showAverage) {
      return countText;
    }

    if (label && countText) {
      return `${label} (${countText})`;
    }
    if (countText) {
      return `Durchschnitt (${countText})`;
    }
    return label;
  }, [label, ratingCount, showAverage]);

  // If not showing average, just show the count label
  if (!showAverage) {
    return (
      <div>{displayLabel && <p className="text-sm text-(--text-muted)">{displayLabel}</p>}</div>
    );
  }

  return (
    <div>
      {displayLabel && (
        <h3 className="text-sm font-medium mb-3 text-(--text-secondary)">{displayLabel}</h3>
      )}
      {/* Zeile 1: GlassBar + Wert */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <GlassScaleBar value={value} thickness={16} />
        </div>
        <span
          className="text-lg font-bold w-10 text-right transition-colors duration-300"
          style={valueStyle}
        >
          {value > 0 ? '+' : ''}
          {value.toFixed(1)}
        </span>
      </div>
      {/* Zeile 2: Labels (unter dem Balken, nicht unter dem Wert) */}
      <div className="flex items-center gap-3 mt-1">
        <div className="flex-1 flex items-center justify-between">
          <span className="text-xs text-(--text-muted)">Sicher</span>
          <span className="text-xs text-(--text-muted)">Unmöglich</span>
        </div>
        {/* Platzhalter für die Wert-Breite */}
        <span className="w-10" />
      </div>
    </div>
  );
});
