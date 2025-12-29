'use client';

import { memo, useMemo } from 'react';
import { GlowBadge } from './GlowBadge';

interface RoundDates {
  submissionDeadline: Date | string;
  ratingDeadline: Date | string;
  fulfillmentDate: Date | string;
  resultsPublishedAt?: Date | string | null;
}

type RoundStatus = 'submission' | 'rating' | 'waiting' | 'evaluation' | 'closed';

type BadgeVariant = 'compact' | 'full';

interface RoundStatusBadgeProps {
  round: RoundDates;
  /** Compact shows short labels, full shows longer labels */
  variant?: BadgeVariant;
  /** Custom size for the badge */
  size?: 'sm' | 'md';
}

function getRoundStatus(round: RoundDates, now: Date): RoundStatus {
  const submissionDeadline =
    round.submissionDeadline instanceof Date
      ? round.submissionDeadline
      : new Date(round.submissionDeadline);
  const ratingDeadline =
    round.ratingDeadline instanceof Date ? round.ratingDeadline : new Date(round.ratingDeadline);
  const fulfillmentDate =
    round.fulfillmentDate instanceof Date ? round.fulfillmentDate : new Date(round.fulfillmentDate);

  if (now < submissionDeadline) {
    return 'submission';
  }
  if (now < ratingDeadline) {
    return 'rating';
  }
  if (now < fulfillmentDate) {
    return 'waiting';
  }
  // After fulfillmentDate: check if results are published
  if (!round.resultsPublishedAt) {
    return 'evaluation';
  }
  return 'closed';
}

const statusConfig: Record<
  RoundStatus,
  {
    compactLabel: string;
    fullLabel: string;
    color: 'green' | 'cyan' | 'violet' | 'yellow' | 'gray';
    animated?: boolean;
    spinning?: boolean;
  }
> = {
  submission: {
    compactLabel: 'Offen',
    fullLabel: 'Einreichung offen',
    color: 'green',
  },
  rating: {
    compactLabel: 'Bewertung',
    fullLabel: 'Bewertung offen',
    color: 'cyan',
  },
  waiting: {
    compactLabel: 'Läuft',
    fullLabel: 'Läuft',
    color: 'violet',
    animated: true,
  },
  evaluation: {
    compactLabel: 'Auswertung',
    fullLabel: 'Auswertung',
    color: 'yellow',
    spinning: true,
  },
  closed: {
    compactLabel: 'Abgeschlossen',
    fullLabel: 'Abgeschlossen',
    color: 'gray',
  },
};

export const RoundStatusBadge = memo(function RoundStatusBadge({
  round,
  variant = 'compact',
  size = 'sm',
}: Readonly<RoundStatusBadgeProps>) {
  const status = useMemo(() => getRoundStatus(round, new Date()), [round]);
  const config = statusConfig[status];
  const label = variant === 'compact' ? config.compactLabel : config.fullLabel;

  if (status === 'closed') {
    // Closed state uses a simpler gray span (no glow effect)
    return (
      <span className="px-2 py-1 text-xs rounded-full bg-[rgba(98,125,152,0.2)] text-(--text-muted)">
        {label}
      </span>
    );
  }

  return (
    <GlowBadge
      size={size}
      color={config.color}
      animated={config.animated}
      className={config.spinning ? 'glow-badge-spinning' : undefined}
    >
      {label}
    </GlowBadge>
  );
});

// Export for testing
export { getRoundStatus, type RoundStatus };
