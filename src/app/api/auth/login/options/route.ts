import { NextRequest, NextResponse } from 'next/server';

import { generateAuthenticationOptions } from '@simplewebauthn/server';

import { storeChallenge, webauthnConfig } from '@/lib/auth/webauthn';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username } = body as { username?: string };

    // Wenn ein Username angegeben ist, holen wir die Authenticators des Users
    let allowCredentials: { id: string; transports?: AuthenticatorTransport[] }[] | undefined;
    let userId: string | undefined;

    if (username) {
      const user = await prisma.user.findUnique({
        where: { username: username.toLowerCase() },
        include: { authenticators: true },
      });

      if (!user) {
        return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
      }

      if (user.status !== 'APPROVED') {
        return NextResponse.json(
          { error: 'Dein Konto wurde noch nicht freigegeben' },
          { status: 403 }
        );
      }

      if (user.authenticators.length === 0) {
        return NextResponse.json(
          { error: 'Kein Passkey für diesen Benutzer registriert' },
          { status: 400 }
        );
      }

      userId = user.id;
      allowCredentials = user.authenticators.map((auth) => ({
        id: auth.credentialID,
        transports: auth.transports?.split(',') as AuthenticatorTransport[] | undefined,
      }));
    }

    // Authentication Options generieren
    const options = await generateAuthenticationOptions({
      rpID: webauthnConfig.rpID,
      timeout: webauthnConfig.timeout,
      allowCredentials,
      userVerification: 'preferred',
    });

    // Challenge speichern
    // Bei Discoverable Credentials (ohne Username) nutzen wir die Challenge selbst als Key
    const challengeKey = userId || `anon_${options.challenge}`;
    storeChallenge(challengeKey, options.challenge);

    return NextResponse.json({
      options,
      challengeKey,
    });
  } catch (error) {
    console.error('Login options error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Anmeldeoptionen' },
      { status: 500 }
    );
  }
}
