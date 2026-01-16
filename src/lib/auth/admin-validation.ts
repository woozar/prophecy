import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export interface ValidatedSession {
  userId: string;
  username: string;
  role: 'USER' | 'ADMIN';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

type ValidationResult =
  | { error: NextResponse; session?: never }
  | { error?: never; session: ValidatedSession };

/**
 * Validates the session and fetches the current role and status from the database.
 * This ensures role changes take effect immediately without requiring re-login.
 */
export async function validateSession(): Promise<ValidationResult> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, status: true },
  });

  if (!currentUser) {
    return { error: NextResponse.json({ error: 'User not found' }, { status: 401 }) };
  }

  if (currentUser.status !== 'APPROVED') {
    return { error: NextResponse.json({ error: 'Dein Account ist gesperrt' }, { status: 403 }) };
  }

  return {
    session: {
      userId: session.userId,
      username: session.username,
      role: currentUser.role as 'USER' | 'ADMIN',
      status: currentUser.status as 'PENDING' | 'APPROVED' | 'REJECTED',
    },
  };
}

/**
 * Validates that the session belongs to an admin user.
 * Fetches the current role from the database to ensure role changes take effect immediately.
 */
export async function validateAdminSession(): Promise<ValidationResult> {
  const validation = await validateSession();
  if (validation.error) return validation;

  if (validation.session.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return validation;
}
