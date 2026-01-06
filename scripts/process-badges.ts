/**
 * Badge Image Processor
 *
 * Verarbeitet Badge-PNG-Dateien für die Produktion:
 * 1. Entfernt transparente Ränder (trim)
 * 2. Skaliert auf 256x256 ohne Verzerrung (contain)
 * 3. Konvertiert zu WebP (90% Qualität)
 *
 * Verwendung:
 *   1. PNG-Dateien in public/badges/ ablegen
 *   2. Script ausführen: npx tsx scripts/process-badges.ts
 *   3. WebP-Dateien werden neben den PNGs erstellt
 *
 * Hinweis:
 *   Die Original-PNGs bleiben erhalten.
 *   Die App verwendet die WebP-Dateien via BadgeIcon-Komponente.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function processBadges() {
  const badgesDir = path.join(process.cwd(), 'public/badges');
  const pngFiles = fs.readdirSync(badgesDir).filter((f) => f.endsWith('.png'));

  if (pngFiles.length === 0) {
    console.log('Keine PNG-Dateien in public/badges/ gefunden.');
    return;
  }

  console.log(`${pngFiles.length} Badge(s) gefunden. Verarbeite...`);

  for (const file of pngFiles) {
    const inputPath = path.join(badgesDir, file);
    const outputPath = path.join(badgesDir, file.replace('.png', '.webp'));

    try {
      // Bild laden und trimmen
      const trimmed = await sharp(inputPath)
        .trim() // Entfernt transparente Ränder
        .toBuffer();

      // Metadata des getrimmten Bildes holen
      const metadata = await sharp(trimmed).metadata();
      const { width, height } = metadata;

      // Auf 256x256 skalieren ohne Verzerrung
      await sharp(trimmed)
        .resize(256, 256, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({ quality: 90 })
        .toFile(outputPath);

      console.log(`✓ ${file} → ${path.basename(outputPath)} (${width}x${height} → 256x256)`);
    } catch (error) {
      console.error(`✗ ${file}: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log('Fertig!');
}

processBadges();
