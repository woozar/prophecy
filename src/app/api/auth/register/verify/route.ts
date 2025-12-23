import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { prisma } from "@/lib/db/prisma";
import { webauthnConfig, getChallenge, clearChallenge } from "@/lib/auth/webauthn";
import { cookies } from "next/headers";

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
      return NextResponse.json(
        { error: "Ungültige Anfrage" },
        { status: 400 }
      );
    }

    // Challenge abrufen
    const expectedChallenge = getChallenge(tempUserId);
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: "Registrierung abgelaufen. Bitte erneut versuchen." },
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
      return NextResponse.json(
        { error: "Passkey-Verifizierung fehlgeschlagen" },
        { status: 400 }
      );
    }

    const { credential: credentialInfo, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    // Challenge löschen
    clearChallenge(tempUserId);

    // Prüfen ob Username mittlerweile vergeben wurde (Race Condition)
    const existingUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Dieser Benutzername ist bereits vergeben" },
        { status: 409 }
      );
    }

    // User und Authenticator in einer Transaktion erstellen
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        displayName: displayName || username,
        status: "PENDING", // Muss von Admin freigegeben werden
        authenticators: {
          create: {
            credentialID: credential.id, // Already base64url encoded from browser
            credentialPublicKey: Buffer.from(credentialInfo.publicKey).toString("base64"),
            counter: credentialInfo.counter,
            credentialDeviceType,
            credentialBackedUp,
            transports: credential.response.transports?.join(",") || null,
            name: "Mein Passkey",
          },
        },
      },
      include: {
        authenticators: true,
      },
    });

    // Session-Cookie setzen (für den Redirect nach Login)
    // Der User ist noch PENDING, aber wir merken uns, wer er ist
    const cookieStore = await cookies();
    cookieStore.set("pendingUser", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60, // 1 Stunde
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Registration verify error:", error);
    return NextResponse.json(
      { error: "Fehler bei der Registrierung" },
      { status: 500 }
    );
  }
}
