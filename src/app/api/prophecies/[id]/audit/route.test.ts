import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

import { GET } from './route';

const mockUser = {
  userId: 'user-1',
  username: 'testuser',
  role: 'USER' as const,
  iat: Date.now(),
};

const createRouteParams = (id: string) => ({
  params: Promise.resolve({ id }),
});

const createMockProphecy = (id: string) =>
  ({
    id,
    title: 'Test Prophecy',
    description: 'Test description',
    createdAt: new Date(),
    updatedAt: new Date(),
    roundId: 'round-1',
    creatorId: 'user-1',
    fulfilled: null,
    resolvedAt: null,
    averageRating: null,
    ratingCount: 0,
  }) as const;

const createMockAuditLog = (overrides = {}) => ({
  id: 'audit-1',
  entityType: 'PROPHECY',
  entityId: 'prophecy-1',
  action: 'CREATE',
  prophecyId: 'prophecy-1',
  userId: 'user-1',
  oldValue: null,
  newValue: '{"title":"Test"}',
  context: null,
  createdAt: new Date('2025-01-15T10:00:00Z'),
  user: {
    id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
  },
  ...overrides,
});

describe('GET /api/prophecies/[id]/audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/audit');
    const response = await GET(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when prophecy not found', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/audit');
    const response = await GET(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Prophezeiung nicht gefunden');
  });

  it('returns audit logs for prophecy', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy('prophecy-1'));
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      createMockAuditLog(),
      createMockAuditLog({
        id: 'audit-2',
        action: 'UPDATE',
        oldValue: '{"title":"Test"}',
        newValue: '{"title":"Updated"}',
        createdAt: new Date('2025-01-15T11:00:00Z'),
      }),
    ]);

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/audit');
    const response = await GET(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.auditLogs).toHaveLength(2);
    expect(data.auditLogs[0]).toMatchObject({
      id: 'audit-1',
      entityType: 'PROPHECY',
      action: 'CREATE',
      user: {
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
      },
    });
  });

  it('returns audit logs sorted by createdAt descending', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy('prophecy-1'));
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/audit');
    await GET(request, createRouteParams('prophecy-1'));

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: { prophecyId: 'prophecy-1' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns empty array when no audit logs exist', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy('prophecy-1'));
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/audit');
    const response = await GET(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.auditLogs).toEqual([]);
  });

  it('includes rating audit logs', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy('prophecy-1'));
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      createMockAuditLog({
        id: 'audit-rating',
        entityType: 'RATING',
        entityId: 'rating-1',
        action: 'CREATE',
        newValue: '{"value":1}',
      }),
    ]);

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/audit');
    const response = await GET(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.auditLogs[0].entityType).toBe('RATING');
    expect(data.auditLogs[0].newValue).toBe('{"value":1}');
  });

  it('returns 500 on database error', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockRejectedValue(new Error('DB Error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/audit');
    const response = await GET(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden des Audit-Logs');
    consoleSpy.mockRestore();
  });

  it('converts createdAt to ISO string', async () => {
    vi.mocked(getSession).mockResolvedValue(mockUser);
    vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(createMockProphecy('prophecy-1'));
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([createMockAuditLog()]);

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/audit');
    const response = await GET(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(data.auditLogs[0].createdAt).toBe('2025-01-15T10:00:00.000Z');
  });
});
