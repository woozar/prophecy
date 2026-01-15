import { NextRequest } from 'next/server';

import bcrypt from 'bcrypt';

import { validateBody } from '@/lib/api/validation';
import {
  duplicateUsernameResponse,
  findExistingUser,
  normalizeUsername,
  registrationErrorResponse,
  registrationSuccessResponse,
  setPendingUserCookie,
} from '@/lib/auth/registration';
import { ensureInitialized, prisma } from '@/lib/db/prisma';
import { registerPasswordSchema } from '@/lib/schemas/auth';
import { sseEmitter } from '@/lib/sse/event-emitter';

export async function POST(request: NextRequest) {
  await ensureInitialized();

  try {
    // Validate request body with Zod
    const validation = await validateBody(request, registerPasswordSchema);
    if (!validation.success) return validation.response;
    const { username, password, displayName } = validation.data;

    const normalizedUsername = normalizeUsername(username);

    // Prüfen ob Username bereits vergeben
    const existingUser = await findExistingUser(username);
    if (existingUser) {
      return duplicateUsernameResponse();
    }

    // Passwort hashen
    const passwordHash = await bcrypt.hash(password, 12);

    // User erstellen
    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        displayName: displayName || username,
        passwordHash,
        status: 'PENDING',
      },
    });

    // Notify admins via SSE about new user registration
    sseEmitter.broadcast({
      type: 'user:created',
      data: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
      },
    });

    await setPendingUserCookie(user.id);

    return registrationSuccessResponse(user);
  } catch (error) {
    return registrationErrorResponse(error, 'Password registration error');
  }
}
