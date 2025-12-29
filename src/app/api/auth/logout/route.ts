import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const cookieStore = await cookies();

  // Session-Cookie löschen
  cookieStore.delete('session');
  cookieStore.delete('pendingUser');

  return NextResponse.json({ success: true });
}
