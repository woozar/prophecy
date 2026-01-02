'use client';

import { memo, useCallback, useMemo } from 'react';

import { useShallow } from 'zustand/shallow';

import { Card } from '@/components/Card';
import { Link } from '@/components/Link';
import { RoundStatusBadge } from '@/components/RoundStatusBadge';
import { useCurrentUser } from '@/hooks/useUser';
import { type Round, useRoundStore } from '@/store/useRoundStore';

export default function HomePage() {
  const currentUser = useCurrentUser();

  // Get rounds sorted by date, limited to 10
  const displayRounds = useRoundStore(
    useShallow(
      useCallback(
        (state): Round[] =>
          Object.values(state.rounds)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10),
        []
      )
    )
  );

  const formatDate = useMemo(
    () => (dateString: string) =>
      new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    []
  );

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-white">Willkommen bei </span>
          <span className="text-cyan-400">Prophezeiung</span>
        </h1>
        <p className="text-(--text-secondary)">
          Erstelle Prophezeiungen und bewerte die der anderen.
        </p>
      </div>

      {/* Rounds Grid */}
      {displayRounds.length === 0 ? (
        <Card padding="p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(6,182,212,0.1)] flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-cyan-400"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Noch keine Runden</h2>
            <p className="text-(--text-secondary)">
              {currentUser?.role === 'ADMIN'
                ? 'Erstelle die erste Runde in der Admin-Verwaltung.'
                : 'Warte bis ein Admin die erste Runde erstellt.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayRounds.map((round) => (
            <RoundCard key={round.id} round={round} formatDate={formatDate} />
          ))}
        </div>
      )}
    </div>
  );
}

interface RoundCardProps {
  round: Round;
  formatDate: (date: string) => string;
}

const RoundCard = memo(function RoundCard({ round, formatDate }: RoundCardProps) {
  return (
    <Card padding="p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{round.title}</h3>
        <RoundStatusBadge round={round} variant="compact" />
      </div>

      <div className="space-y-2 text-sm text-(--text-secondary)">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-(--text-muted)"
          >
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <path d="M3 10h18" />
          </svg>
          <span>Einreichung bis: {formatDate(round.submissionDeadline)}</span>
        </div>

        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-(--text-muted)"
          >
            <path d="M12 20h9" />
            <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
          </svg>
          <span>
            {round._count?.prophecies ?? 0} Prophezeiung
            {(round._count?.prophecies ?? 0) === 1 ? '' : 'en'}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[rgba(98,125,152,0.2)]">
        <Link
          href={`/rounds/${round.id}`}
          className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
        >
          Zur Runde &rarr;
        </Link>
      </div>
    </Card>
  );
});
