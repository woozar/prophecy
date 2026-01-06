'use client';

import { memo, useMemo } from 'react';

import { BadgeIcon } from '@/components/BadgeIcon';
import { formatDate } from '@/lib/formatting/date';
import type { Badge } from '@/store/useBadgeStore';

interface TierBadgeInfo {
  badge: Badge;
  isEarned: boolean;
  earnedAt?: string;
}

interface BadgeTooltipContentProps {
  badgeKey: string;
  name: string;
  description: string;
  requirement: string;
  earnedAt?: string;
  /** Tier badges to show (sorted best first). If provided, shows tier progression. */
  tierBadges?: TierBadgeInfo[];
}

export const BadgeTooltipContent = memo(function BadgeTooltipContent({
  badgeKey,
  name,
  description,
  requirement,
  earnedAt,
  tierBadges,
}: Readonly<BadgeTooltipContentProps>) {
  const formattedDate = useMemo(() => (earnedAt ? formatDate(earnedAt) : null), [earnedAt]);

  const hasTiers = tierBadges && tierBadges.length > 1;

  return (
    <div className="min-w-[220px] max-w-[280px]">
      {/* Header with icon and name */}
      <div className="flex items-center gap-2 mb-2">
        <BadgeIcon badgeKey={badgeKey} size="md" />
        <p className="font-semibold text-white truncate flex-1">{name}</p>
      </div>

      {/* Divider */}
      <div className="h-px bg-[rgba(98,125,152,0.3)] mb-2" />

      {/* Description */}
      <p className="text-sm text-(--text-secondary) italic mb-2">{description}</p>

      {/* Requirement */}
      <p className="text-xs text-cyan-400 font-medium">{requirement}</p>

      {/* Earned date if provided */}
      {formattedDate && (
        <p className="text-xs text-(--text-secondary) mt-2 pt-2 border-t border-[rgba(139,92,246,0.3)]">
          Erreicht am {formattedDate}
        </p>
      )}

      {/* Tier progression */}
      {hasTiers && (
        <div className="mt-3 pt-3 border-t border-[rgba(98,125,152,0.3)]">
          <p className="text-xs text-(--text-muted) mb-2">Alle Stufen:</p>
          <div className="flex flex-col gap-1.5">
            {tierBadges.map((tier) => (
              <TierBadgeRow
                key={tier.badge.key}
                badge={tier.badge}
                isEarned={tier.isEarned}
                earnedAt={tier.earnedAt}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

interface TierBadgeRowProps {
  badge: Badge;
  isEarned: boolean;
  earnedAt?: string;
}

const TierBadgeRow = memo(function TierBadgeRow({
  badge,
  isEarned,
  earnedAt,
}: Readonly<TierBadgeRowProps>) {
  const formattedDate = useMemo(() => (earnedAt ? formatDate(earnedAt) : null), [earnedAt]);

  return (
    <div className={`flex items-center gap-2 ${isEarned ? 'text-white' : 'text-(--text-muted)'}`}>
      <BadgeIcon badgeKey={badge.key} size="sm" disabled={!isEarned} className="w-6 h-6" />
      <span className="text-xs flex-1 truncate">{badge.name}</span>
      {isEarned && formattedDate && (
        <span className="text-xs text-(--text-muted)">{formattedDate}</span>
      )}
      {isEarned && !formattedDate && <span className="text-xs text-green-400">✓</span>}
    </div>
  );
});
