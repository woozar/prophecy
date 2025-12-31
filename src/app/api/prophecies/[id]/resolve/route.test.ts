import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { validateAdminSession } from '@/lib/auth/admin-validation';
import { prisma } from '@/lib/db/prisma';
import { sseEmitter } from '@/lib/sse/event-emitter';

import { POST } from './route';

vi.mock('@/lib/auth/admin-validation', () => ({
  validateAdminSession: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    prophecy: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
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
  iat: Date.now(),
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

  it('returns 400 when rating deadline has not passed', async () => {
    vi.mocked(validateAdminSession).mockResolvedValue({ session: mockSession });
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(
      createMockProphecy({ round: { ratingDeadline: futureDate } }) as never
    );

    const request = new NextRequest('http://localhost/api/prophecies/1/resolve', {
      method: 'POST',
      body: JSON.stringify({ fulfilled: true }),
    });
    const response = await POST(request, createParams('1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Prophezeiungen können erst nach der Bewertungsphase aufgelöst werden');
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
});
