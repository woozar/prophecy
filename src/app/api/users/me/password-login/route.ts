import { NextResponse } from 'next/server';

import { z } from 'zod';

import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

const togglePasswordLoginSchema = z.object({
  enabled: z.boolean(),
});

export async function PUT(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { enabled } = togglePasswordLoginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        passwordHash: true,
        authenticators: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    // If disabling password login, ensure at least one passkey exists
    if (!enabled) {
      if (user.authenticators.length === 0) {
        return NextResponse.json(
          {
            error:
              'Mindestens ein Passkey muss konfiguriert sein, um Passwort-Login zu deaktivieren',
          },
          { status: 400 }
        );
      }

      // Disable password login by removing password hash
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: null },
      });

      return NextResponse.json({
        success: true,
        passwordLoginEnabled: false,
        message: 'Passwort-Login wurde deaktiviert',
      });
    }

    // If enabling, they need to set a new password via change-password endpoint
    return NextResponse.json({
      success: true,
      passwordLoginEnabled: !!user.passwordHash,
      message: user.passwordHash
        ? 'Passwort-Login ist bereits aktiviert'
        : 'Bitte setze ein Passwort über die Passwort-Ändern-Funktion',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 });
    }

    if (error instanceof Error && error.message === 'Nicht angemeldet') {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    console.error('Error toggling password login:', error);
    return NextResponse.json({ error: 'Fehler beim Ändern der Einstellung' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await requireSession();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        passwordHash: true,
        forcePasswordChange: true,
        authenticators: {
          select: { id: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({
      passwordLoginEnabled: !!user.passwordHash,
      forcePasswordChange: user.forcePasswordChange,
      hasPasskeys: user.authenticators.length > 0,
      canDisablePasswordLogin: user.authenticators.length > 0,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Nicht angemeldet') {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    console.error('Error fetching password login status:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Einstellung' }, { status: 500 });
  }
}
