export async function register() {
  // Nur auf dem Server ausführen (nicht im Edge Runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { prisma } = await import('@/lib/db/prisma');
    const { ensureAdminExists, ensureBotsExist } = await import('@/lib/auth/admin-seed');

    // Warten bis DB-Verbindung steht
    try {
      await prisma.$connect();
      console.log('✓ Datenbankverbindung hergestellt');

      await ensureAdminExists();
      await ensureBotsExist();
    } catch (error) {
      console.error('Fehler bei der Initialisierung:', error);
    }
  }
}
