import { NextResponse } from 'next/server';

import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

import { validateAdminSession } from '@/lib/auth/admin-validation';
import { prisma } from '@/lib/db/prisma';

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

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const validation = await validateAdminSession();
  if (validation.error) return validation.error;

  try {
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
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Fehler beim Zurücksetzen des Passworts' }, { status: 500 });
  }
}
