import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { validateAdminSession } from '@/lib/auth/admin-validation';
import { prisma } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';

import { DELETE, POST } from './route';

vi.mock('@/lib/auth/admin-validation', () => ({
  validateAdminSession: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    prophecy: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    rating: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

const mockAwardBadge = vi.fn();
const mockCheckAndAwardBadges = vi.fn().mockResolvedValue([]);

vi.mock('@/lib/badges/badge-service', () => ({
  awardBadge: (...args: unknown[]) => mockAwardBadge(...args),
  checkAndAwardBadges: (...args: unknown[]) => mockCheckAndAwardBadges(...args),
}));

vi.mock('@/lib/sse/event-emitter', () => ({
  sseEmitter: {
    broadcast: vi.fn(),
  },
}));

const mockSession = {
  userId: 'admin-1',
  username: 'admin',
  role: 'ADMIN' as const,
  status: 'APPROVED' as const,
};
const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

const createMockProphecy = (overrides = {}) => ({
  id: 'prophecy-1',
  title: 'Test Prophecy',
  description: 'Description',
  creatorId: 'user-1',
  roundId: 'round-1',
  createdAt: pastDate,
  fulfilled: null,
  resolvedAt: null,
  averageRating: 3.5,
  ratingCount: 5,
  round: {
    id: 'round-1',
    ratingDeadline: pastDate,
  },
  ...overrides,
});

const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('POST /api/prophecies/[id]/resolve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAwardBadge.mockReset();
    mockCheckAndAwardBadges.mockResolvedValue([]);
  });

  it('returns admin validation error when not authorized', async () => {
    const mockError = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    vi.mocked(validateAdminSession).mockResolvedValue({ error: mockError as never });

    const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
      method: 'POST',
      body: JSON.stringify({ fulfilled: true }),
    });
    const response = await POST(request, createParams('1'));

    expect(response.status).toBe(401);
  });

  it('returns 400 when fulfilled is not a boolean', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });

    const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
      method: 'POST',
      body: JSON.stringify({ fulfilled: 'yes' }),
    });
    const response = await POST(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('boolean');
  });

  it('returns 404 when prophecy not found', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
      method: 'POST',
      body: JSON.stringify({ fulfilled: true }),
    });
    const response = await POST(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Prophezeiung nicht gefunden');
  });

  it('allows resolving before rating deadline has passed', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    const mockProphecy = createMockProphecy({ round: { ratingDeadline: futureDate } });
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(mockProphecy as never);
    vi.mocked(prisma.prophecy.update).mockResolvedValue({
      ...mockProphecy,
      fulfilled: true,
      resolvedAt: new Date(),
    } as never);

    const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
      method: 'POST',
      body: JSON.stringify({ fulfilled: true }),
    });
    const response = await POST(request, createParams('1'));

    expect(response.status).toBe(200);
  });

  it('resolves prophecy as fulfilled successfully', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy() as never);

    const now = new Date();
    const updatedProphecy = {
      ...createMockProphecy(),
      fulfilled: true,
      resolvedAt: now,
    };
    vi.mocked(prisma.prophecy.update).mockResolvedValue(updatedProphecy as never);

    const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
      method: 'POST',
      body: JSON.stringify({ fulfilled: true }),
    });
    const response = await POST(request, createParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.prophecy.fulfilled).toBe(true);
    expect(prisma.prophecy.update).toHaveBeenCalledWith({
      where: { id: 'prophecy-1' },
      data: { fulfilled: true, resolvedAt: expect.any(Date) },
    });
    expect(sseEmitter.broadcast).toHaveBeenCalledWith({
      type: 'prophecy:updated',
      data: expect.objectContaining({ id: 'prophecy-1', fulfilled: true }),
    });
  });

  it('resolves prophecy as not fulfilled successfully', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy() as never);

    const updatedProphecy = {
      ...createMockProphecy(),
      fulfilled: false,
      resolvedAt: new Date(),
    };
    vi.mocked(prisma.prophecy.update).mockResolvedValue(updatedProphecy as never);

    const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
      method: 'POST',
      body: JSON.stringify({ fulfilled: false }),
    });
    const response = await POST(request, createParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.prophecy.fulfilled).toBe(false);
  });

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.prophecy.findUnique).mockRejectedValue(new Error('DB Error'));

    const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
      method: 'POST',
      body: JSON.stringify({ fulfilled: true }),
    });
    const response = await POST(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Auflösen der Prophezeiung');
    consoleSpy.mockRestore();
  });

  describe('checkRatingPatternBadges', () => {
    it('awards special_controversial badge when ratings range from -10 to +10', async () => {
      vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
      vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy() as never);
      vi.mocked(prisma.prophecy.update).mockResolvedValue({
        ...createMockProphecy(),
        fulfilled: true,
        resolvedAt: new Date(),
      } as never);

      // Ratings from -10 to +10 (controversial)
      vi.mocked(prisma.rating.findMany).mockResolvedValue([
        { id: 'r1', value: -10, prophecyId: 'prophecy-1', userId: 'u1', user: { isBot: false } },
        { id: 'r2', value: 0, prophecyId: 'prophecy-1', userId: 'u2', user: { isBot: false } },
        { id: 'r3', value: 10, prophecyId: 'prophecy-1', userId: 'u3', user: { isBot: false } },
      ] as never);

      const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
        method: 'POST',
        body: JSON.stringify({ fulfilled: true }),
      });
      await POST(request, createParams('prophecy-1'));

      expect(mockAwardBadge).toHaveBeenCalledWith('user-1', 'special_controversial');
    });

    it('does not award special_controversial badge when ratings dont span full range', async () => {
      vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
      vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy() as never);
      vi.mocked(prisma.prophecy.update).mockResolvedValue({
        ...createMockProphecy(),
        fulfilled: true,
        resolvedAt: new Date(),
      } as never);

      // Ratings only from -5 to +5 (not controversial enough)
      vi.mocked(prisma.rating.findMany).mockResolvedValue([
        { id: 'r1', value: -5, prophecyId: 'prophecy-1', userId: 'u1', user: { isBot: false } },
        { id: 'r2', value: 0, prophecyId: 'prophecy-1', userId: 'u2', user: { isBot: false } },
        { id: 'r3', value: 5, prophecyId: 'prophecy-1', userId: 'u3', user: { isBot: false } },
      ] as never);

      const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
        method: 'POST',
        body: JSON.stringify({ fulfilled: true }),
      });
      await POST(request, createParams('prophecy-1'));

      expect(mockAwardBadge).not.toHaveBeenCalledWith('user-1', 'special_controversial');
    });

    it('awards special_unanimous badge when >5 ratings with spread ≤ 4', async () => {
      vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
      vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy() as never);
      vi.mocked(prisma.prophecy.update).mockResolvedValue({
        ...createMockProphecy(),
        fulfilled: true,
        resolvedAt: new Date(),
      } as never);

      // 6 ratings all between 6 and 8 (spread = 2, which is ≤ 4)
      vi.mocked(prisma.rating.findMany).mockResolvedValue([
        { id: 'r1', value: 6, prophecyId: 'prophecy-1', userId: 'u1', user: { isBot: false } },
        { id: 'r2', value: 7, prophecyId: 'prophecy-1', userId: 'u2', user: { isBot: false } },
        { id: 'r3', value: 8, prophecyId: 'prophecy-1', userId: 'u3', user: { isBot: false } },
        { id: 'r4', value: 7, prophecyId: 'prophecy-1', userId: 'u4', user: { isBot: false } },
        { id: 'r5', value: 6, prophecyId: 'prophecy-1', userId: 'u5', user: { isBot: false } },
        { id: 'r6', value: 7, prophecyId: 'prophecy-1', userId: 'u6', user: { isBot: false } },
      ] as never);

      const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
        method: 'POST',
        body: JSON.stringify({ fulfilled: true }),
      });
      await POST(request, createParams('prophecy-1'));

      expect(mockAwardBadge).toHaveBeenCalledWith('user-1', 'special_unanimous');
    });

    it('does not award special_unanimous badge when spread > 4', async () => {
      vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
      vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy() as never);
      vi.mocked(prisma.prophecy.update).mockResolvedValue({
        ...createMockProphecy(),
        fulfilled: true,
        resolvedAt: new Date(),
      } as never);

      // 6 ratings but spread = 6 (too wide)
      vi.mocked(prisma.rating.findMany).mockResolvedValue([
        { id: 'r1', value: 2, prophecyId: 'prophecy-1', userId: 'u1', user: { isBot: false } },
        { id: 'r2', value: 4, prophecyId: 'prophecy-1', userId: 'u2', user: { isBot: false } },
        { id: 'r3', value: 8, prophecyId: 'prophecy-1', userId: 'u3', user: { isBot: false } },
        { id: 'r4', value: 5, prophecyId: 'prophecy-1', userId: 'u4', user: { isBot: false } },
        { id: 'r5', value: 3, prophecyId: 'prophecy-1', userId: 'u5', user: { isBot: false } },
        { id: 'r6', value: 6, prophecyId: 'prophecy-1', userId: 'u6', user: { isBot: false } },
      ] as never);

      const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
        method: 'POST',
        body: JSON.stringify({ fulfilled: true }),
      });
      await POST(request, createParams('prophecy-1'));

      expect(mockAwardBadge).not.toHaveBeenCalledWith('user-1', 'special_unanimous');
    });

    it('does not award special_unanimous badge when ≤5 ratings', async () => {
      vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
      vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy() as never);
      vi.mocked(prisma.prophecy.update).mockResolvedValue({
        ...createMockProphecy(),
        fulfilled: true,
        resolvedAt: new Date(),
      } as never);

      // Only 5 ratings (need more than 5)
      vi.mocked(prisma.rating.findMany).mockResolvedValue([
        { id: 'r1', value: 7, prophecyId: 'prophecy-1', userId: 'u1', user: { isBot: false } },
        { id: 'r2', value: 7, prophecyId: 'prophecy-1', userId: 'u2', user: { isBot: false } },
        { id: 'r3', value: 8, prophecyId: 'prophecy-1', userId: 'u3', user: { isBot: false } },
        { id: 'r4', value: 7, prophecyId: 'prophecy-1', userId: 'u4', user: { isBot: false } },
        { id: 'r5', value: 8, prophecyId: 'prophecy-1', userId: 'u5', user: { isBot: false } },
      ] as never);

      const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
        method: 'POST',
        body: JSON.stringify({ fulfilled: true }),
      });
      await POST(request, createParams('prophecy-1'));

      expect(mockAwardBadge).not.toHaveBeenCalledWith('user-1', 'special_unanimous');
    });

    it('ignores bot ratings when checking patterns', async () => {
      vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
      vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy() as never);
      vi.mocked(prisma.prophecy.update).mockResolvedValue({
        ...createMockProphecy(),
        fulfilled: true,
        resolvedAt: new Date(),
      } as never);

      // Bot ratings should be ignored - only 2 human ratings
      vi.mocked(prisma.rating.findMany).mockResolvedValue([
        { id: 'r1', value: -10, prophecyId: 'prophecy-1', userId: 'u1', user: { isBot: true } },
        { id: 'r2', value: 5, prophecyId: 'prophecy-1', userId: 'u2', user: { isBot: false } },
        { id: 'r3', value: 10, prophecyId: 'prophecy-1', userId: 'u3', user: { isBot: true } },
        { id: 'r4', value: 6, prophecyId: 'prophecy-1', userId: 'u4', user: { isBot: false } },
      ] as never);

      const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
        method: 'POST',
        body: JSON.stringify({ fulfilled: true }),
      });
      await POST(request, createParams('prophecy-1'));

      // Should not award controversial because human ratings only span 5-6
      expect(mockAwardBadge).not.toHaveBeenCalledWith('user-1', 'special_controversial');
    });

    it('broadcasts newly awarded badges via SSE', async () => {
      const mockBadge = {
        id: 'ub-1',
        earnedAt: new Date(),
        userId: 'user-1',
        badgeId: 'badge-1',
        badge: { id: 'badge-1', key: 'special_controversial', name: 'Kontrovers' },
      };
      mockAwardBadge.mockResolvedValue({ isNew: true, userBadge: mockBadge });

      vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
      vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy() as never);
      vi.mocked(prisma.prophecy.update).mockResolvedValue({
        ...createMockProphecy(),
        fulfilled: true,
        resolvedAt: new Date(),
      } as never);

      vi.mocked(prisma.rating.findMany).mockResolvedValue([
        { id: 'r1', value: -10, prophecyId: 'prophecy-1', userId: 'u1', user: { isBot: false } },
        { id: 'r2', value: 10, prophecyId: 'prophecy-1', userId: 'u2', user: { isBot: false } },
      ] as never);

      const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
        method: 'POST',
        body: JSON.stringify({ fulfilled: true }),
      });
      await POST(request, createParams('prophecy-1'));

      expect(sseEmitter.broadcast).toHaveBeenCalledWith({
        type: 'badge:awarded',
        data: expect.objectContaining({
          userId: 'user-1',
          badgeId: 'badge-1',
        }),
      });
    });
  });
});

