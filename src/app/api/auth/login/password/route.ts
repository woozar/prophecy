import { NextRequest, NextResponse } from 'next/server';

import bcrypt from 'bcrypt';

import { loginErrorResponse, loginSuccessResponse, setSessionCookie } from '@/lib/auth/session';
import { ensureInitialized, prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  await ensureInitialized();

  try {
    const body = await request.json();
    const { username, password } = body as { username: string; password: string };

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Benutzername und Passwort erforderlich' },
        { status: 400 }
      );
    }

    // User suchen
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzername oder Passwort falsch' }, { status: 401 });
    }

    // Prüfen ob User ein Passwort hat
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'Kein Passwort gesetzt. Bitte mit Passkey anmelden.' },
        { status: 400 }
      );
    }

    // Passwort prüfen
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Benutzername oder Passwort falsch' }, { status: 401 });
    }

    // Status prüfen
    if (user.status !== 'APPROVED') {
      if (user.status === 'PENDING') {
        return NextResponse.json(
          { error: 'Dein Konto wurde noch nicht freigegeben' },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: 'Dein Konto ist gesperrt' }, { status: 403 });
    }

    await setSessionCookie(user);

    return loginSuccessResponse(user);
  } catch (error) {
    return loginErrorResponse(error, 'Password login error');
  }
}
