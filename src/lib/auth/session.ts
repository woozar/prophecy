import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
    return session as SessionUser;
  } catch {
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

  const sessionToken = Buffer.from(
    JSON.stringify({
      userId: user.id,
      username: user.username,
      role: user.role,
      iat: Date.now(),
    })
  ).toString('base64');

  cookieStore.set('session', sessionToken, {
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
