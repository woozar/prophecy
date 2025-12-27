'use client';

import { useParams } from 'next/navigation';
import { useRoundStore } from '@/store/useRoundStore';
import { Card } from '@/components/Card';
import { BackLink } from '@/components/BackLink';
import { RoundDetailClient } from './RoundDetailClient';

export default function RoundDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const round = useRoundStore((state) => state.rounds[id]);

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

  return <RoundDetailClient round={round} />;
}
