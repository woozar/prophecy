import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { randomBytes } from 'crypto';

export interface SessionUser {
  userId: string;
  username: string;
  role: 'USER' | 'ADMIN';
  iat: number;
}

interface LoginUser {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
}

/**
 * Get the session secret for JWT signing/verification.
 * Uses SESSION_SECRET from environment, or generates a random fallback with warning.
 */
function getSessionSecret(): Uint8Array {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
    return new TextEncoder().encode(process.env.SESSION_SECRET);
  }

  console.warn(
    '⚠️  WARNUNG: SESSION_SECRET nicht gesetzt oder zu kurz (<32 Zeichen).\n' +
      '   Verwende zufälliges Secret - Sessions werden nach App-Neustart ungültig!\n' +
      '   Setze SESSION_SECRET in der Umgebung für persistente Sessions.'
  );

  return new Uint8Array(randomBytes(32));
}

// Cache the secret to avoid regenerating on every call
let cachedSecret: Uint8Array | null = null;

function getSecret(): Uint8Array {
  if (!cachedSecret) {
    cachedSecret = getSessionSecret();
  }
  return cachedSecret;
}

// For testing: allow resetting the cached secret
export function resetSecretCache(): void {
  cachedSecret = null;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(sessionCookie.value, getSecret());
    return {
      userId: payload.userId as string,
      username: payload.username as string,
      role: payload.role as 'USER' | 'ADMIN',
      iat: payload.iat as number,
    };
  } catch {
    // Invalid or tampered token
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error('Nicht angemeldet');
  }
  return session;
}

/**
 * Set the session cookie after successful login
 */
export async function setSessionCookie(user: LoginUser) {
  const cookieStore = await cookies();

  const token = await new SignJWT({
    userId: user.id,
    username: user.username,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());

  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Create a success response for login
 */
export function loginSuccessResponse(user: LoginUser) {
  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    },
  });
}

/**
 * Create an error response for login failure
 */
export function loginErrorResponse(error: unknown, context: string) {
  console.error(`${context}:`, error);
  return NextResponse.json({ error: 'Fehler bei der Anmeldung' }, { status: 500 });
}
