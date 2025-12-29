import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  adminSeeded: boolean | undefined;
};

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Admin-Seeding beim ersten DB-Zugriff
export async function ensureInitialized(): Promise<void> {
  if (globalForPrisma.adminSeeded) return;
  globalForPrisma.adminSeeded = true;

  // Dynamischer Import um zirkuläre Abhängigkeiten zu vermeiden
  const { ensureAdminExists } = await import('@/lib/auth/admin-seed');
  await ensureAdminExists();
}
