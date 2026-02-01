import { NextResponse, after } from 'next/server';

import { validateAdminSession } from '@/lib/auth/admin-validation';
import { runBotRatingsForRound } from '@/lib/bots/bot-rating-service';

// POST /api/admin/rounds/[id]/bot-ratings - Trigger bot ratings for a round
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const validation = await validateAdminSession();
  if (validation.error) return validation.error;

  const { id } = await params;

  after(async () => {
    try {
      const result = await runBotRatingsForRound(id);
      console.log(
        `[Bot-Ratings] Fertig: ${result.totalRatingsCreated} Bewertungen für Runde "${result.roundTitle}"`
      );
    } catch (error) {
      console.error('[Bot-Ratings] Fehler:', error);
    }
  });

  return NextResponse.json({
    success: true,
    message: 'Bot-Bewertungen wurden gestartet',
  });
}
