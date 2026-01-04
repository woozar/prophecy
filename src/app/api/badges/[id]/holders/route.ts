import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';
import { getBadgeHolders } from '@/lib/badges/badge-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/badges/[id]/holders - Get all users who have a specific badge
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const holders = await getBadgeHolders(id);

    return NextResponse.json({
      holders: holders.map((h) => ({
        id: h.id,
        earnedAt: h.earnedAt.toISOString(),
        user: {
          id: h.user.id,
          username: h.user.username,
          displayName: h.user.displayName,
          avatarUrl: h.user.avatarUrl,
          avatarEffect: h.user.avatarEffect,
          avatarEffectColors: h.user.avatarEffectColors,
        },
      })),
    });
  } catch (error) {
    console.error('Error fetching badge holders:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Badge-Besitzer' }, { status: 500 });
  }
}
