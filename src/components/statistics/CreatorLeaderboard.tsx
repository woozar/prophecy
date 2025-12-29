'use client';

import { memo } from 'react';

import { IconTrophy } from '@tabler/icons-react';

import { Card } from '@/components/Card';
import { GlassProgressBar } from '@/components/GlassProgressBar';
import { UserAvatar } from '@/components/UserAvatar';
import type { CreatorStats } from '@/lib/statistics/types';

interface CreatorLeaderboardProps {
  stats: CreatorStats[];
}

const medalColors = ['#ffd700', '#c0c0c0', '#cd7f32'];

export const CreatorLeaderboard = memo(function CreatorLeaderboard({
  stats,
}: Readonly<CreatorLeaderboardProps>) {
  if (stats.length === 0) {
    return (
      <Card padding="p-4">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <IconTrophy size={20} className="text-cyan-400" />
          Propheten-Ranking
        </h2>
        <p className="text-center text-(--text-muted) py-4">
          Keine Propheten mit akzeptierten Prophezeiungen.
        </p>
      </Card>
    );
  }

  return (
    <Card padding="p-4">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <IconTrophy size={20} className="text-cyan-400" />
        Propheten-Ranking
      </h2>

      <div className="space-y-3">
        {stats.map((creator, index) => (
          <CreatorRow key={creator.userId} creator={creator} rank={index + 1} />
        ))}
      </div>
    </Card>
  );
});

interface CreatorRowProps {
  creator: CreatorStats;
  rank: number;
}

const CreatorRow = memo(function CreatorRow({ creator, rank }: Readonly<CreatorRowProps>) {
  const medalColor = rank <= 3 ? medalColors[rank - 1] : undefined;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
      {/* Rank */}
      <div
        className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold shrink-0"
        style={{
          backgroundColor: medalColor ? `${medalColor}20` : 'rgba(255,255,255,0.1)',
          color: medalColor || 'var(--text-muted)',
          boxShadow: medalColor ? `0 0 10px ${medalColor}40` : undefined,
        }}
      >
        {rank}
      </div>

      {/* Avatar and Name */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <UserAvatar userId={creator.userId} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">
            {creator.displayName || creator.username}
          </p>
          <div className="flex items-center gap-2 text-xs text-(--text-muted)">
            <span>
              {creator.fulfilledProphecies}/{creator.acceptedProphecies} erfüllt
            </span>
            <span>({creator.fulfilledPercentage}%)</span>
          </div>
        </div>
      </div>

      {/* Score */}
      <div className="text-right shrink-0 w-24">
        <p
          className="text-lg font-bold"
          style={{
            color: '#22d3ee',
            textShadow: '0 0 10px rgba(34, 211, 238, 0.4)',
          }}
        >
          {creator.totalScore.toFixed(1)}
          <span className="text-xs text-(--text-muted) font-normal">
            /{creator.maxPossibleScore.toFixed(1)}
          </span>
        </p>
        <p className="text-xs text-(--text-muted)">({creator.scorePercentage}%)</p>
        <div className="mt-1">
          <GlassProgressBar value={creator.scorePercentage} thickness={6} />
        </div>
      </div>
    </div>
  );
});
