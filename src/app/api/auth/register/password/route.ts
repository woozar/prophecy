import { NextRequest, NextResponse } from 'next/server';

import bcrypt from 'bcrypt';

import {
  duplicateUsernameResponse,
  findExistingUser,
  normalizeUsername,
  registrationErrorResponse,
  registrationSuccessResponse,
  setPendingUserCookie,
} from '@/lib/auth/registration';
import { ensureInitialized, prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  await ensureInitialized();

  try {
    const body = await request.json();
    const { username, password, displayName } = body as {
      username: string;
      password: string;
      displayName?: string;
    };

    // Validierung
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Benutzername und Passwort erforderlich' },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: 'Benutzername muss mindestens 3 Zeichen lang sein' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 8 Zeichen lang sein' },
        { status: 400 }
      );
    }

    const normalizedUsername = normalizeUsername(username);

    // Prüfen ob Username bereits vergeben
    const existingUser = await findExistingUser(username);
    if (existingUser) {
      return duplicateUsernameResponse();
    }

    // Passwort hashen
    const passwordHash = await bcrypt.hash(password, 12);

    // User erstellen
    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        displayName: displayName || username,
        passwordHash,
        status: 'PENDING',
      },
    });

    await setPendingUserCookie(user.id);

    return registrationSuccessResponse(user);
  } catch (error) {
    return registrationErrorResponse(error, 'Password registration error');
  }
}
