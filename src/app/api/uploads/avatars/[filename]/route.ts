import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const UPLOAD_DIR =
  process.env.NODE_ENV === 'production' ? '/app/uploads/avatars' : './uploads/avatars';

interface RouteParams {
  params: Promise<{ filename: string }>;
}

// GET: Avatar-Bild ausliefern
// Kein Auth-Check nötig: SHA-256 Hash-Dateinamen sind praktisch unmöglich zu erraten
// und Avatare sind keine sensiblen Daten
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { filename } = await params;

  // Validate filename (only allow SHA-256 hex hash with .webp extension)
  if (!/^[a-f0-9]{64}\.webp$/.test(filename)) {
    return NextResponse.json({ error: 'Ungültiger Dateiname' }, { status: 400 });
  }

  const filepath = path.join(UPLOAD_DIR, filename);

  if (!existsSync(filepath)) {
    return NextResponse.json({ error: 'Avatar nicht gefunden' }, { status: 404 });
  }

  try {
    const imageBuffer = await readFile(filepath);

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': imageBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error serving avatar:', error);
    return NextResponse.json({ error: 'Fehler beim Laden des Avatars' }, { status: 500 });
  }
}
