import { NextResponse } from 'next/server';

import { type SessionUser, getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

type ValidationResult =
  | { error: NextResponse; session?: never }
  | { error?: never; session: SessionUser };

export async function validateAdminSession(): Promise<ValidationResult> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (session.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { status: true },
  });
  if (currentUser?.status !== 'APPROVED') {
    return { error: NextResponse.json({ error: 'Dein Account ist gesperrt' }, { status: 403 }) };
  }
  return { session };
}
