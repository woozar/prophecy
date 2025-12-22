import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();

  // Session-Cookie löschen
  cookieStore.delete("session");
  cookieStore.delete("pendingUser");

  return NextResponse.json({ success: true });
}
