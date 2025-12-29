import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';

import { PATCH } from './route';

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/sse/event-emitter', () => ({
  sseEmitter: {
    broadcast: vi.fn(),
  },
}));

describe('PATCH /api/users/me/avatar-settings', () => {
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
    avatarUrl: '/api/uploads/avatars/test.webp',
    avatarEffect: 'glow',
    avatarEffectColors: '["cyan","teal"]',
    role: 'USER',
    status: 'APPROVED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/users/me/avatar-settings', {
      method: 'PATCH',
      body: JSON.stringify({ avatarEffect: 'glow' }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Nicht angemeldet');
  });

  it('returns 400 for invalid effect', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost/api/users/me/avatar-settings', {
      method: 'PATCH',
      body: JSON.stringify({ avatarEffect: 'invalid-effect' }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid enum value');
  });

  it('returns 400 for invalid colors', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost/api/users/me/avatar-settings', {
      method: 'PATCH',
      body: JSON.stringify({ avatarEffectColors: ['invalid-color'] }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid enum value');
  });

  it('returns 400 when colors is not an array', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost/api/users/me/avatar-settings', {
      method: 'PATCH',
      body: JSON.stringify({ avatarEffectColors: 'cyan' }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Expected array');
  });

  it('updates avatar effect successfully', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/users/me/avatar-settings', {
      method: 'PATCH',
      body: JSON.stringify({ avatarEffect: 'particles' }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { avatarEffect: 'particles' },
      select: expect.any(Object),
    });
  });

  it('sets effect to null when effect is "none"', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, avatarEffect: null });

    const request = new NextRequest('http://localhost/api/users/me/avatar-settings', {
      method: 'PATCH',
      body: JSON.stringify({ avatarEffect: 'none' }),
    });
    await PATCH(request);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { avatarEffect: null },
      select: expect.any(Object),
    });
  });

  it('updates avatar colors successfully', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/users/me/avatar-settings', {
      method: 'PATCH',
      body: JSON.stringify({ avatarEffectColors: ['violet', 'emerald'] }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { avatarEffectColors: JSON.stringify(['violet', 'emerald']) },
      select: expect.any(Object),
    });
  });

  it('sets colors to null when empty array', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, avatarEffectColors: null });

    const request = new NextRequest('http://localhost/api/users/me/avatar-settings', {
      method: 'PATCH',
      body: JSON.stringify({ avatarEffectColors: [] }),
    });
    await PATCH(request);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { avatarEffectColors: null },
      select: expect.any(Object),
    });
  });

  it('updates both effect and colors', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/users/me/avatar-settings', {
      method: 'PATCH',
      body: JSON.stringify({ avatarEffect: 'lightning', avatarEffectColors: ['rose', 'amber'] }),
    });
    await PATCH(request);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        avatarEffect: 'lightning',
        avatarEffectColors: JSON.stringify(['rose', 'amber']),
      },
      select: expect.any(Object),
    });
  });

  it('broadcasts user update via SSE', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/users/me/avatar-settings', {
      method: 'PATCH',
      body: JSON.stringify({ avatarEffect: 'glow' }),
    });
    await PATCH(request);

    expect(sseEmitter.broadcast).toHaveBeenCalledWith({
      type: 'user:updated',
      data: mockUser,
    });
  });

  it('returns parsed colors in response', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/users/me/avatar-settings', {
      method: 'PATCH',
      body: JSON.stringify({ avatarEffect: 'glow' }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(data.avatarEffect).toBe('glow');
    expect(data.avatarEffectColors).toEqual(['cyan', 'teal']);
  });

  it('accepts all valid effects', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser);

    const validEffects = ['glow', 'particles', 'lightning', 'none'];

    for (const effect of validEffects) {
      const request = new NextRequest('http://localhost/api/users/me/avatar-settings', {
        method: 'PATCH',
        body: JSON.stringify({ avatarEffect: effect }),
      });
      const response = await PATCH(request);
      expect(response.status).toBe(200);
    }
  });

  it('accepts all valid colors', async () => {
    vi.mocked(getSession).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser);

    const validColors = ['cyan', 'teal', 'violet', 'emerald', 'rose', 'amber', 'blue', 'pink'];

    const request = new NextRequest('http://localhost/api/users/me/avatar-settings', {
      method: 'PATCH',
      body: JSON.stringify({ avatarEffectColors: validColors }),
    });
    const response = await PATCH(request);
    expect(response.status).toBe(200);
  });
});
