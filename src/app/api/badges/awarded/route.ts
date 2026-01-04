import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';
import { getAwardedBadges } from '@/lib/badges/badge-service';

// GET /api/badges/awarded - Get all badges that have been awarded at least once
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const badges = await getAwardedBadges();

    return NextResponse.json({ badges });
  } catch (error) {
    console.error('Error fetching awarded badges:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der vergebenen Badges' }, { status: 500 });
  }
}
