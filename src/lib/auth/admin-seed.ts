import bcrypt from "bcrypt";
import { prisma } from "@/lib/db/prisma";

const ADMIN_USERNAME = "admin";

export async function ensureAdminExists(): Promise<void> {
  const adminPassword = process.env.ADMIN_PW;

  if (!adminPassword) {
    console.warn("⚠️  ADMIN_PW nicht gesetzt - kein Admin-User erstellt");
    return;
  }

  try {
    // Prüfen ob Admin bereits existiert
    const existingAdmin = await prisma.user.findUnique({
      where: { username: ADMIN_USERNAME },
    });

    if (existingAdmin) {
      return;
    }

    // Admin erstellen
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await prisma.user.create({
      data: {
        username: ADMIN_USERNAME,
        displayName: "Administrator",
        passwordHash,
        role: "ADMIN",
        status: "APPROVED",
      },
    });

    console.log("✓ Admin-User erstellt (username: admin)");
  } catch (error) {
    console.error("Fehler beim Erstellen des Admin-Users:", error);
  }
}
