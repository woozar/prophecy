import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';

import { GET, PATCH } from './route';

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

describe('GET /api/users/me/preferences', () => {
  const mockSession = {
    userId: 'user-1',
    username: 'testuser',
    role: 'USER' as const,
    iat: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Nicht angemeldet');
  });

  it('returns 404 when user not found', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Benutzer nicht gefunden');
  });

  it('returns user preferences when authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      animationsEnabled: true,
    } as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.animationsEnabled).toBe(true);
  });

  it('returns animationsEnabled false when disabled', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      animationsEnabled: false,
    } as never);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.animationsEnabled).toBe(false);
  });

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('DB Error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Benutzereinstellungen');
    consoleSpy.mockRestore();
  });
});

describe('PATCH /api/users/me/preferences', () => {
  const mockSession = {
    userId: 'user-1',
    username: 'testuser',
    role: 'USER' as const,
    iat: Date.now(),
  };

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
    passwordHash: null,
    forcePasswordChange: false,
    avatarUrl: null,
    avatarEffect: null,
    avatarEffectColors: null,
    animationsEnabled: true,
    role: 'USER',
    status: 'APPROVED',
    isBot: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    badges: [] as { badgeId: string }[],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/users/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ animationsEnabled: false }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Nicht angemeldet');
  });

  it('updates animationsEnabled to false', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...mockUser,
      animationsEnabled: false,
    });

    const request = new NextRequest('http://localhost/api/users/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ animationsEnabled: false }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.animationsEnabled).toBe(false);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { animationsEnabled: false },
      select: expect.objectContaining({
        id: true,
        animationsEnabled: true,
      }),
    });
  });

  it('updates animationsEnabled to true', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...mockUser,
      animationsEnabled: true,
    });

    const request = new NextRequest('http://localhost/api/users/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ animationsEnabled: true }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.animationsEnabled).toBe(true);
  });

  it('broadcasts user:updated event on success', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...mockUser,
      animationsEnabled: false,
    });

    const request = new NextRequest('http://localhost/api/users/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ animationsEnabled: false }),
    });
    await PATCH(request);

    expect(sseEmitter.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'user:updated',
        data: expect.objectContaining({
          id: 'user-1',
          animationsEnabled: false,
        }),
      })
    );
  });

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.update).mockRejectedValue(new Error('DB Error'));

    const request = new NextRequest('http://localhost/api/users/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ animationsEnabled: false }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Aktualisieren der Benutzereinstellungen');
    consoleSpy.mockRestore();
  });

  it('returns 400 when animationsEnabled is not a boolean', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost/api/users/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ animationsEnabled: 'not-a-boolean' }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });
});
