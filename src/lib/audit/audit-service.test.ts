import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db/prisma';

import { createAuditLog } from './audit-service';

describe('createAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates audit log with all parameters', async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue({
      id: 'audit-1',
      entityType: 'PROPHECY',
      entityId: 'prophecy-1',
      action: 'CREATE',
      prophecyId: 'prophecy-1',
      userId: 'user-1',
      oldValue: null,
      newValue: '{"title":"Test"}',
      context: 'Test context',
      createdAt: new Date(),
    });

    await createAuditLog({
      entityType: 'PROPHECY',
      entityId: 'prophecy-1',
      action: 'CREATE',
      prophecyId: 'prophecy-1',
      userId: 'user-1',
      newValue: { title: 'Test' },
      context: 'Test context',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        entityType: 'PROPHECY',
        entityId: 'prophecy-1',
        action: 'CREATE',
        prophecyId: 'prophecy-1',
        userId: 'user-1',
        oldValue: null,
        newValue: '{"title":"Test"}',
        context: 'Test context',
      },
    });
  });

  it('serializes oldValue and newValue as JSON', async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue({
      id: 'audit-1',
      entityType: 'RATING',
      entityId: 'rating-1',
      action: 'UPDATE',
      prophecyId: 'prophecy-1',
      userId: 'user-1',
      oldValue: '{"value":-1}',
      newValue: '{"value":1}',
      context: null,
      createdAt: new Date(),
    });

    await createAuditLog({
      entityType: 'RATING',
      entityId: 'rating-1',
      action: 'UPDATE',
      prophecyId: 'prophecy-1',
      userId: 'user-1',
      oldValue: { value: -1 },
      newValue: { value: 1 },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        oldValue: '{"value":-1}',
        newValue: '{"value":1}',
      }),
    });
  });

  it('handles undefined oldValue and newValue as null', async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue({
      id: 'audit-1',
      entityType: 'PROPHECY',
      entityId: 'prophecy-1',
      action: 'DELETE',
      prophecyId: null,
      userId: 'user-1',
      oldValue: null,
      newValue: null,
      context: null,
      createdAt: new Date(),
    });

    await createAuditLog({
      entityType: 'PROPHECY',
      entityId: 'prophecy-1',
      action: 'DELETE',
      userId: 'user-1',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        oldValue: null,
        newValue: null,
        prophecyId: undefined,
        context: undefined,
      }),
    });
  });

  it('logs BULK_DELETE action for rating resets', async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue({
      id: 'audit-1',
      entityType: 'RATING',
      entityId: 'prophecy-1',
      action: 'BULK_DELETE',
      prophecyId: 'prophecy-1',
      userId: 'user-1',
      oldValue: '{"count":5}',
      newValue: null,
      context: 'Prophezeiung bearbeitet',
      createdAt: new Date(),
    });

    await createAuditLog({
      entityType: 'RATING',
      entityId: 'prophecy-1',
      action: 'BULK_DELETE',
      prophecyId: 'prophecy-1',
      userId: 'user-1',
      oldValue: { count: 5 },
      context: 'Prophezeiung bearbeitet',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'BULK_DELETE',
        oldValue: '{"count":5}',
        context: 'Prophezeiung bearbeitet',
      }),
    });
  });

  it('does not throw on database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(prisma.auditLog.create).mockRejectedValue(new Error('DB Error'));

    await expect(
      createAuditLog({
        entityType: 'PROPHECY',
        entityId: 'prophecy-1',
        action: 'CREATE',
        userId: 'user-1',
      })
    ).resolves.not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith('Failed to create audit log:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
