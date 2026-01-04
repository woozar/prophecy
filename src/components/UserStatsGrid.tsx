'use client';

import { memo } from 'react';

import { IconMedal, IconStar, IconThumbUp } from '@tabler/icons-react';

import { Card } from '@/components/Card';

interface UserStatsGridProps {
  prophecyCount: number;
  ratingCount: number;
  badgeCount: number;
  /** Additional className for the container */
  className?: string;
}

const stats = [
  {
    key: 'prophecies',
    icon: IconStar,
    label: 'Prophezeiungen',
    colorClass: 'bg-cyan-500/10 border-2 border-cyan-500/40',
    iconColor: 'text-cyan-400',
  },
  {
    key: 'ratings',
    icon: IconThumbUp,
    label: 'Bewertungen',
    colorClass: 'bg-violet-500/10 border-2 border-violet-500/40',
    iconColor: 'text-violet-400',
  },
  {
    key: 'badges',
    icon: IconMedal,
    label: 'Achievements',
    colorClass: 'bg-amber-500/10 border-2 border-amber-500/40',
    iconColor: 'text-amber-400',
  },
] as const;

interface StatContentProps {
  icon: typeof IconStar;
  value: number;
  label: string;
  colorClass: string;
  iconColor: string;
}

const StatContent = memo(function StatContent({
  icon: Icon,
  value,
  label,
  colorClass,
  iconColor,
}: StatContentProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center mb-2`}>
        <Icon size={20} className={iconColor} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-(--text-muted)">{label}</p>
    </div>
  );
});

export const UserStatsGrid = memo(function UserStatsGrid({
  prophecyCount,
  ratingCount,
  badgeCount,
  className = '',
}: Readonly<UserStatsGridProps>) {
  const values: Record<(typeof stats)[number]['key'], number> = {
    prophecies: prophecyCount,
    ratings: ratingCount,
    badges: badgeCount,
  };

  return (
    <div className={`flex flex-wrap justify-center gap-3 ${className}`}>
      {stats.map((stat) => (
        <Card
          key={stat.key}
          padding="p-3"
          className="w-[calc(50%-0.375rem)] xs:w-[calc(33.333%-0.5rem)]"
        >
          <StatContent
            icon={stat.icon}
            value={values[stat.key]}
            label={stat.label}
            colorClass={stat.colorClass}
            iconColor={stat.iconColor}
          />
        </Card>
      ))}
    </div>
  );
});
