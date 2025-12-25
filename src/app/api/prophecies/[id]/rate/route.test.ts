import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session';
import { sseEmitter } from '@/lib/sse/event-emitter';

const mockUser = { userId: 'user-1', username: 'testuser', role: 'USER' as const, iat: Date.now() };

const createMockProphecy = (overrides = {}) => ({
  id: 'prophecy-1',
  title: 'Test Prophecy',
  description: 'Test Description',
  roundId: 'round-1',
  creatorId: 'other-user',
  averageRating: null,
  ratingCount: 0,
  fulfilled: null,
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  round: {
    ratingDeadline: new Date(Date.now() + 86400000), // Tomorrow
  },
  creator: {
    id: 'other-user',
    username: 'otheruser',
    displayName: 'Other User',
  },
  ...overrides,
});

const createRouteParams = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe('POST /api/prophecies/[id]/rate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/rate', {
      method: 'POST',
      body: JSON.stringify({ value: 5 }),
    });
    const response = await POST(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 for invalid rating value (too low)', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/rate', {
      method: 'POST',
      body: JSON.stringify({ value: -11 }),
    });
    const response = await POST(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Bewertung muss zwischen -10 und +10 liegen');
  });

  it('returns 400 for invalid rating value (too high)', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/rate', {
      method: 'POST',
      body: JSON.stringify({ value: 11 }),
    });
    const response = await POST(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Bewertung muss zwischen -10 und +10 liegen');
  });

  it('returns 400 for non-numeric rating value', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/rate', {
      method: 'POST',
      body: JSON.stringify({ value: 'invalid' }),
    });
    const response = await POST(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Bewertung muss zwischen -10 und +10 liegen');
  });

  it('returns 404 when prophecy not found', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/rate', {
      method: 'POST',
      body: JSON.stringify({ value: 5 }),
    });
    const response = await POST(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Prophezeiung nicht gefunden');
  });

  it('returns 400 when rating own prophecy', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(
      createMockProphecy({ creatorId: 'user-1' })
    );

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/rate', {
      method: 'POST',
      body: JSON.stringify({ value: 5 }),
    });
    const response = await POST(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Du kannst deine eigene Prophezeiung nicht bewerten');
  });

  it('returns 400 when rating deadline passed', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(
      createMockProphecy({
        round: { ratingDeadline: new Date(Date.now() - 86400000) },
      })
    );

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/rate', {
      method: 'POST',
      body: JSON.stringify({ value: 5 }),
    });
    const response = await POST(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Bewertungsphase ist beendet');
  });

  it('creates rating successfully', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy());
    vi.mocked(prisma.rating.upsert).mockResolvedValue({
      id: 'rating-1',
      prophecyId: 'prophecy-1',
      userId: 'user-1',
      value: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.rating.findMany).mockResolvedValue([{ value: 5 }]);
    vi.mocked(prisma.prophecy.update).mockResolvedValue({
      ...createMockProphecy(),
      averageRating: 5,
      ratingCount: 1,
    });

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/rate', {
      method: 'POST',
      body: JSON.stringify({ value: 5 }),
    });
    const response = await POST(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.prophecy.userRating).toBe(5);
    expect(sseEmitter.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'prophecy:rated' })
    );
  });

  it('calculates average rating correctly', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy());
    vi.mocked(prisma.rating.upsert).mockResolvedValue({
      id: 'rating-1',
      prophecyId: 'prophecy-1',
      userId: 'user-1',
      value: 8,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.rating.findMany).mockResolvedValue([{ value: 8 }, { value: 4 }, { value: 6 }]);
    vi.mocked(prisma.prophecy.update).mockResolvedValue({
      ...createMockProphecy(),
      averageRating: 6,
      ratingCount: 3,
    });

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/rate', {
      method: 'POST',
      body: JSON.stringify({ value: 8 }),
    });
    const response = await POST(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.prophecy.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          averageRating: 6,
          ratingCount: 3,
        }),
      })
    );
  });

  it('returns 500 on database error', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockRejectedValue(new Error('DB Error'));

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/rate', {
      method: 'POST',
      body: JSON.stringify({ value: 5 }),
    });
    const response = await POST(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Bewerten der Prophezeiung');
  });
});
