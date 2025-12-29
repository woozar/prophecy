import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';

import { DELETE, POST } from './route';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    round: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/sse/event-emitter', () => ({
  sseEmitter: {
    broadcast: vi.fn(),
  },
}));

const mockAdmin = { userId: 'admin-1', username: 'admin', role: 'ADMIN' as const, iat: Date.now() };
const mockUser = { userId: 'user-1', username: 'testuser', role: 'USER' as const, iat: Date.now() };

const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

const createMockRound = (overrides = {}) => ({
  id: 'round-1',
  title: 'Test Round',
  submissionDeadline: pastDate,
  ratingDeadline: pastDate,
  fulfillmentDate: pastDate,
  resultsPublishedAt: null,
  createdAt: pastDate,
  updatedAt: new Date(),
  ...overrides,
});

const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('POST /api/rounds/[id]/publish-results', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ status: 'APPROVED' } as never);
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/rounds/1/publish-results', {
      method: 'POST',
    });
    const response = await POST(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 for non-admin user', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/rounds/1/publish-results', {
      method: 'POST',
    });
    const response = await POST(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns 403 for blocked admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ status: 'BLOCKED' } as never);

    const request = new NextRequest('http://localhost/api/rounds/1/publish-results', {
      method: 'POST',
    });
    const response = await POST(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Dein Account ist gesperrt');
  });

  it('returns 404 when round not found', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.round.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/rounds/1/publish-results', {
      method: 'POST',
    });
    const response = await POST(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Runde nicht gefunden');
  });

  it('returns 400 when rating deadline has not passed', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.round.findUnique).mockResolvedValue(
      createMockRound({ ratingDeadline: futureDate })
    );

    const request = new NextRequest('http://localhost/api/rounds/1/publish-results', {
      method: 'POST',
    });
    const response = await POST(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      'Ergebnisse können erst nach der Bewertungsphase veröffentlicht werden'
    );
  });

  it('returns 400 when results already published', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.round.findUnique).mockResolvedValue(
      createMockRound({ resultsPublishedAt: pastDate })
    );

    const request = new NextRequest('http://localhost/api/rounds/1/publish-results', {
      method: 'POST',
    });
    const response = await POST(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ergebnisse wurden bereits veröffentlicht');
  });

  it('publishes results successfully', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.round.findUnique).mockResolvedValue(createMockRound());

    const now = new Date();
    const updatedRound = {
      ...createMockRound(),
      resultsPublishedAt: now,
    };
    vi.mocked(prisma.round.update).mockResolvedValue(updatedRound);

    const request = new NextRequest('http://localhost/api/rounds/1/publish-results', {
      method: 'POST',
    });
    const response = await POST(request, createParams('round-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.round).toBeDefined();
    expect(data.round.resultsPublishedAt).not.toBeNull();
    expect(prisma.round.update).toHaveBeenCalledWith({
      where: { id: 'round-1' },
      data: { resultsPublishedAt: expect.any(Date) },
    });
    expect(sseEmitter.broadcast).toHaveBeenCalledWith({
      type: 'round:updated',
      data: expect.objectContaining({ id: 'round-1' }),
    });
  });

  it('returns 500 on database error', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.round.findUnique).mockRejectedValue(new Error('DB Error'));

    const request = new NextRequest('http://localhost/api/rounds/1/publish-results', {
      method: 'POST',
    });
    const response = await POST(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Veröffentlichen der Ergebnisse');
  });
});

describe('DELETE /api/rounds/[id]/publish-results', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ status: 'APPROVED' } as never);
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/rounds/1/publish-results', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 for non-admin user', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/rounds/1/publish-results', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns 404 when round not found', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.round.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/rounds/1/publish-results', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Runde nicht gefunden');
  });

  it('returns 400 when results not published', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.round.findUnique).mockResolvedValue(createMockRound());

    const request = new NextRequest('http://localhost/api/rounds/1/publish-results', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ergebnisse sind nicht veröffentlicht');
  });

  it('unpublishes results successfully', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.round.findUnique).mockResolvedValue(
      createMockRound({ resultsPublishedAt: pastDate })
    );

    const updatedRound = {
      ...createMockRound(),
      resultsPublishedAt: null,
    };
    vi.mocked(prisma.round.update).mockResolvedValue(updatedRound);

    const request = new NextRequest('http://localhost/api/rounds/1/publish-results', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createParams('round-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.round).toBeDefined();
    expect(data.round.resultsPublishedAt).toBeNull();
    expect(prisma.round.update).toHaveBeenCalledWith({
      where: { id: 'round-1' },
      data: { resultsPublishedAt: null },
    });
    expect(sseEmitter.broadcast).toHaveBeenCalledWith({
      type: 'round:updated',
      data: expect.objectContaining({ id: 'round-1', resultsPublishedAt: null }),
    });
  });

  it('returns 500 on database error', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.round.findUnique).mockRejectedValue(new Error('DB Error'));

    const request = new NextRequest('http://localhost/api/rounds/1/publish-results', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Zurückziehen der Ergebnisse');
  });
});
