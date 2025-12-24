import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PUT, DELETE } from './route';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session';
import { sseEmitter } from '@/lib/sse/event-emitter';

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
  round: {
    submissionDeadline: new Date(Date.now() + 86400000), // Tomorrow
  },
  creator: {
    id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
  },
  ...overrides,
});

const createRouteParams = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe('PUT /api/prophecies/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated', description: 'Updated' }),
    });
    const response = await PUT(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when prophecy not found', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated', description: 'Updated' }),
    });
    const response = await PUT(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(404);
  });

  it('returns 403 when user does not own prophecy', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(
      createMockProphecy({ creatorId: 'other-user' })
    );

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated', description: 'Updated' }),
    });
    const response = await PUT(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(403);
  });

  it('returns 400 when submission deadline passed', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(
      createMockProphecy({
        round: { submissionDeadline: new Date(Date.now() - 86400000) },
      })
    );

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated', description: 'Updated' }),
    });
    const response = await PUT(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Bearbeiten nicht mehr möglich');
  });

  it('updates prophecy successfully and deletes ratings', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy());
    vi.mocked(prisma.rating.deleteMany).mockResolvedValue({ count: 2 });
    vi.mocked(prisma.prophecy.update).mockResolvedValue(
      createMockProphecy({ title: 'Updated Title', averageRating: null, ratingCount: 0 })
    );

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated Title', description: 'Updated' }),
    });
    const response = await PUT(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.prophecy.title).toBe('Updated Title');
    expect(prisma.rating.deleteMany).toHaveBeenCalledWith({
      where: { prophecyId: 'prophecy-1' },
    });
    expect(sseEmitter.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'prophecy:updated' })
    );
  });

  it('returns 400 for invalid input', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy());

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'PUT',
      body: JSON.stringify({ title: '', description: 'Updated' }),
    });
    const response = await PUT(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/prophecies/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when prophecy not found', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(404);
  });

  it('returns 403 when user does not own prophecy', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(
      createMockProphecy({ creatorId: 'other-user' })
    );

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(403);
  });

  it('returns 400 when submission deadline passed', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(
      createMockProphecy({
        round: { submissionDeadline: new Date(Date.now() - 86400000) },
      })
    );

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Löschen nicht mehr möglich');
  });

  it('deletes prophecy successfully', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy());
    vi.mocked(prisma.prophecy.delete).mockResolvedValue(createMockProphecy());

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(sseEmitter.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'prophecy:deleted' })
    );
  });
});
