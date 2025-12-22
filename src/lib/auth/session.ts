import { cookies } from "next/headers";

export interface SessionUser {
  userId: string;
  username: string;
  role: "USER" | "ADMIN";
  iat: number;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString());
    return session as SessionUser;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("Nicht angemeldet");
  }
  return session;
}
