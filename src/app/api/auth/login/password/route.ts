import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma, ensureInitialized } from "@/lib/db/prisma";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  await ensureInitialized();

  try {
    const body = await request.json();
    const { username, password } = body as { username: string; password: string };

    if (!username || !password) {
      return NextResponse.json(
        { error: "Benutzername und Passwort erforderlich" },
        { status: 400 }
      );
    }

    // User suchen
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Benutzername oder Passwort falsch" },
        { status: 401 }
      );
    }

    // Prüfen ob User ein Passwort hat
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Kein Passwort gesetzt. Bitte mit Passkey anmelden." },
        { status: 400 }
      );
    }

    // Passwort prüfen
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Benutzername oder Passwort falsch" },
        { status: 401 }
      );
    }

    // Status prüfen
    if (user.status !== "APPROVED") {
      if (user.status === "PENDING") {
        return NextResponse.json(
          { error: "Dein Konto wurde noch nicht freigegeben" },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "Dein Konto ist gesperrt" },
        { status: 403 }
      );
    }

    // Session-Cookie setzen
    const cookieStore = await cookies();

    const sessionToken = Buffer.from(
      JSON.stringify({
        userId: user.id,
        username: user.username,
        role: user.role,
        iat: Date.now(),
      })
    ).toString("base64");

    cookieStore.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 Tage
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Password login error:", error);
    return NextResponse.json(
      { error: "Fehler bei der Anmeldung" },
      { status: 500 }
    );
  }
}
