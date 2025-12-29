import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSession } from '@/lib/auth/session';
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
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findMany).mockRejectedValue(new Error('DB Error'));

    const request = new NextRequest('http://localhost/api/prophecies?roundId=round-1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Prophezeiungen');
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
  });
});
