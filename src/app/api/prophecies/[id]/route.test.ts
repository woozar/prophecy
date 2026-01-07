import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuditLog } from '@/lib/audit/audit-service';
import { getSession } from '@/lib/auth/session';
import { awardBadge, awardContentCategoryBadges } from '@/lib/badges/badge-service';
import { prisma } from '@/lib/db/prisma';
import { AuditActions, auditEntityTypeSchema } from '@/lib/schemas/audit';
import { sseEmitter } from '@/lib/sse/event-emitter';

import { DELETE, PUT } from './route';

vi.mock('@/lib/audit/audit-service', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

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
    vi.mocked(prisma.rating.findMany).mockResolvedValue([
      {
        id: 'rating-1',
        value: 1,
        userId: 'user-2',
        prophecyId: 'prophecy-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'rating-2',
        value: -1,
        userId: 'user-3',
        prophecyId: 'prophecy-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
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
    expect(createAuditLog).toHaveBeenCalled();
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

    expect(response.status).toBe(400);
  });

  it('returns unchanged prophecy without side effects when nothing changed', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    const mockProphecy = createMockProphecy();
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(mockProphecy);

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Test Prophecy', description: 'Test Description' }),
    });
    const response = await PUT(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.prophecy.title).toBe('Test Prophecy');
    // Should NOT create audit log, delete ratings, or award badges
    expect(prisma.rating.deleteMany).not.toHaveBeenCalled();
    expect(createAuditLog).not.toHaveBeenCalled();
    expect(awardBadge).not.toHaveBeenCalled();
    expect(sseEmitter.broadcast).not.toHaveBeenCalled();
  });

  it('creates BULK_DELETE audit log when ratings are deleted', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy());
    vi.mocked(prisma.rating.findMany).mockResolvedValue([
      {
        id: 'r1',
        value: 1,
        userId: 'u2',
        prophecyId: 'prophecy-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'r2',
        value: -1,
        userId: 'u3',
        prophecyId: 'prophecy-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(prisma.rating.deleteMany).mockResolvedValue({ count: 2 });
    vi.mocked(prisma.prophecy.update).mockResolvedValue(createMockProphecy({ title: 'New' }));

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'New', description: 'Test Description' }),
    });
    await PUT(request, createRouteParams('prophecy-1'));

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: auditEntityTypeSchema.enum.RATING,
        action: AuditActions.BULK_DELETE,
        oldValue: expect.objectContaining({ count: 2 }),
        context: 'Prophezeiung wurde bearbeitet - alle Bewertungen zurückgesetzt',
      })
    );
  });

  it('creates UPDATE audit log with old and new values', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy());
    vi.mocked(prisma.rating.findMany).mockResolvedValue([]);
    vi.mocked(prisma.prophecy.update).mockResolvedValue(createMockProphecy({ title: 'New Title' }));

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'New Title', description: 'Test Description' }),
    });
    await PUT(request, createRouteParams('prophecy-1'));

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: auditEntityTypeSchema.enum.PROPHECY,
        action: AuditActions.UPDATE,
        oldValue: { title: 'Test Prophecy', description: 'Test Description' },
        newValue: { title: 'New Title', description: 'Test Description' },
      })
    );
  });

  it('awards perfectionist badge for editing prophecy', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy());
    vi.mocked(prisma.rating.findMany).mockResolvedValue([]);
    vi.mocked(prisma.prophecy.update).mockResolvedValue(createMockProphecy({ title: 'Updated' }));

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated', description: 'Test Description' }),
    });
    await PUT(request, createRouteParams('prophecy-1'));

    expect(awardBadge).toHaveBeenCalledWith('user-1', 'special_perfectionist');
  });

  it('broadcasts badge:awarded when perfectionist badge is new', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy());
    vi.mocked(prisma.rating.findMany).mockResolvedValue([]);
    vi.mocked(prisma.prophecy.update).mockResolvedValue(createMockProphecy({ title: 'Updated' }));
    vi.mocked(awardBadge).mockResolvedValue({
      isNew: true,
      userBadge: {
        id: 'ub-1',
        earnedAt: new Date(),
        userId: 'user-1',
        badgeId: 'badge-perf',
        badge: {
          id: 'badge-perf',
          key: 'perfectionist',
          name: 'Perfektionist',
          description: 'Test description',
          category: 'SPECIAL' as const,
          rarity: 'GOLD' as const,
          threshold: null,
        },
      },
    });

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated', description: 'Test Description' }),
    });
    await PUT(request, createRouteParams('prophecy-1'));

    expect(sseEmitter.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'badge:awarded',
        data: expect.objectContaining({ userId: 'user-1', badgeId: 'badge-perf' }),
      })
    );
  });

  it('calls content category analysis fire-and-forget', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy());
    vi.mocked(prisma.rating.findMany).mockResolvedValue([]);
    vi.mocked(prisma.prophecy.update).mockResolvedValue(createMockProphecy({ title: 'Sports' }));

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Sports', description: 'Test Description' }),
    });
    await PUT(request, createRouteParams('prophecy-1'));

    expect(awardContentCategoryBadges).toHaveBeenCalledWith('user-1', 'Sports', 'Test Description');
  });

  it('awards novelist badge for long description (500+ chars)', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy());
    vi.mocked(prisma.rating.findMany).mockResolvedValue([]);
    vi.mocked(prisma.rating.deleteMany).mockResolvedValue({ count: 0 });
    const longDescription = 'A'.repeat(500);
    vi.mocked(prisma.prophecy.update).mockResolvedValue(
      createMockProphecy({ description: longDescription })
    );

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated Title', description: longDescription }),
    });
    await PUT(request, createRouteParams('prophecy-1'));

    expect(awardBadge).toHaveBeenCalledWith('user-1', 'special_novelist');
  });

  it('does not award novelist badge for short description', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy());
    vi.mocked(prisma.rating.findMany).mockResolvedValue([]);
    vi.mocked(prisma.rating.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.prophecy.update).mockResolvedValue(createMockProphecy());

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated Title', description: 'Short' }),
    });
    await PUT(request, createRouteParams('prophecy-1'));

    expect(awardBadge).not.toHaveBeenCalledWith('user-1', 'special_novelist');
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

  it('creates DELETE audit log before deletion', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy());
    vi.mocked(prisma.prophecy.delete).mockResolvedValue(createMockProphecy());

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'DELETE',
    });
    await DELETE(request, createRouteParams('prophecy-1'));

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: auditEntityTypeSchema.enum.PROPHECY,
        action: AuditActions.DELETE,
        prophecyId: 'prophecy-1',
        oldValue: { title: 'Test Prophecy', description: 'Test Description' },
      })
    );
  });

  it('awards regret badge for deleting prophecy', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy());
    vi.mocked(prisma.prophecy.delete).mockResolvedValue(createMockProphecy());

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'DELETE',
    });
    await DELETE(request, createRouteParams('prophecy-1'));

    expect(awardBadge).toHaveBeenCalledWith('user-1', 'special_regret');
  });

  it('broadcasts badge:awarded when regret badge is new', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy());
    vi.mocked(prisma.prophecy.delete).mockResolvedValue(createMockProphecy());
    vi.mocked(awardBadge).mockResolvedValue({
      isNew: true,
      userBadge: {
        id: 'ub-2',
        earnedAt: new Date(),
        userId: 'user-1',
        badgeId: 'badge-regret',
        badge: {
          id: 'badge-regret',
          key: 'regret',
          name: 'Reue',
          description: 'Test description',
          category: 'SPECIAL' as const,
          rarity: 'BRONZE' as const,
          threshold: null,
        },
      },
    });

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'DELETE',
    });
    await DELETE(request, createRouteParams('prophecy-1'));

    expect(sseEmitter.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'badge:awarded',
        data: expect.objectContaining({ userId: 'user-1', badgeId: 'badge-regret' }),
      })
    );
  });

  it('broadcasts prophecy:deleted with id and roundId', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy());
    vi.mocked(prisma.prophecy.delete).mockResolvedValue(createMockProphecy());

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1', {
      method: 'DELETE',
    });
    await DELETE(request, createRouteParams('prophecy-1'));

    expect(sseEmitter.broadcast).toHaveBeenCalledWith({
      type: 'prophecy:deleted',
      data: { id: 'prophecy-1', roundId: 'round-1' },
    });
  });
});
