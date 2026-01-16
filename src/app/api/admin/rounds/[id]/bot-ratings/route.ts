import { NextResponse } from 'next/server';

import { validateAdminSession } from '@/lib/auth/admin-validation';
import { runBotRatingsForRound } from '@/lib/bots/bot-rating-service';

// POST /api/admin/rounds/[id]/bot-ratings - Trigger bot ratings for a round
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const validation = await validateAdminSession();
  if (validation.error) return validation.error;

  const { id } = await params;

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
