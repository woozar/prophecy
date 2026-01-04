import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

// GET /api/badges - Get all badge definitions
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const badges = await prisma.badge.findMany({
      orderBy: [{ category: 'asc' }, { rarity: 'asc' }, { threshold: 'asc' }],
    });

    return NextResponse.json({ badges });
  } catch (error) {
    console.error('Error fetching badges:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Badges' }, { status: 500 });
  }
}
