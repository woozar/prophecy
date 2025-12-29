import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  ensureInitialized: vi.fn(),
}));

vi.mock('@/lib/sse/event-emitter', () => ({
  sseEmitter: {
    broadcast: vi.fn(),
  },
}));

// Mock sharp
vi.mock('sharp', () => ({
  default: vi.fn().mockReturnValue({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed-image-data')),
  }),
}));

// Note: Mocking node:fs and node:fs/promises is complex with Vitest
// The filesystem operations are tested implicitly through integration tests
// Here we focus on validation and database interaction tests

import { POST, DELETE } from './route';

const mockUserFull = {
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
  passwordHash: null,
  forcePasswordChange: false,
  avatarUrl: null,
  avatarEffect: null,
  avatarEffectColors: null,
  role: 'USER',
  status: 'APPROVED',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('POST /api/users/me/avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const formData = new FormData();
    const request = new NextRequest('http://localhost/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Nicht angemeldet');
  });

  it('returns 400 when no file uploaded', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      username: 'testuser',
      role: 'USER',
      iat: Date.now(),
    });

    const formData = new FormData();
    const request = new NextRequest('http://localhost/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Keine Datei hochgeladen');
  });

  it('returns 400 for invalid file type', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      username: 'testuser',
      role: 'USER',
      iat: Date.now(),
    });

    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const formData = new FormData();
    formData.append('avatar', file);

    const request = new NextRequest('http://localhost/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ungültiger Dateityp. Erlaubt: JPEG, PNG, WebP, GIF');
  });

  it('returns 400 for file too large', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      username: 'testuser',
      role: 'USER',
      iat: Date.now(),
    });

    // Create a mock file larger than 5MB
    const largeContent = new ArrayBuffer(6 * 1024 * 1024);
    const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('avatar', file);

    const request = new NextRequest('http://localhost/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Datei zu groß. Maximum: 5MB');
  });

  it('rejects BMP image type', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      username: 'testuser',
      role: 'USER',
      iat: Date.now(),
    });

    const file = new File(['test'], 'test.bmp', { type: 'image/bmp' });
    const formData = new FormData();
    formData.append('avatar', file);

    const request = new NextRequest('http://localhost/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ungültiger Dateityp. Erlaubt: JPEG, PNG, WebP, GIF');
  });

  it('rejects SVG image type', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      username: 'testuser',
      role: 'USER',
      iat: Date.now(),
    });

    const file = new File(['<svg></svg>'], 'test.svg', { type: 'image/svg+xml' });
    const formData = new FormData();
    formData.append('avatar', file);

    const request = new NextRequest('http://localhost/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ungültiger Dateityp. Erlaubt: JPEG, PNG, WebP, GIF');
  });

  it('returns 500 when database error occurs during processing', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      username: 'testuser',
      role: 'USER',
      iat: Date.now(),
    });
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

    const file = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('avatar', file);

    const request = new NextRequest('http://localhost/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Hochladen des Avatars');
  });

  describe('allowed image types', () => {
    const allowedTypes = [
      { type: 'image/jpeg', ext: 'jpg' },
      { type: 'image/png', ext: 'png' },
      { type: 'image/webp', ext: 'webp' },
      { type: 'image/gif', ext: 'gif' },
    ];

    for (const { type, ext } of allowedTypes) {
      it(`accepts ${type} files`, async () => {
        vi.mocked(getSession).mockResolvedValue({
          userId: 'user-1',
          username: 'testuser',
          role: 'USER',
          iat: Date.now(),
        });
        // The request will fail at DB/filesystem level, but should pass validation
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserFull);

        const file = new File(['test-content'], `avatar.${ext}`, { type });
        const formData = new FormData();
        formData.append('avatar', file);

        const request = new NextRequest('http://localhost/api/users/me/avatar', {
          method: 'POST',
          body: formData,
        });
        const response = await POST(request);

        // If it passes validation, it will try to process - not get 400
        expect(response.status).not.toBe(400);
      });
    }
  });
});

describe('DELETE /api/users/me/avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await DELETE();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Nicht angemeldet');
  });

  it('succeeds when user has no avatar', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      username: 'testuser',
      role: 'USER',
      iat: Date.now(),
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserFull);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUserFull);

    const response = await DELETE();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { avatarUrl: null },
      select: expect.any(Object),
    });
    expect(sseEmitter.broadcast).toHaveBeenCalledWith({
      type: 'user:updated',
      data: mockUserFull,
    });
  });

  it('returns 500 when database error occurs', async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 'user-1',
      username: 'testuser',
      role: 'USER',
      iat: Date.now(),
    });
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

    const response = await DELETE();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Löschen des Avatars');
  });
});
