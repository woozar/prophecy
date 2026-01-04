import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';
import { getUserBadges } from '@/lib/badges/badge-service';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id]/badges - Get all badges for a user
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Check if user exists and is visible
    const user = await prisma.user.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
    }

    // Only show non-approved users to admins
    if (user.status !== 'APPROVED' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
    }

    const badges = await getUserBadges(id);

    return NextResponse.json({ badges });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Badges' }, { status: 500 });
  }
}
