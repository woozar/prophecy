import { NextRequest, NextResponse } from 'next/server';

import {
  type AuthenticationResponseJSON,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

import { loginErrorResponse, loginSuccessResponse, setSessionCookie } from '@/lib/auth/session';
import { clearChallenge, getChallenge, webauthnConfig } from '@/lib/auth/webauthn';
import { prisma } from '@/lib/db/prisma';
import { debug } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential, challengeKey } = body as {
      credential: AuthenticationResponseJSON;
      challengeKey: string;
    };

    if (!credential || !challengeKey) {
      return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
    }

    // Challenge abrufen
    const expectedChallenge = getChallenge(challengeKey);
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: 'Anmeldung abgelaufen. Bitte erneut versuchen.' },
        { status: 400 }
      );
    }

    // Authenticator anhand der Credential ID finden
    debug.log('[Login] Looking for credential ID:', credential.id);

    // Versuche verschiedene Encodings
    let authenticator = await prisma.authenticator.findUnique({
      where: { credentialID: credential.id },
      include: { user: true },
    });

    // Falls nicht gefunden, versuche mit rawId (falls vorhanden)
    if (!authenticator && credential.rawId) {
      debug.log('[Login] Trying with rawId:', credential.rawId);
      authenticator = await prisma.authenticator.findUnique({
        where: { credentialID: credential.rawId },
        include: { user: true },
      });
    }

    if (!authenticator) {
      const allAuthenticators = await prisma.authenticator.findMany({
        select: { credentialID: true },
      });
      debug.log(
        '[Login] Stored credential IDs:',
        allAuthenticators.map((a) => a.credentialID)
      );

      return NextResponse.json({ error: 'Passkey nicht gefunden' }, { status: 404 });
    }

    // Prüfen ob User freigegeben ist
    if (authenticator.user.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Dein Konto wurde noch nicht freigegeben' },
        { status: 403 }
      );
    }

    // Credential verifizieren
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: webauthnConfig.origin,
      expectedRPID: webauthnConfig.rpID,
      credential: {
        id: authenticator.credentialID,
        publicKey: Buffer.from(authenticator.credentialPublicKey, 'base64'),
        counter: authenticator.counter,
        transports: authenticator.transports?.split(',') as AuthenticatorTransport[] | undefined,
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return NextResponse.json({ error: 'Passkey-Verifizierung fehlgeschlagen' }, { status: 400 });
    }

    // Challenge löschen
    clearChallenge(challengeKey);

    // Counter aktualisieren und lastUsedAt setzen
    await prisma.authenticator.update({
      where: { id: authenticator.id },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    });

    await setSessionCookie(authenticator.user);

    return loginSuccessResponse(authenticator.user);
  } catch (error) {
    return loginErrorResponse(error, 'Login verify error');
  }
}
