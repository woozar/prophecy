'use client';

import { useEffect, useState, memo, useMemo } from 'react';
import { Card } from '@/components/Card';
import { BackLink } from '@/components/BackLink';
import { CreatorLeaderboard } from '@/components/statistics/CreatorLeaderboard';
import { RaterLeaderboard } from '@/components/statistics/RaterLeaderboard';
import { GlowBadge } from '@/components/GlowBadge';
import { formatDate } from '@/lib/formatting/date';
import type { RoundStatistics } from '@/lib/statistics/types';
import type { Round } from '@/store/useRoundStore';

interface RoundResultsClientProps {
  round: Round;
  /** Whether this is a preview (not yet published) - only admins can see this */
  isPreview?: boolean;
}

export const RoundResultsClient = memo(function RoundResultsClient({
  round,
  isPreview = false,
}: Readonly<RoundResultsClientProps>) {
  const [statistics, setStatistics] = useState<RoundStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatistics() {
      try {
        const res = await fetch(`/api/rounds/${round.id}/statistics`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Fehler beim Laden');
        }
        const { statistics } = await res.json();
        setStatistics(statistics);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      } finally {
        setIsLoading(false);
      }
    }

    fetchStatistics();
  }, [round.id]);

  const publishedDate = useMemo(
    () => (round.resultsPublishedAt ? formatDate(round.resultsPublishedAt) : null),
    [round.resultsPublishedAt]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <BackLink href={`/rounds/${round.id}`}>Zurück zur Runde</BackLink>
        <Card padding="p-8">
          <div className="flex justify-center">
            <div className="animate-pulse text-(--text-muted)">Statistiken werden geladen...</div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <BackLink href={`/rounds/${round.id}`}>Zurück zur Runde</BackLink>
        <Card padding="p-8">
          <p className="text-center text-red-400">{error}</p>
        </Card>
      </div>
    );
  }

  if (!statistics) {
    return null;
  }

  return (
    <div className="space-y-6">
      <BackLink href={`/rounds/${round.id}`}>Zurück zur Runde</BackLink>

      {/* Preview Banner */}
      {isPreview && (
        <Card padding="p-3" className="border border-yellow-500/30 bg-yellow-500/10">
          <p className="text-sm text-yellow-400 text-center">
            Vorschau – Diese Ergebnisse sind noch nicht veröffentlicht.
          </p>
        </Card>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Ergebnisse: {round.title}</h1>
        <div className="flex items-center gap-2 mt-2">
          {statistics.isComplete ? (
            <GlowBadge size="sm" color="cyan">
              Vollständig ausgewertet
            </GlowBadge>
          ) : (
            <GlowBadge size="sm" color="yellow">
              {statistics.resolvedProphecies} von {statistics.totalAcceptedProphecies} ausgewertet
            </GlowBadge>
          )}
          {publishedDate && (
            <span className="text-sm text-(--text-muted)">Veröffentlicht am {publishedDate}</span>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <Card padding="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-cyan-400">{statistics.totalAcceptedProphecies}</p>
            <p className="text-xs text-(--text-muted)">Akzeptierte Prophezeiungen</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-cyan-400">{statistics.resolvedProphecies}</p>
            <p className="text-xs text-(--text-muted)">Ausgewertet</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-violet-400">{statistics.creatorStats.length}</p>
            <p className="text-xs text-(--text-muted)">Propheten</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-violet-400">{statistics.raterStats.length}</p>
            <p className="text-xs text-(--text-muted)">Bewerter</p>
          </div>
        </div>
      </Card>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CreatorLeaderboard stats={statistics.creatorStats} />
        <RaterLeaderboard stats={statistics.raterStats} />
      </div>
    </div>
  );
});
