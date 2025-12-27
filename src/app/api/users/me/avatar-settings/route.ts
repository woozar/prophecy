import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma, ensureInitialized } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';

const VALID_EFFECTS = new Set(['glow', 'particles', 'lightning', 'none']);
const VALID_COLORS = new Set([
  'cyan',
  'teal',
  'violet',
  'emerald',
  'rose',
  'amber',
  'blue',
  'pink',
]);

function validateColors(colors: string[] | undefined): string | null {
  if (colors === undefined) return null;
  if (!Array.isArray(colors)) return 'Farben müssen ein Array sein';
  const invalidColors = colors.filter((c) => !VALID_COLORS.has(c));
  if (invalidColors.length > 0) return `Ungültige Farben: ${invalidColors.join(', ')}`;
  return null;
}

// PATCH: Avatar-Effekt und Farben aktualisieren
export async function PATCH(request: NextRequest) {
  await ensureInitialized();

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { avatarEffect, avatarEffectColors } = body as {
      avatarEffect?: string;
      avatarEffectColors?: string[];
    };

    // Validate effect
    if (avatarEffect !== undefined && !VALID_EFFECTS.has(avatarEffect)) {
      return NextResponse.json(
        { error: `Ungültiger Effekt. Erlaubt: ${[...VALID_EFFECTS].join(', ')}` },
        { status: 400 }
      );
    }

    // Validate colors
    const colorValidationError = validateColors(avatarEffectColors);
    if (colorValidationError) {
      return NextResponse.json({ error: colorValidationError }, { status: 400 });
    }

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
