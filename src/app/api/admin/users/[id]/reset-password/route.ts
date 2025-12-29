import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { requireSession } from '@/lib/auth/session';

function generateRandomPassword(): string {
  // Generate a random 12-character password
  // Replace base64 special chars with 'x' for URL-safe password
  return randomBytes(9)
    .toString('base64')
    .replaceAll('+', 'x')
    .replaceAll('/', 'x')
    .replaceAll('=', 'x')
    .slice(0, 12);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();

    // Only admins can reset passwords
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 });
    }

    const { id } = await params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    // Generate new password
    const newPassword = generateRandomPassword();
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user with new password and force change flag
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        forcePasswordChange: true,
      },
    });

    // Return the new password so admin can share it with the user
    return NextResponse.json({
      success: true,
      newPassword,
      message: `Neues Passwort für ${user.username} wurde gesetzt. Der Benutzer muss es beim nächsten Login ändern.`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Nicht angemeldet') {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Fehler beim Zurücksetzen des Passworts' }, { status: 500 });
  }
}
