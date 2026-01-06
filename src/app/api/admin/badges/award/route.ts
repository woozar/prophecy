import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { validateBody } from '@/lib/api/validation';
import { validateAdminSession } from '@/lib/auth/admin-validation';
import { awardBadge } from '@/lib/badges/badge-service';
import { prisma } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';

const badgeActionSchema = z.object({
  userId: z.string().min(1, 'userId ist erforderlich'),
  badgeKey: z.string().min(1, 'badgeKey ist erforderlich'),
});

// POST /api/admin/badges/award - Manually award a badge to a user (Admin only)
export async function POST(request: NextRequest) {
  const adminValidation = await validateAdminSession();
  if (adminValidation.error) return adminValidation.error;

  try {
    const validation = await validateBody(request, badgeActionSchema);
    if (!validation.success) return validation.response;
    const { userId, badgeKey } = validation.data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    // Award the badge
    const result = await awardBadge(userId, badgeKey);

    if (!result) {
      return NextResponse.json({ error: 'Badge nicht gefunden' }, { status: 404 });
    }

    if (!result.isNew) {
      return NextResponse.json(
        {
          message: 'Benutzer hat dieses Badge bereits',
          badge: result.userBadge.badge,
        },
        { status: 200 }
      );
    }

    // Broadcast SSE event for new badge
    sseEmitter.broadcast({
      type: 'badge:awarded',
      data: {
        id: result.userBadge.id,
        badgeId: result.userBadge.badgeId,
        userId: result.userBadge.userId,
        earnedAt: result.userBadge.earnedAt.toISOString(),
        badge: {
          ...result.userBadge.badge,
          createdAt: undefined,
        },
      },
    });

    return NextResponse.json({
      message: 'Badge erfolgreich vergeben',
      userBadge: {
        ...result.userBadge,
        earnedAt: result.userBadge.earnedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error awarding badge:', error);
    return NextResponse.json({ error: 'Fehler beim Vergeben des Badges' }, { status: 500 });
  }
}

// DELETE /api/admin/badges/award - Remove a badge from a user (Admin only)
export async function DELETE(request: NextRequest) {
  const adminValidation = await validateAdminSession();
  if (adminValidation.error) return adminValidation.error;

  try {
    const validation = await validateBody(request, badgeActionSchema);
    if (!validation.success) return validation.response;
    const { userId, badgeKey } = validation.data;

    // Find the badge by key
    const badge = await prisma.badge.findUnique({
      where: { key: badgeKey },
      select: { id: true, name: true },
    });

    if (!badge) {
      return NextResponse.json({ error: 'Badge nicht gefunden' }, { status: 404 });
    }

    // Check if user has this badge
    const userBadge = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId: badge.id,
        },
      },
    });

    if (!userBadge) {
      return NextResponse.json({ error: 'Benutzer hat dieses Badge nicht' }, { status: 404 });
    }

    // Delete the user badge
    await prisma.userBadge.delete({
      where: { id: userBadge.id },
    });

    // Broadcast SSE event for badge removal
    sseEmitter.broadcast({
      type: 'badge:revoked',
      data: {
        userId,
        badgeId: badge.id,
        badgeKey,
      },
    });

    return NextResponse.json({
      message: `Badge "${badge.name}" wurde entfernt`,
    });
  } catch (error) {
    console.error('Error revoking badge:', error);
    return NextResponse.json({ error: 'Fehler beim Entfernen des Badges' }, { status: 500 });
  }
}
