/**
 * Retroaktive Badge-Vergabe für bestehende Benutzer
 *
 * Dieses Script prüft alle bestehenden Benutzer und vergibt Badges
 * basierend auf ihren aktuellen Statistiken.
 *
 * Ausführen mit: npx tsx scripts/retroactive-badges.ts
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { Pool } from 'pg';

import { checkAndAwardBadges, seedBadges } from '../src/lib/badges/badge-service';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🏆 Retroaktive Badge-Vergabe\n');

  // Zuerst Badges seeden (falls noch nicht vorhanden)
  console.log('1. Synchronisiere Badge-Definitionen...');
  await seedBadges();

  // Alle aktiven Benutzer laden
  console.log('\n2. Lade Benutzer...');
  const users = await prisma.user.findMany({
    where: { status: 'APPROVED' },
    select: { id: true, username: true, displayName: true },
  });
  console.log(`   ${users.length} Benutzer gefunden\n`);

  // Badges für jeden Benutzer prüfen
  console.log('3. Prüfe und vergebe Badges...\n');
  let totalNewBadges = 0;

  for (const user of users) {
    const displayName = user.displayName || user.username;
    const newBadges = await checkAndAwardBadges(user.id);

    if (newBadges.length > 0) {
      console.log(`   ${displayName}: ${newBadges.length} neue Badges`);
      for (const badge of newBadges) {
        console.log(`      ✓ ${badge.badge.name}`);
      }
      totalNewBadges += newBadges.length;
    }
  }

  console.log(`\n✅ Fertig! ${totalNewBadges} Badges insgesamt vergeben.`);
}

main()
  .catch((e) => {
    console.error('Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
