import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma, ensureInitialized } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';
import sharp from 'sharp';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const UPLOAD_DIR =
  process.env.NODE_ENV === 'production' ? '/app/uploads/avatars' : './uploads/avatars';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// POST: Avatar hochladen
export async function POST(request: NextRequest) {
  await ensureInitialized();

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Ungültiger Dateityp. Erlaubt: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Datei zu groß. Maximum: 5MB' }, { status: 400 });
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Process image with sharp
    const buffer = Buffer.from(await file.arrayBuffer());
    const processedImage = await sharp(buffer)
      .resize(256, 256, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 85 })
      .toBuffer();

    // Generate SHA-256 hash of the processed image for filename
    const hash = createHash('sha256').update(processedImage).digest('hex');
    const filename = `${hash}.webp`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Get current user to delete old avatar file
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { avatarUrl: true },
    });

    // Delete old avatar file if it exists and is different
    if (currentUser?.avatarUrl) {
      const oldFilename = currentUser.avatarUrl.split('/').pop();
      if (oldFilename && oldFilename !== filename) {
        const oldFilepath = path.join(UPLOAD_DIR, oldFilename);
        if (existsSync(oldFilepath)) {
          await unlink(oldFilepath);
        }
      }
    }

    // Save new avatar (only if file doesn't exist - same hash means same content)
    if (!existsSync(filepath)) {
      await writeFile(filepath, processedImage);
    }

    // Update database
    const avatarUrl = `/api/uploads/avatars/${filename}`;
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { avatarUrl },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        avatarEffect: true,
        avatarEffectColors: true,
        role: true,
        status: true,
      },
    });

    // Broadcast update
    sseEmitter.broadcast({
      type: 'user:updated',
      data: user,
    });

    return NextResponse.json({ success: true, avatarUrl });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ error: 'Fehler beim Hochladen des Avatars' }, { status: 500 });
  }
}

// DELETE: Avatar entfernen
export async function DELETE() {
  await ensureInitialized();

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  try {
    // Get current user to check for existing avatar
    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { avatarUrl: true },
    });

    if (currentUser?.avatarUrl) {
      // Delete file - extract filename from URL
      const filename = currentUser.avatarUrl.split('/').pop();
      if (filename) {
        const filepath = path.join(UPLOAD_DIR, filename);
        if (existsSync(filepath)) {
          await unlink(filepath);
        }
      }
    }

    // Update database
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { avatarUrl: null },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        avatarEffect: true,
        avatarEffectColors: true,
        role: true,
        status: true,
      },
    });

    // Broadcast update
    sseEmitter.broadcast({
      type: 'user:updated',
      data: user,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen des Avatars' }, { status: 500 });
  }
}
