import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { prisma, ensureInitialized } from "@/lib/db/prisma";
import { webauthnConfig, storeChallenge } from "@/lib/auth/webauthn";

export async function POST(request: NextRequest) {
  await ensureInitialized();

  try {
    const body = await request.json();
    const { username, displayName } = body;

    // Validierung
    if (!username || typeof username !== "string" || username.length < 3) {
      return NextResponse.json(
        { error: "Benutzername muss mindestens 3 Zeichen haben" },
        { status: 400 }
      );
    }

    // Prüfen ob Username bereits existiert
    const existingUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Dieser Benutzername ist bereits vergeben" },
        { status: 409 }
      );
    }

    // Temporäre User-ID für die Registration (wird später durch echte ID ersetzt)
    const tempUserId = `temp_${username.toLowerCase()}_${Date.now()}`;

    // Registration Options generieren
    const options = await generateRegistrationOptions({
      rpName: webauthnConfig.rpName,
      rpID: webauthnConfig.rpID,
      userName: username.toLowerCase(),
      userDisplayName: displayName || username,
      // Keine existierenden Authenticators - ist ja ein neuer User
      excludeCredentials: [],
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      supportedAlgorithmIDs: [-7, -257],
      timeout: webauthnConfig.timeout,
    });

    // Challenge speichern für die Verifizierung
    storeChallenge(tempUserId, options.challenge);

    return NextResponse.json({
      options,
      tempUserId,
      username: username.toLowerCase(),
      displayName: displayName || username,
    });
  } catch (error) {
    console.error("Registration options error:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Registrierungsoptionen" },
      { status: 500 }
    );
  }
}
