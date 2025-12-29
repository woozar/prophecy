import { NextResponse } from 'next/server';

import bcrypt from 'bcrypt';
import { z } from 'zod';

import { validateBody } from '@/lib/api/validation';
import { requireSession, setSessionCookie } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { changePasswordSchema } from '@/lib/schemas/auth';

export async function POST(request: Request) {
  try {
    const session = await requireSession();

    // Validate request body with Zod
    const validation = await validateBody(request, changePasswordSchema);
    if (!validation.success) return validation.response;
    const validatedData = validation.data;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        passwordHash: true,
        forcePasswordChange: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    // Check if current password is required:
    // - Not required if forcePasswordChange is true (admin reset)
    // - Not required if user has no password yet (setting first password)
    const requireCurrentPassword = !user.forcePasswordChange && user.passwordHash !== null;

    if (requireCurrentPassword) {
      if (!validatedData.currentPassword) {
        return NextResponse.json({ error: 'Aktuelles Passwort erforderlich' }, { status: 400 });
      }

      const isValid = await bcrypt.compare(validatedData.currentPassword, user.passwordHash!);
      if (!isValid) {
        return NextResponse.json({ error: 'Aktuelles Passwort ist falsch' }, { status: 401 });
      }
    }

    // Hash and save new password
    const newPasswordHash = await bcrypt.hash(validatedData.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        forcePasswordChange: false,
      },
    });

    // Refresh session cookie
    await setSessionCookie({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Ungültige Eingabe' },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Nicht angemeldet') {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    console.error('Error changing password:', error);
    return NextResponse.json({ error: 'Fehler beim Ändern des Passworts' }, { status: 500 });
  }
}
