import { NextRequest, NextResponse } from 'next/server';

import { validateSession } from '@/lib/auth/admin-validation';
import { prisma } from '@/lib/db/prisma';
import { calculateRoundStatistics } from '@/lib/statistics/calculate';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/rounds/[id]/statistics - Get statistics for a round
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const validation = await validateSession();
  if (validation.error) return validation.error;

  const { session } = validation;
  const { id } = await params;

  try {
    // Get round
    const round = await prisma.round.findUnique({
      where: { id },
    });

    if (!round) {
      return NextResponse.json({ error: 'Runde nicht gefunden' }, { status: 404 });
    }

    // Check if results are published (admins can access before publication)
    const isAdmin = session.role === 'ADMIN';
    if (!round.resultsPublishedAt && !isAdmin) {
      return NextResponse.json(
        { error: 'Ergebnisse wurden noch nicht veröffentlicht' },
        { status: 403 }
      );
    }

    // Calculate statistics
    const statistics = await calculateRoundStatistics(id);

    return NextResponse.json({ statistics });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Statistiken' }, { status: 500 });
  }
}
