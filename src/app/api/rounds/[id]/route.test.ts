import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from './route';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session';
import { sseEmitter } from '@/lib/sse/event-emitter';

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

const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/rounds/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/rounds/1');
    const response = await GET(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when round not found', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.round.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/rounds/1');
    const response = await GET(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Runde nicht gefunden');
  });

  it('returns round when found', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    const mockRound = createMockRound({ id: '1', title: 'Round 1' });
    vi.mocked(prisma.round.findUnique).mockResolvedValue(mockRound);

    const request = new NextRequest('http://localhost/api/rounds/1');
    const response = await GET(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.round.id).toBe('1');
  });

  it('returns 500 on database error', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.round.findUnique).mockRejectedValue(new Error('DB Error'));

    const request = new NextRequest('http://localhost/api/rounds/1');
    const response = await GET(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Runde');
  });
});

describe('PUT /api/rounds/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/rounds/1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated' }),
    });

    const response = await PUT(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when not admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/rounds/1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated' }),
    });

    const response = await PUT(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns 400 for invalid input', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);

    const request = new NextRequest('http://localhost/api/rounds/1', {
      method: 'PUT',
      body: JSON.stringify({ title: '' }),
    });

    const response = await PUT(request, createParams('1'));

    expect(response.status).toBe(400);
  });

  it('updates round when admin with valid data', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    const mockRound = createMockRound({ id: '1', title: 'Updated Round' });
    vi.mocked(prisma.round.update).mockResolvedValue(mockRound);

    const request = new NextRequest('http://localhost/api/rounds/1', {
      method: 'PUT',
      body: JSON.stringify({
        title: 'Updated Round',
        submissionDeadline: '2025-12-01',
        ratingDeadline: '2025-12-15',
        fulfillmentDate: '2025-12-31',
      }),
    });

    const response = await PUT(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.round.id).toBe('1');
    expect(data.round.title).toBe('Updated Round');
    expect(sseEmitter.broadcast).toHaveBeenCalled();
  });

  it('returns 500 on database error', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.round.update).mockRejectedValue(new Error('DB Error'));

    const request = new NextRequest('http://localhost/api/rounds/1', {
      method: 'PUT',
      body: JSON.stringify({
        title: 'Updated Round',
        submissionDeadline: '2025-12-01',
        ratingDeadline: '2025-12-15',
        fulfillmentDate: '2025-12-31',
      }),
    });

    const response = await PUT(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Aktualisieren der Runde');
  });
});

describe('DELETE /api/rounds/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/rounds/1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when not admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost/api/rounds/1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('deletes round when admin', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.round.delete).mockResolvedValue(createMockRound({ id: '1' }));

    const request = new NextRequest('http://localhost/api/rounds/1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(sseEmitter.broadcast).toHaveBeenCalledWith({
      type: 'round:deleted',
      data: { id: '1' },
    });
  });

  it('returns 500 on database error', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdmin);
    vi.mocked(prisma.round.delete).mockRejectedValue(new Error('DB Error'));

    const request = new NextRequest('http://localhost/api/rounds/1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Löschen der Runde');
  });
});
