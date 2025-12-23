import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma, ensureInitialized } from "@/lib/db/prisma";
import { cookies } from "next/headers";

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
        { error: "Benutzername und Passwort erforderlich" },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: "Benutzername muss mindestens 3 Zeichen lang sein" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Passwort muss mindestens 8 Zeichen lang sein" },
        { status: 400 }
      );
    }

    const normalizedUsername = username.toLowerCase().replace(/[^a-z0-9_-]/g, "");

    // Prüfen ob Username bereits vergeben
    const existingUser = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Dieser Benutzername ist bereits vergeben" },
        { status: 409 }
      );
    }

    // Passwort hashen
    const passwordHash = await bcrypt.hash(password, 12);

    // User erstellen
    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        displayName: displayName || username,
        passwordHash,
        status: "PENDING", // Muss von Admin freigegeben werden
      },
    });

    // Session-Cookie setzen (für den Redirect nach Login)
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
    console.error("Password registration error:", error);
    return NextResponse.json(
      { error: "Fehler bei der Registrierung" },
      { status: 500 }
    );
  }
}
