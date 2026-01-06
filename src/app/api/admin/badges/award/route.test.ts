import { NextRequest } from 'next/server';

import { BadgeCategory, BadgeRarity } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE, POST } from './route';

const {
  mockValidateAdminSession,
  mockAwardBadge,
  mockUserFindUnique,
  mockBadgeFindUnique,
  mockUserBadgeFindUnique,
  mockUserBadgeDelete,
  mockBroadcast,
} = vi.hoisted(() => ({
  mockValidateAdminSession: vi.fn(),
  mockAwardBadge: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockBadgeFindUnique: vi.fn(),
  mockUserBadgeFindUnique: vi.fn(),
  mockUserBadgeDelete: vi.fn(),
  mockBroadcast: vi.fn(),
}));

vi.mock('@/lib/auth/admin-validation', () => ({
  validateAdminSession: mockValidateAdminSession,
}));

vi.mock('@/lib/badges/badge-service', () => ({
  awardBadge: mockAwardBadge,
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
    },
    badge: {
      findUnique: mockBadgeFindUnique,
    },
    userBadge: {
      findUnique: mockUserBadgeFindUnique,
      delete: mockUserBadgeDelete,
    },
  },
}));

vi.mock('@/lib/sse/event-emitter', () => ({
  sseEmitter: {
    broadcast: mockBroadcast,
  },
}));

const mockAdminSession = {
  userId: 'admin-1',
  username: 'admin',
  role: 'ADMIN' as const,
};

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
};

const mockAwardedBadge = {
  id: 'ub-1',
  badgeId: 'badge-1',
  userId: 'user-1',
  earnedAt: new Date('2025-01-15'),
  badge: {
    id: 'badge-1',
    key: 'hidden_bug_hunter',
    name: 'Bug-Hunter',
    description: 'Gefunden!',
    category: BadgeCategory.HIDDEN,
    rarity: BadgeRarity.GOLD,
    threshold: null,
  },
};

const createPostRequest = (body: object) =>
  new NextRequest('http://localhost/api/admin/badges/award', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });

const createDeleteRequest = (body: object) =>
  new NextRequest('http://localhost/api/admin/badges/award', {
    method: 'DELETE',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });

describe('POST /api/admin/badges/award', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateAdminSession.mockResolvedValue({ session: mockAdminSession });
  });

  it('returns 401 when not authenticated as admin', async () => {
    mockValidateAdminSession.mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    });

    const response = await POST(
      createPostRequest({ userId: 'user-1', badgeKey: 'hidden_bug_hunter' })
    );

    expect(response.status).toBe(401);
  });

  it('returns 400 when userId is missing', async () => {
    const response = await POST(createPostRequest({ badgeKey: 'hidden_bug_hunter' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('returns 400 when badgeKey is missing', async () => {
    const response = await POST(createPostRequest({ userId: 'user-1' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('returns 404 when user does not exist', async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const response = await POST(
      createPostRequest({ userId: 'nonexistent', badgeKey: 'hidden_bug_hunter' })
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Benutzer nicht gefunden');
  });

  it('returns 404 when badge does not exist', async () => {
    mockUserFindUnique.mockResolvedValue(mockUser);
    mockAwardBadge.mockResolvedValue(null);

    const response = await POST(
      createPostRequest({ userId: 'user-1', badgeKey: 'nonexistent_badge' })
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Badge nicht gefunden');
  });

  it('returns 200 with message when user already has the badge', async () => {
    mockUserFindUnique.mockResolvedValue(mockUser);
    mockAwardBadge.mockResolvedValue({ userBadge: mockAwardedBadge, isNew: false });

    const response = await POST(
      createPostRequest({ userId: 'user-1', badgeKey: 'hidden_bug_hunter' })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Benutzer hat dieses Badge bereits');
    expect(data.badge.key).toBe('hidden_bug_hunter');
    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it('awards badge successfully and broadcasts SSE event', async () => {
    mockUserFindUnique.mockResolvedValue(mockUser);
    mockAwardBadge.mockResolvedValue({ userBadge: mockAwardedBadge, isNew: true });

    const response = await POST(
      createPostRequest({ userId: 'user-1', badgeKey: 'hidden_bug_hunter' })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Badge erfolgreich vergeben');
    expect(data.userBadge.badge.key).toBe('hidden_bug_hunter');
    expect(mockBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'badge:awarded',
        data: expect.objectContaining({
          userId: 'user-1',
          badgeId: 'badge-1',
        }),
      })
    );
  });

  it('returns 500 on service error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUserFindUnique.mockResolvedValue(mockUser);
    mockAwardBadge.mockRejectedValue(new Error('Service error'));

    const response = await POST(
      createPostRequest({ userId: 'user-1', badgeKey: 'hidden_bug_hunter' })
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Vergeben des Badges');
    consoleSpy.mockRestore();
  });
});

describe('DELETE /api/admin/badges/award', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateAdminSession.mockResolvedValue({ session: mockAdminSession });
  });

  it('returns 401 when not authenticated as admin', async () => {
    mockValidateAdminSession.mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    });

    const response = await DELETE(
      createDeleteRequest({ userId: 'user-1', badgeKey: 'hidden_bug_hunter' })
    );

    expect(response.status).toBe(401);
  });

  it('returns 404 when badge does not exist', async () => {
    mockBadgeFindUnique.mockResolvedValue(null);

    const response = await DELETE(
      createDeleteRequest({ userId: 'user-1', badgeKey: 'nonexistent_badge' })
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Badge nicht gefunden');
  });

  it('returns 404 when user does not have the badge', async () => {
    mockBadgeFindUnique.mockResolvedValue({ id: 'badge-1', name: 'Bug-Hunter' });
    mockUserBadgeFindUnique.mockResolvedValue(null);

    const response = await DELETE(
      createDeleteRequest({ userId: 'user-1', badgeKey: 'hidden_bug_hunter' })
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Benutzer hat dieses Badge nicht');
  });

  it('removes badge successfully and broadcasts SSE event', async () => {
    mockBadgeFindUnique.mockResolvedValue({ id: 'badge-1', name: 'Bug-Hunter' });
    mockUserBadgeFindUnique.mockResolvedValue({ id: 'ub-1' });
    mockUserBadgeDelete.mockResolvedValue({});

    const response = await DELETE(
      createDeleteRequest({ userId: 'user-1', badgeKey: 'hidden_bug_hunter' })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toContain('Bug-Hunter');
    expect(mockUserBadgeDelete).toHaveBeenCalledWith({ where: { id: 'ub-1' } });
    expect(mockBroadcast).toHaveBeenCalledWith({
      type: 'badge:revoked',
      data: {
        userId: 'user-1',
        badgeId: 'badge-1',
        badgeKey: 'hidden_bug_hunter',
      },
    });
  });

  it('returns 500 on service error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockBadgeFindUnique.mockResolvedValue({ id: 'badge-1', name: 'Bug-Hunter' });
    mockUserBadgeFindUnique.mockRejectedValue(new Error('Service error'));

    const response = await DELETE(
      createDeleteRequest({ userId: 'user-1', badgeKey: 'hidden_bug_hunter' })
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Entfernen des Badges');
    consoleSpy.mockRestore();
  });
});
