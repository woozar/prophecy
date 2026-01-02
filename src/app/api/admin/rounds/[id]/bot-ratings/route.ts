import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';
import { runBotRatingsForRound } from '@/lib/bots/bot-rating-service';

// POST /api/admin/rounds/[id]/bot-ratings - Trigger bot ratings for a round
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await runBotRatingsForRound(id);

    return NextResponse.json({
      success: true,
      message: `${result.totalRatingsCreated} Bot-Bewertungen erstellt`,
      result,
    });
  } catch (error) {
    console.error('Error running bot ratings:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Fehler bei Bot-Bewertungen',
      },
      { status: 400 }
    );
  }
}
