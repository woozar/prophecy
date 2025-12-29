'use client';

import { useParams } from 'next/navigation';

import { BackLink } from '@/components/BackLink';
import { Card } from '@/components/Card';
import { useCurrentUser } from '@/hooks/useUser';
import { useRoundStore } from '@/store/useRoundStore';

import { RoundResultsClient } from './RoundResultsClient';

export default function RoundResultsPage() {
  const params = useParams();
  const id = params.id as string;

  const round = useRoundStore((state) => state.rounds[id]);
  const currentUser = useCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  // Round not found in store
  if (!round) {
    return (
      <div className="space-y-6">
        <BackLink href="/">Zurück zur Übersicht</BackLink>
        <Card padding="p-8">
          <p className="text-center text-(--text-muted)">Runde nicht gefunden.</p>
        </Card>
      </div>
    );
  }

  // Results not published yet (admins can still access)
  if (!round.resultsPublishedAt && !isAdmin) {
    return (
      <div className="space-y-6">
        <BackLink href={`/rounds/${id}`}>Zurück zur Runde</BackLink>
        <Card padding="p-8">
          <p className="text-center text-(--text-muted)">
            Die Ergebnisse wurden noch nicht veröffentlicht.
          </p>
        </Card>
      </div>
    );
  }

  return <RoundResultsClient round={round} isPreview={!round.resultsPublishedAt} />;
}
