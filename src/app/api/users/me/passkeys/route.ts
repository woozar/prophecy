import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import { prisma, ensureInitialized } from "@/lib/db/prisma";
import { webauthnConfig, storeChallenge, getChallenge, clearChallenge } from "@/lib/auth/webauthn";
import { cookies } from "next/headers";

// Session-Helper
async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
    return session;
  } catch {
    return null;
  }
}

// GET: Liste aller Passkeys des Users
export async function GET() {
  await ensureInitialized();

  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const authenticators = await prisma.authenticator.findMany({
    where: { userId: session.userId },
    select: {
      id: true,
      name: true,
      credentialDeviceType: true,
      credentialBackedUp: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ passkeys: authenticators });
}

// POST: Neuen Passkey hinzufügen - Step 1 (Options) oder Step 2 (Verify)
export async function POST(request: NextRequest) {
  await ensureInitialized();

  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = await request.json();

  // Step 1: Generate Options
  if (body.action === "options") {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { authenticators: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });
    }

    // Existierende Credentials ausschließen
    const excludeCredentials = user.authenticators.map((auth) => ({
      id: auth.credentialID,
      transports: auth.transports?.split(",") as AuthenticatorTransport[] | undefined,
    }));

    const options = await generateRegistrationOptions({
      rpName: webauthnConfig.rpName,
      rpID: webauthnConfig.rpID,
      userName: user.username,
      userDisplayName: user.displayName || user.username,
      excludeCredentials,
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      supportedAlgorithmIDs: [-7, -257],
      timeout: webauthnConfig.timeout,
    });

    storeChallenge(`passkey_${user.id}`, options.challenge);

    return NextResponse.json({ options });
  }

  // Step 2: Verify and store
  if (body.action === "verify") {
    const { credential, name } = body as {
      credential: RegistrationResponseJSON;
      name?: string;
    };

    if (!credential) {
      return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
    }

    const expectedChallenge = getChallenge(`passkey_${session.userId}`);
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: "Registrierung abgelaufen. Bitte erneut versuchen." },
        { status: 400 }
      );
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: webauthnConfig.origin,
      expectedRPID: webauthnConfig.rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: "Passkey-Verifizierung fehlgeschlagen" },
        { status: 400 }
      );
    }

    clearChallenge(`passkey_${session.userId}`);

    const { credential: credentialInfo, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    // Zähle existierende Passkeys für automatischen Namen
    const existingCount = await prisma.authenticator.count({
      where: { userId: session.userId },
    });

    const authenticator = await prisma.authenticator.create({
      data: {
        userId: session.userId,
        credentialID: credential.id, // Already base64url encoded from browser
        credentialPublicKey: Buffer.from(credentialInfo.publicKey).toString("base64"),
        counter: credentialInfo.counter,
        credentialDeviceType,
        credentialBackedUp,
        transports: credential.response.transports?.join(",") || null,
        name: name || `Passkey ${existingCount + 1}`,
      },
    });

    return NextResponse.json({
      success: true,
      passkey: {
        id: authenticator.id,
        name: authenticator.name,
        createdAt: authenticator.createdAt,
      },
    });
  }

  return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
}

// DELETE: Passkey löschen
export async function DELETE(request: NextRequest) {
  await ensureInitialized();

  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const passkeyId = searchParams.get("id");

  if (!passkeyId) {
    return NextResponse.json({ error: "Passkey-ID erforderlich" }, { status: 400 });
  }

  // Prüfen ob Passkey zum User gehört
  const authenticator = await prisma.authenticator.findFirst({
    where: {
      id: passkeyId,
      userId: session.userId,
    },
  });

  if (!authenticator) {
    return NextResponse.json({ error: "Passkey nicht gefunden" }, { status: 404 });
  }

  // Prüfen ob es der letzte Passkey ist UND kein Passwort gesetzt ist
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { authenticators: true },
  });

  if (user && user.authenticators.length === 1 && !user.passwordHash) {
    return NextResponse.json(
      { error: "Du kannst deinen letzten Passkey nicht löschen, wenn kein Passwort gesetzt ist." },
      { status: 400 }
    );
  }

  await prisma.authenticator.delete({
    where: { id: passkeyId },
  });

  return NextResponse.json({ success: true });
}

// PATCH: Passkey umbenennen
export async function PATCH(request: NextRequest) {
  await ensureInitialized();

  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = await request.json();
  const { id, name } = body as { id: string; name: string };

  if (!id || !name) {
    return NextResponse.json({ error: "ID und Name erforderlich" }, { status: 400 });
  }

  // Prüfen ob Passkey zum User gehört
  const authenticator = await prisma.authenticator.findFirst({
    where: {
      id,
      userId: session.userId,
    },
  });

  if (!authenticator) {
    return NextResponse.json({ error: "Passkey nicht gefunden" }, { status: 404 });
  }

  await prisma.authenticator.update({
    where: { id },
    data: { name },
  });

  return NextResponse.json({ success: true });
}
