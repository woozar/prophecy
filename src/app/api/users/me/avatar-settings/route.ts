import { NextRequest, NextResponse } from 'next/server';

import { validateBody } from '@/lib/api/validation';
import { getSession } from '@/lib/auth/session';
import { awardBadge } from '@/lib/badges/badge-service';
import { ensureInitialized, prisma } from '@/lib/db/prisma';
import { transformUserForBroadcast, userSelectForBroadcast } from '@/lib/db/user-select';
import { updateAvatarSettingsSchema } from '@/lib/schemas/user';
import { sseEmitter } from '@/lib/sse/event-emitter';

// PATCH: Avatar-Effekt und Farben aktualisieren
export async function PATCH(request: NextRequest) {
  await ensureInitialized();

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  try {
    // Validate request body with Zod
    const validation = await validateBody(request, updateAvatarSettingsSchema);
    if (!validation.success) return validation.response;
    const { avatarEffect, avatarEffectColors } = validation.data;

    // Build update data
    const updateData: { avatarEffect?: string | null; avatarEffectColors?: string | null } = {};

    if (avatarEffect !== undefined) {
      updateData.avatarEffect = avatarEffect === 'none' ? null : avatarEffect;
    }

    if (avatarEffectColors !== undefined) {
      updateData.avatarEffectColors =
        avatarEffectColors.length > 0 ? JSON.stringify(avatarEffectColors) : null;
    }

    // Update database
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
      select: userSelectForBroadcast,
    });

    // Broadcast update
    sseEmitter.broadcast({
      type: 'user:updated',
      data: transformUserForBroadcast(user),
    });

    // Award "Modebewusst" badge if user has both avatar and effect
    if (user.avatarUrl && user.avatarEffect) {
      const badgeResult = await awardBadge(session.userId, 'special_stylist');
      if (badgeResult?.isNew) {
        sseEmitter.broadcast({
          type: 'badge:awarded',
          data: {
            id: badgeResult.userBadge.id,
            earnedAt: badgeResult.userBadge.earnedAt.toISOString(),
            userId: badgeResult.userBadge.userId,
            badgeId: badgeResult.userBadge.badgeId,
            badge: badgeResult.userBadge.badge,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      avatarEffect: user.avatarEffect,
      avatarEffectColors: user.avatarEffectColors ? JSON.parse(user.avatarEffectColors) : [],
    });
  } catch (error) {
    console.error('Error updating avatar settings:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Avatar-Einstellungen' },
      { status: 500 }
    );
  }
}
