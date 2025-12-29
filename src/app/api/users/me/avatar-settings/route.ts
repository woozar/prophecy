import { NextRequest, NextResponse } from 'next/server';

import { validateBody } from '@/lib/api/validation';
import { getSession } from '@/lib/auth/session';
import { ensureInitialized, prisma } from '@/lib/db/prisma';
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
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        avatarEffect: true,
        avatarEffectColors: true,
        role: true,
        status: true,
      },
    });

    // Broadcast update
    sseEmitter.broadcast({
      type: 'user:updated',
      data: user,
    });

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
