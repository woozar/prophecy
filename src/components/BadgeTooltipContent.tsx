'use client';

import { memo, useMemo } from 'react';

import type { BadgeRarity } from '@prisma/client';

interface BadgeTooltipContentProps {
  icon: string;
  name: string;
  description: string;
  requirement: string;
  rarity: BadgeRarity;
  earnedAt?: string;
}

const RARITY_CONFIG: Record<BadgeRarity, { icon: string; title: string }> = {
  BRONZE: {
    icon: '🥉',
    title: 'Bronze',
  },
  SILVER: {
    icon: '🥈',
    title: 'Silber',
  },
  GOLD: {
    icon: '🥇',
    title: 'Gold',
  },
  LEGENDARY: {
    icon: '💎',
    title: 'Legendär',
  },
};

export const BadgeTooltipContent = memo(function BadgeTooltipContent({
  icon,
  name,
  description,
  requirement,
  rarity,
  earnedAt,
}: Readonly<BadgeTooltipContentProps>) {
  const rarityConfig = useMemo(() => RARITY_CONFIG[rarity], [rarity]);

  const formattedDate = useMemo(() => {
    if (!earnedAt) return null;
    return new Date(earnedAt).toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [earnedAt]);

  return (
    <div className="min-w-[220px] max-w-[280px]">
      {/* Header with icon and name */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <p className="font-semibold text-white truncate flex-1">{name}</p>
        <span className="text-lg" title={rarityConfig.title}>
          {rarityConfig.icon}
        </span>
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
    </div>
  );
});
