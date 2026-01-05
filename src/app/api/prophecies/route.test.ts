import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSession } from '@/lib/auth/session';
import { awardBadge, checkAndAwardBadges } from '@/lib/badges/badge-service';
import { prisma } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';

import { GET, POST } from './route';

const mockUser = { userId: 'user-1', username: 'testuser', role: 'USER' as const, iat: Date.now() };

const createMockProphecy = (overrides = {}) => ({
  id: 'prophecy-1',
  title: 'Test Prophecy',
  description: 'Test Description',
  roundId: 'round-1',
  creatorId: 'user-1',
  averageRating: null,
  ratingCount: 0,
  fulfilled: null,
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  creator: {
    id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
  },
  ratings: [],
  _count: { ratings: 0 },
  ...overrides,
});

const createMockRound = (overrides = {}) => ({
  id: 'round-1',
  title: 'Test Round',
  submissionDeadline: new Date(Date.now() + 86400000), // Tomorrow
  ratingDeadline: new Date(Date.now() + 172800000),
  fulfillmentDate: new Date(Date.now() + 259200000),
  resultsPublishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('GET /api/prophecies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/prophecies?roundId=round-1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when roundId is missing', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/prophecies');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('roundId ist erforderlich');
  });

  it('returns prophecies for a round', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    const mockProphecies = [createMockProphecy()];
    vi.mocked(prisma.prophecy.findMany).mockResolvedValue(mockProphecies);

    const request = new NextRequest('http://localhost/api/prophecies?roundId=round-1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.prophecies).toHaveLength(1);
    expect(data.prophecies[0].isOwn).toBe(true);
  });

  it('filters prophecies by "mine"', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findMany).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/prophecies?roundId=round-1&filter=mine');
    await GET(request);

    expect(prisma.prophecy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          roundId: 'round-1',
          creatorId: 'user-1',
        }),
      })
    );
  });

  it('filters prophecies by "toRate"', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findMany).mockResolvedValue([]);

    const request = new NextRequest(
      'http://localhost/api/prophecies?roundId=round-1&filter=toRate'
    );
    await GET(request);

    expect(prisma.prophecy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          roundId: 'round-1',
          creatorId: { not: 'user-1' },
          ratings: { none: { userId: 'user-1' } },
        }),
      })
    );
  });

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findMany).mockRejectedValue(new Error('DB Error'));

    const request = new NextRequest('http://localhost/api/prophecies?roundId=round-1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Prophezeiungen');
    consoleSpy.mockRestore();
  });
});

