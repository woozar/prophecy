import { NextRequest, NextResponse } from 'next/server';

import { validateBody } from '@/lib/api/validation';
import { getSession } from '@/lib/auth/session';
import { ensureInitialized, prisma } from '@/lib/db/prisma';
import { transformUserForBroadcast, userSelectForBroadcast } from '@/lib/db/user-select';
import { updateUserPreferencesSchema } from '@/lib/schemas/user';
import { sseEmitter } from '@/lib/sse/event-emitter';

// GET: Get user preferences
export async function GET() {
  await ensureInitialized();

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { animationsEnabled: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({
      animationsEnabled: user.animationsEnabled,
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Benutzereinstellungen' },
      { status: 500 }
    );
  }
}

// PATCH: Update user preferences
export async function PATCH(request: NextRequest) {
  await ensureInitialized();

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  try {
    // Validate request body with Zod
    const validation = await validateBody(request, updateUserPreferencesSchema);
    if (!validation.success) return validation.response;
    const { animationsEnabled } = validation.data;

    // Build update data
    const updateData: { animationsEnabled?: boolean } = {};

    if (animationsEnabled !== undefined) {
      updateData.animationsEnabled = animationsEnabled;
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

    return NextResponse.json({
      success: true,
      animationsEnabled: user.animationsEnabled,
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Benutzereinstellungen' },
      { status: 500 }
    );
  }
}
