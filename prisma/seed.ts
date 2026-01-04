import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { Pool } from 'pg';

import { allBadgeDefinitions } from '../src/lib/badges/badge-definitions';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding badges...');

  for (const badge of allBadgeDefinitions) {
    await prisma.badge.upsert({
      where: { key: badge.key },
      update: {
        name: badge.name,
        description: badge.description,
        requirement: badge.requirement,
        icon: badge.icon,
        category: badge.category,
        rarity: badge.rarity,
        threshold: badge.threshold,
      },
      create: {
        key: badge.key,
        name: badge.name,
        description: badge.description,
        requirement: badge.requirement,
        icon: badge.icon,
        category: badge.category,
        rarity: badge.rarity,
        threshold: badge.threshold,
      },
    });
    console.log(`  ✓ ${badge.icon} ${badge.name}`);
  }

  console.log(`\nSeeded ${allBadgeDefinitions.length} badges.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
