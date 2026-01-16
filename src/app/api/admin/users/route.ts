import { NextResponse } from 'next/server';

import { validateAdminSession } from '@/lib/auth/admin-validation';
import { prisma } from '@/lib/db/prisma';

// GET /api/admin/users - Get all users (Admin only)
export async function GET() {
  const validation = await validateAdminSession();
  if (validation.error) return validation.error;

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
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
      },
    });

    // Parse avatarEffectColors JSON for each user
    const usersWithParsedColors = users.map((user) => ({
      ...user,
      avatarEffectColors: user.avatarEffectColors ? JSON.parse(user.avatarEffectColors) : undefined,
    }));

    return NextResponse.json({ users: usersWithParsedColors });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Benutzer' }, { status: 500 });
  }
}
