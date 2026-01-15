import { NextRequest, NextResponse } from 'next/server';

import { type RegistrationResponseJSON, verifyRegistrationResponse } from '@simplewebauthn/server';

import {
  duplicateUsernameResponse,
  normalizeUsername,
  registrationErrorResponse,
  registrationSuccessResponse,
  setPendingUserCookie,
} from '@/lib/auth/registration';
import { clearChallenge, getChallenge, webauthnConfig } from '@/lib/auth/webauthn';
import { prisma } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential, tempUserId, username, displayName } = body as {
      credential: RegistrationResponseJSON;
      tempUserId: string;
      username: string;
      displayName: string;
    };

    // Validierung
    if (!credential || !tempUserId || !username) {
      return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
    }

    // Challenge abrufen
    const expectedChallenge = getChallenge(tempUserId);
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: 'Registrierung abgelaufen. Bitte erneut versuchen.' },
        { status: 400 }
      );
    }

    // Credential verifizieren
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: webauthnConfig.origin,
      expectedRPID: webauthnConfig.rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Passkey-Verifizierung fehlgeschlagen' }, { status: 400 });
    }

    const {
      credential: credentialInfo,
      credentialDeviceType,
      credentialBackedUp,
    } = verification.registrationInfo;

    // Challenge löschen
    clearChallenge(tempUserId);

    const normalizedUsername = normalizeUsername(username);

    // Prüfen ob Username mittlerweile vergeben wurde (Race Condition)
    const existingUser = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (existingUser) {
      return duplicateUsernameResponse();
    }

    // User und Authenticator in einer Transaktion erstellen
    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        displayName: displayName || username,
        status: 'PENDING',
        authenticators: {
          create: {
            credentialID: credential.id,
            credentialPublicKey: Buffer.from(credentialInfo.publicKey).toString('base64'),
            counter: credentialInfo.counter,
            credentialDeviceType,
            credentialBackedUp,
            transports: credential.response.transports?.join(',') || null,
            name: 'Mein Passkey',
          },
        },
      },
      include: {
        authenticators: true,
      },
    });

    // Notify admins via SSE about new user registration
    sseEmitter.broadcast({
      type: 'user:created',
      data: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
      },
    });

    await setPendingUserCookie(user.id);

    return registrationSuccessResponse(user);
  } catch (error) {
    return registrationErrorResponse(error, 'Registration verify error');
  }
}
