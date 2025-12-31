import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';

import { GET, POST } from './route';

const mockUser = { userId: 'user-1', username: 'testuser', role: 'USER' as const, iat: Date.now() };
const mockAdmin = { userId: 'admin-1', username: 'admin', role: 'ADMIN' as const, iat: Date.now() };

const createMockRound = (overrides = {}) => ({
  id: 'round-1',
  title: 'Test Round',
  submissionDeadline: new Date('2025-12-01'),
  ratingDeadline: new Date('2025-12-15'),
  fulfillmentDate: new Date('2025-12-31'),
  resultsPublishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('GET /api/rounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns rounds when authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    const mockRounds = [
      createMockRound({ id: '1', title: 'Round 1' }),
      createMockRound({ id: '2', title: 'Round 2' }),
    ];
    vi.mocked(prisma.round.findMany).mockResolvedValue(mockRounds);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rounds).toHaveLength(2);
  });

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.round.findMany).mockRejectedValue(new Error('DB Error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Runden');
    consoleSpy.mockRestore();
  });
});

describe('POST /api/rounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/rounds', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when not admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/rounds', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns 400 for invalid input', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);

    const request = new NextRequest('http://localhost/api/rounds', {
      method: 'POST',
      body: JSON.stringify({ title: '' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('creates round when admin with valid data', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    const mockRound = createMockRound({ title: 'New Round' });
    vi.mocked(prisma.round.create).mockResolvedValue(mockRound);

    const request = new NextRequest('http://localhost/api/rounds', {
      method: 'POST',
      body: JSON.stringify({
        title: 'New Round',
        submissionDeadline: '2025-12-01',
        ratingDeadline: '2025-12-15',
        fulfillmentDate: '2025-12-31',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.round.id).toBe('round-1');
    expect(data.round.title).toBe('New Round');
    expect(sseEmitter.broadcast).toHaveBeenCalled();
  });

  it('returns 500 on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.round.create).mockRejectedValue(new Error('DB Error'));

    const request = new NextRequest('http://localhost/api/rounds', {
      method: 'POST',
      body: JSON.stringify({
        title: 'New Round',
        submissionDeadline: '2025-12-01',
        ratingDeadline: '2025-12-15',
        fulfillmentDate: '2025-12-31',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Erstellen der Runde');
    consoleSpy.mockRestore();
  });
});
