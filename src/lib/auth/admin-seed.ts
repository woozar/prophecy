import bcrypt from 'bcrypt';
import { existsSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { prisma } from '@/lib/db/prisma';

const ADMIN_USERNAME = 'admin';

const UPLOAD_DIR =
  process.env.NODE_ENV === 'production' ? '/app/uploads/avatars' : './uploads/avatars';

const PUBLIC_DIR = process.env.NODE_ENV === 'production' ? '/app/public' : './public';

interface BotConfig {
  username: string;
  displayName: string;
  avatarEffect: string;
  avatarEffectColors: string;
  sourceAvatar?: string; // Filename in public/ folder
}

const BOT_USERS: BotConfig[] = [
  {
    username: 'randolf',
    displayName: 'Randolf der Zufällige',
    avatarEffect: 'particles',
    avatarEffectColors: JSON.stringify(['orange', 'amber']),
    sourceAvatar: 'randolf.webp',
  },
  {
    username: 'kimberly',
    displayName: 'Kimberly die Weise',
    avatarEffect: 'halo',
    avatarEffectColors: JSON.stringify(['pink', 'rose']),
    sourceAvatar: 'kimberly.webp',
  },
  {
    username: 'meanfred',
    displayName: 'Meanfred der Durchschnittliche',
    avatarEffect: 'lightning',
    avatarEffectColors: JSON.stringify(['green', 'emerald']),
    sourceAvatar: 'meanfred.webp',
  },
];

export async function ensureAdminExists(): Promise<void> {
  const adminPassword = process.env.ADMIN_PW;

  if (!adminPassword) {
    console.warn('⚠️  ADMIN_PW nicht gesetzt - kein Admin-User erstellt');
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
        displayName: 'Administrator',
        passwordHash,
        role: 'ADMIN',
        status: 'APPROVED',
      },
    });

    console.log('✓ Admin-User erstellt (username: admin)');
  } catch (error) {
    console.error('Fehler beim Erstellen des Admin-Users:', error);
  }
}

/**
 * Kopiert Bot-Avatar von public/ nach uploads/ und gibt die Avatar-URL zurück
 */
async function copyBotAvatar(bot: BotConfig): Promise<string | null> {
  if (!bot.sourceAvatar) {
    return null;
  }

  const sourcePath = path.join(PUBLIC_DIR, bot.sourceAvatar);
  const destFilename = `bot-${bot.username}${path.extname(bot.sourceAvatar)}`;
  const destPath = path.join(UPLOAD_DIR, destFilename);

  if (!existsSync(sourcePath)) {
    console.warn(`⚠️  Avatar-Datei nicht gefunden: ${sourcePath}`);
    return null;
  }

  try {
    // Uploads-Verzeichnis erstellen falls nicht vorhanden
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    await copyFile(sourcePath, destPath);
    return `/api/uploads/avatars/${destFilename}`;
  } catch (error) {
    console.error(`Fehler beim Kopieren von Avatar für ${bot.username}:`, error);
    return null;
  }
}

export async function ensureBotsExist(): Promise<void> {
  try {
    for (const bot of BOT_USERS) {
      const avatarUrl = await copyBotAvatar(bot);

      await prisma.user.upsert({
        where: { username: bot.username },
        update: {
          displayName: bot.displayName,
          avatarEffect: bot.avatarEffect,
          avatarEffectColors: bot.avatarEffectColors,
          isBot: true,
          status: 'APPROVED',
          ...(avatarUrl && { avatarUrl }),
        },
        create: {
          username: bot.username,
          displayName: bot.displayName,
          avatarEffect: bot.avatarEffect,
          avatarEffectColors: bot.avatarEffectColors,
          role: 'USER',
          status: 'APPROVED',
          isBot: true,
          ...(avatarUrl && { avatarUrl }),
        },
      });
    }
    console.log('✓ Bot-User erstellt (randolf, kimberly, meanfred)');
  } catch (error) {
    console.error('Fehler beim Erstellen der Bot-User:', error);
  }
}