describe('POST /api/prophecies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/prophecies', {
      method: 'POST',
      body: JSON.stringify({ roundId: 'round-1', title: 'Test', description: 'Test' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 for invalid input', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/prophecies', {
      method: 'POST',
      body: JSON.stringify({ roundId: 'round-1', title: '', description: 'Test' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('returns 404 when round not found', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.round.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/prophecies', {
      method: 'POST',
      body: JSON.stringify({ roundId: 'round-1', title: 'Test Title', description: 'Test' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Runde nicht gefunden');
  });

  it('returns 400 when submission deadline passed', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.round.findUnique).mockResolvedValue(
      createMockRound({ submissionDeadline: new Date(Date.now() - 86400000) })
    );

    const request = new NextRequest('http://localhost/api/prophecies', {
      method: 'POST',
      body: JSON.stringify({ roundId: 'round-1', title: 'Test Title', description: 'Test' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Einreichungsfrist ist abgelaufen');
  });

  it('creates prophecy successfully', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.round.findUnique).mockResolvedValue(createMockRound());
    const mockProphecy = createMockProphecy({ title: 'New Prophecy' });
    vi.mocked(prisma.prophecy.create).mockResolvedValue(mockProphecy);

    const request = new NextRequest('http://localhost/api/prophecies', {
      method: 'POST',
      body: JSON.stringify({
        roundId: 'round-1',
        title: 'New Prophecy',
        description: 'Description',
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.prophecy.title).toBe('New Prophecy');
    expect(data.prophecy.creatorId).toBe('user-1');
    expect(sseEmitter.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'prophecy:created' })
    );
  });

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.round.findUnique).mockResolvedValue(createMockRound());
    vi.mocked(prisma.prophecy.create).mockRejectedValue(new Error('DB Error'));

    const request = new NextRequest('http://localhost/api/prophecies', {
      method: 'POST',
      body: JSON.stringify({ roundId: 'round-1', title: 'Test Title', description: 'Test' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Erstellen der Prophezeiung');
    consoleSpy.mockRestore();
  });

  it('awards novelist badge for long description (500+ chars)', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.round.findUnique).mockResolvedValue(createMockRound());
    const longDescription = 'A'.repeat(500);
    const mockProphecy = createMockProphecy({ description: longDescription });
    vi.mocked(prisma.prophecy.create).mockResolvedValue(mockProphecy);

    const request = new NextRequest('http://localhost/api/prophecies', {
      method: 'POST',
      body: JSON.stringify({
        roundId: 'round-1',
        title: 'New Prophecy',
        description: longDescription,
      }),
    });
    await POST(request);

    expect(awardBadge).toHaveBeenCalledWith('user-1', 'special_novelist');
  });

  it('does not award novelist badge for short description', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.round.findUnique).mockResolvedValue(createMockRound());
    const mockProphecy = createMockProphecy();
    vi.mocked(prisma.prophecy.create).mockResolvedValue(mockProphecy);

    const request = new NextRequest('http://localhost/api/prophecies', {
      method: 'POST',
      body: JSON.stringify({
        roundId: 'round-1',
        title: 'New Prophecy',
        description: 'Short description',
      }),
    });
    await POST(request);

    expect(awardBadge).not.toHaveBeenCalledWith('user-1', 'special_novelist');
  });

  it('awards last-minute badge when submitting within 24h of deadline', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    // Deadline is 12 hours from now (within 24h)
    vi.mocked(prisma.round.findUnique).mockResolvedValue(
      createMockRound({ submissionDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000) })
    );
    const mockProphecy = createMockProphecy();
    vi.mocked(prisma.prophecy.create).mockResolvedValue(mockProphecy);

    const request = new NextRequest('http://localhost/api/prophecies', {
      method: 'POST',
      body: JSON.stringify({
        roundId: 'round-1',
        title: 'Last Minute Prophecy',
        description: 'Test',
      }),
    });
    await POST(request);

    expect(awardBadge).toHaveBeenCalledWith('user-1', 'time_last_minute');
  });

  it('does not award last-minute badge when submitting more than 24h before deadline', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    // Deadline is 48 hours from now (more than 24h)
    vi.mocked(prisma.round.findUnique).mockResolvedValue(
      createMockRound({ submissionDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000) })
    );
    const mockProphecy = createMockProphecy();
    vi.mocked(prisma.prophecy.create).mockResolvedValue(mockProphecy);

    const request = new NextRequest('http://localhost/api/prophecies', {
      method: 'POST',
      body: JSON.stringify({
        roundId: 'round-1',
        title: 'Early Prophecy',
        description: 'Test',
      }),
    });
    await POST(request);

    expect(awardBadge).not.toHaveBeenCalledWith('user-1', 'time_last_minute');
  });

  it('broadcasts badge:awarded SSE event when new badge is earned', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.round.findUnique).mockResolvedValue(createMockRound());
    const mockProphecy = createMockProphecy();
    vi.mocked(prisma.prophecy.create).mockResolvedValue(mockProphecy);

    const mockBadge = {
      id: 'badge-1',
      key: 'test',
      name: 'Test Badge',
      icon: '🏆',
      description: 'Test',
      requirement: 'Test',
      category: 'CREATOR' as const,
      rarity: 'BRONZE' as const,
      threshold: 1,
      createdAt: new Date(),
    };

    // Mock checkAndAwardBadges returning a new badge
    vi.mocked(checkAndAwardBadges).mockResolvedValue([
      {
        id: 'ub-1',
        earnedAt: new Date(),
        userId: 'user-1',
        badgeId: 'badge-1',
        badge: mockBadge,
      },
    ]);

    const request = new NextRequest('http://localhost/api/prophecies', {
      method: 'POST',
      body: JSON.stringify({
        roundId: 'round-1',
        title: 'New Prophecy',
        description: 'Test',
      }),
    });
    await POST(request);

    expect(sseEmitter.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'badge:awarded',
        data: expect.objectContaining({
          userId: 'user-1',
          badgeId: 'badge-1',
        }),
      })
    );
  });
});