describe('DELETE /api/prophecies/[id]/resolve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns admin validation error when not authorized', async () => {
    const mockError = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    vi.mocked(validateAdminSession).mockResolvedValue({ error: mockError as never });

    const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createParams('1'));

    expect(response.status).toBe(401);
  });

  it('returns 404 when prophecy not found', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Prophezeiung nicht gefunden');
  });

  it('returns 400 when prophecy is not resolved', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(
      createMockProphecy({ fulfilled: null }) as never
    );

    const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Prophezeiung ist nicht aufgelöst');
  });

  it('resets resolved prophecy successfully', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(
      createMockProphecy({ fulfilled: true, resolvedAt: new Date() }) as never
    );

    const resetProphecy = {
      ...createMockProphecy(),
      fulfilled: null,
      resolvedAt: null,
    };
    vi.mocked(prisma.prophecy.update).mockResolvedValue(resetProphecy as never);

    const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.prophecy.fulfilled).toBeNull();
    expect(prisma.prophecy.update).toHaveBeenCalledWith({
      where: { id: 'prophecy-1' },
      data: { fulfilled: null, resolvedAt: null },
    });
    expect(sseEmitter.broadcast).toHaveBeenCalledWith({
      type: 'prophecy:updated',
      data: expect.objectContaining({ id: 'prophecy-1', fulfilled: null }),
    });
  });

  it('resets unfulfilled prophecy successfully', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(
      createMockProphecy({ fulfilled: false, resolvedAt: new Date() }) as never
    );

    const resetProphecy = {
      ...createMockProphecy(),
      fulfilled: null,
      resolvedAt: null,
    };
    vi.mocked(prisma.prophecy.update).mockResolvedValue(resetProphecy as never);

    const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.prophecy.fulfilled).toBeNull();
  });

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.prophecy.findUnique).mockRejectedValue(new Error('DB Error'));

    const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Zurücksetzen der Auflösung');
    consoleSpy.mockRestore();
  });
});
