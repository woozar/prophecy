import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

interface UserResponse {
  id: string;
  username: string;
  displayName: string | null;
  status: string;
}

/**
 * Check if a username is already taken
 * @returns The existing user if found, null otherwise
 */
export async function findExistingUser(username: string) {
  const normalizedUsername = username.toLowerCase().replaceAll(/[^a-z0-9_-]/g, "");
  return prisma.user.findUnique({
    where: { username: normalizedUsername },
  });
}

/**
 * Normalize a username (lowercase, remove special characters)
 */
export function normalizeUsername(username: string): string {
  return username.toLowerCase().replaceAll(/[^a-z0-9_-]/g, "");
}

/**
 * Return a 409 response for duplicate username
 */
export function duplicateUsernameResponse() {
  return NextResponse.json(
    { error: "Dieser Benutzername ist bereits vergeben" },
    { status: 409 }
  );
}

/**
 * Set the pending user cookie after registration
 */
export async function setPendingUserCookie(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set("pendingUser", userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  });
}

/**
 * Create a success response for registration
 */
export function registrationSuccessResponse(user: UserResponse) {
  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      status: user.status,
    },
  });
}

/**
 * Create an error response for registration failure
 */
export function registrationErrorResponse(error: unknown, context: string) {
  console.error(`${context}:`, error);
  return NextResponse.json(
    { error: "Fehler bei der Registrierung" },
    { status: 500 }
  );
}
