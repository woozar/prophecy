import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';
import { getUserStats } from '@/lib/badges/badge-service';
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id] - Get user profile with badges and stats
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        avatarEffect: true,
        avatarEffectColors: true,
        role: true,
        status: true,
        isBot: true,
        createdAt: true,
        badges: {
          include: {
            badge: true,
          },
          orderBy: {
            earnedAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
    }

    // Only show non-approved users to admins
    if (user.status !== 'APPROVED' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 });
    }

    // Get user statistics
    const stats = await getUserStats(id);

    return NextResponse.json({
      user: {
        ...user,
        stats,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Fehler beim Laden des Users' }, { status: 500 });
  }
}
