'use client';

import { memo, useMemo } from 'react';

import { IconChartBar } from '@tabler/icons-react';

import { Card } from '@/components/Card';
import { GlassProgressBar } from '@/components/GlassProgressBar';
import { UserAvatar } from '@/components/UserAvatar';
import type { RaterStats } from '@/lib/statistics/types';

interface RaterLeaderboardProps {
  stats: RaterStats[];
}

const medalColors = ['#ffd700', '#c0c0c0', '#cd7f32'];

export const RaterLeaderboard = memo(function RaterLeaderboard({
  stats,
}: Readonly<RaterLeaderboardProps>) {
  const maxScore = useMemo(() => Math.max(...stats.map((s) => Math.abs(s.netScore)), 1), [stats]);

  if (stats.length === 0) {
    return (
      <Card padding="p-4">
        <h2 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
          <IconChartBar size={20} className="text-violet-400" />
          Bewerter-Ranking
        </h2>
        <p className="text-center text-(--text-muted) py-4">Keine Bewertungen vorhanden.</p>
      </Card>
    );
  }

  return (
    <Card padding="p-4">
      <h2 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
        <IconChartBar size={20} className="text-violet-400" />
        Bewerter-Ranking
      </h2>

      {/* Explanation */}
      <p className="text-xs text-(--text-muted) mb-4">
        Korrekt = Positive Bewertung bei erfüllter Prophezeiung, oder negative Bewertung bei nicht
        erfüllter Prophezeiung.
      </p>

      <div className="space-y-3">
        {stats.map((rater, index) => (
          <RaterRow key={rater.userId} rater={rater} rank={index + 1} maxScore={maxScore} />
        ))}
      </div>
    </Card>
  );
});

interface RaterRowProps {
  rater: RaterStats;
  rank: number;
  maxScore: number;
}

const RaterRow = memo(function RaterRow({ rater, rank, maxScore }: Readonly<RaterRowProps>) {
  const progressPercent = useMemo(
    () => (Math.abs(rater.netScore) / maxScore) * 100,
    [rater.netScore, maxScore]
  );

  const isPositive = rater.netScore >= 0;
  const scoreColor = isPositive ? '#22d3ee' : '#a855f7';
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
        <UserAvatar userId={rater.userId} size="sm" clickable />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">
            {rater.displayName || rater.username}
          </p>
          <div className="flex items-center gap-2 text-xs text-(--text-muted)">
            <span className="text-cyan-400">+{rater.correctPoints}</span>
            <span>/</span>
            <span className="text-red-400">-{rater.incorrectPoints}</span>
            <span>({rater.hitRatePercentage}% Trefferquote)</span>
          </div>
        </div>
      </div>

      {/* Score */}
      <div className="text-right shrink-0 w-20">
        <p
          className="text-lg font-bold"
          style={{
            color: scoreColor,
            textShadow: `0 0 10px ${scoreColor}40`,
          }}
        >
          {isPositive ? '+' : ''}
          {rater.netScore}
        </p>
        <div className="mt-1">
          <GlassProgressBar value={progressPercent} thickness={6} color={scoreColor} />
        </div>
      </div>
    </div>
  );
});
