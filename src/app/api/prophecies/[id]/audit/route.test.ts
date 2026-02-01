import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { AuditActions, auditEntityTypeSchema } from '@/lib/schemas/audit';

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

// Create a mock prophecy with round info (ratingDeadline in the past by default)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockProphecy = (id: string, ratingDeadline = new Date('2020-01-01')): any => ({
  id,
  round: {
    ratingDeadline,
  },
});

const createMockAuditLog = (overrides = {}) => ({
  id: 'audit-1',
  entityType: auditEntityTypeSchema.enum.PROPHECY,
  entityId: 'prophecy-1',
  action: AuditActions.CREATE,
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
        action: AuditActions.UPDATE,
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
      entityType: auditEntityTypeSchema.enum.PROPHECY,
      action: AuditActions.CREATE,
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
        entityType: auditEntityTypeSchema.enum.RATING,
        entityId: 'rating-1',
        action: AuditActions.CREATE,
        newValue: '{"value":1}',
      }),
    ]);

    const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/audit');
    const response = await GET(request, createRouteParams('prophecy-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.auditLogs[0].entityType).toBe(auditEntityTypeSchema.enum.RATING);
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

  describe('rating value masking', () => {
    it('shows rating values when rating deadline has passed', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser);
      // Rating deadline in the past
      vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(
        createMockProphecy('prophecy-1', new Date('2020-01-01'))
      );
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
        createMockAuditLog({
          id: 'audit-rating',
          entityType: auditEntityTypeSchema.enum.RATING,
          entityId: 'rating-1',
          action: AuditActions.CREATE,
          newValue: '{"value":5,"userId":"user-2"}',
        }),
      ]);

      const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/audit');
      const response = await GET(request, createRouteParams('prophecy-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.auditLogs[0].newValue).toBe('{"value":5,"userId":"user-2"}');
    });

    it('masks rating values when rating deadline has not passed', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser);
      // Rating deadline in the future
      vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(
        createMockProphecy('prophecy-1', new Date('2099-01-01'))
      );
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
        createMockAuditLog({
          id: 'audit-rating',
          entityType: auditEntityTypeSchema.enum.RATING,
          entityId: 'rating-1',
          action: AuditActions.CREATE,
          newValue: '{"value":5,"userId":"user-2"}',
        }),
      ]);

      const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/audit');
      const response = await GET(request, createRouteParams('prophecy-1'));
      const data = await response.json();

      expect(response.status).toBe(200);
      // Value should be removed but userId preserved
      expect(data.auditLogs[0].newValue).toBe('{"userId":"user-2"}');
    });

    it('masks both oldValue and newValue for rating updates before deadline', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser);
      vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(
        createMockProphecy('prophecy-1', new Date('2099-01-01'))
      );
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
        createMockAuditLog({
          id: 'audit-rating',
          entityType: auditEntityTypeSchema.enum.RATING,
          entityId: 'rating-1',
          action: AuditActions.UPDATE,
          oldValue: '{"value":3}',
          newValue: '{"value":5}',
        }),
      ]);

      const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/audit');
      const response = await GET(request, createRouteParams('prophecy-1'));
      const data = await response.json();

      expect(data.auditLogs[0].oldValue).toBe('{}');
      expect(data.auditLogs[0].newValue).toBe('{}');
    });

    it('does not mask prophecy entries even before deadline', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser);
      vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(
        createMockProphecy('prophecy-1', new Date('2099-01-01'))
      );
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
        createMockAuditLog({
          entityType: auditEntityTypeSchema.enum.PROPHECY,
          action: AuditActions.UPDATE,
          oldValue: '{"title":"Old Title"}',
          newValue: '{"title":"New Title"}',
        }),
      ]);

      const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/audit');
      const response = await GET(request, createRouteParams('prophecy-1'));
      const data = await response.json();

      expect(data.auditLogs[0].oldValue).toBe('{"title":"Old Title"}');
      expect(data.auditLogs[0].newValue).toBe('{"title":"New Title"}');
    });

    it('masks values in bulk delete ratings array before deadline', async () => {
      vi.mocked(getSession).mockResolvedValue(mockUser);
      vi.mocked(prisma.prophecy.findUnique).mockResolvedValue(
        createMockProphecy('prophecy-1', new Date('2099-01-01'))
      );
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
        createMockAuditLog({
          entityType: auditEntityTypeSchema.enum.RATING,
          action: AuditActions.BULK_DELETE,
          oldValue:
            '{"count":2,"ratings":[{"id":"r1","value":3,"userId":"u1"},{"id":"r2","value":-2,"userId":"u2"}]}',
          newValue: null,
        }),
      ]);

      const request = new NextRequest('http://localhost/api/prophecies/prophecy-1/audit');
      const response = await GET(request, createRouteParams('prophecy-1'));
      const data = await response.json();

      const parsedOldValue = JSON.parse(data.auditLogs[0].oldValue);
      expect(parsedOldValue.count).toBe(2);
      expect(parsedOldValue.ratings[0]).toEqual({ id: 'r1', userId: 'u1' });
      expect(parsedOldValue.ratings[1]).toEqual({ id: 'r2', userId: 'u2' });
    });
  });
});
