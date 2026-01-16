import { NextResponse } from 'next/server';

import { validateSession } from '@/lib/auth/admin-validation';
import { prisma } from '@/lib/db/prisma';

// GET /api/users - Get all users (public list)
// Admins see all users, normal users see only APPROVED users
export async function GET() {
  const validation = await validateSession();
  if (validation.error) return validation.error;

  try {
    const isAdmin = validation.session.role === 'ADMIN';

    const users = await prisma.user.findMany({
      where: isAdmin ? {} : { status: 'APPROVED' },
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
          take: 3, // Only top 3 badges for preview
        },
      },
      orderBy: { displayName: 'asc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Benutzer' }, { status: 500 });
  }
}
