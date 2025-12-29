import { NextRequest, NextResponse } from 'next/server';

import bcrypt from 'bcrypt';

import { validateBody } from '@/lib/api/validation';
import { loginErrorResponse, loginSuccessResponse, setSessionCookie } from '@/lib/auth/session';
import { ensureInitialized, prisma } from '@/lib/db/prisma';
import { passwordLoginSchema } from '@/lib/schemas/auth';

export async function POST(request: NextRequest) {
  await ensureInitialized();

  try {
    // Validate request body with Zod
    const validation = await validateBody(request, passwordLoginSchema);
    if (!validation.success) return validation.response;
    const { username, password } = validation.data;

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
