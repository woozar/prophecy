import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '@/lib/db/prisma';

import { AuditActions, auditEntityTypeSchema } from '../schemas/audit';
import { createAuditLog } from './audit-service';

describe('createAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates audit log with all parameters', async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValue({
      id: 'audit-1',
      entityType: auditEntityTypeSchema.enum.PROPHECY,
      entityId: 'prophecy-1',
      action: AuditActions.CREATE,
      prophecyId: 'prophecy-1',
      userId: 'user-1',
      oldValue: null,
      newValue: '{"title":"Test"}',
      context: 'Test context',
      createdAt: new Date(),
    });

    await createAuditLog({
      entityType: auditEntityTypeSchema.enum.PROPHECY,
      entityId: 'prophecy-1',
      action: 'CREATE',
      prophecyId: 'prophecy-1',
      userId: 'user-1',
      newValue: { title: 'Test' },
      context: 'Test context',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        entityType: auditEntityTypeSchema.enum.PROPHECY,
        entityId: 'prophecy-1',
        action: AuditActions.CREATE,
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
      entityType: auditEntityTypeSchema.enum.RATING,
      entityId: 'rating-1',
      action: AuditActions.UPDATE,
      prophecyId: 'prophecy-1',
      userId: 'user-1',
      oldValue: '{"value":-1}',
      newValue: '{"value":1}',
      context: null,
      createdAt: new Date(),
    });

    await createAuditLog({
      entityType: auditEntityTypeSchema.enum.RATING,
      entityId: 'rating-1',
      action: AuditActions.UPDATE,
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
      entityType: auditEntityTypeSchema.enum.PROPHECY,
      entityId: 'prophecy-1',
      action: AuditActions.DELETE,
      prophecyId: null,
      userId: 'user-1',
      oldValue: null,
      newValue: null,
      context: null,
      createdAt: new Date(),
    });

    await createAuditLog({
      entityType: auditEntityTypeSchema.enum.PROPHECY,
      entityId: 'prophecy-1',
      action: AuditActions.DELETE,
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
      entityType: auditEntityTypeSchema.enum.RATING,
      entityId: 'prophecy-1',
      action: AuditActions.BULK_DELETE,
      prophecyId: 'prophecy-1',
      userId: 'user-1',
      oldValue: '{"count":5}',
      newValue: null,
      context: 'Prophezeiung bearbeitet',
      createdAt: new Date(),
    });

    await createAuditLog({
      entityType: auditEntityTypeSchema.enum.RATING,
      entityId: 'prophecy-1',
      action: AuditActions.BULK_DELETE,
      prophecyId: 'prophecy-1',
      userId: 'user-1',
      oldValue: { count: 5 },
      context: 'Prophezeiung bearbeitet',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: AuditActions.BULK_DELETE,
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
        entityType: auditEntityTypeSchema.enum.PROPHECY,
        entityId: 'prophecy-1',
        action: AuditActions.CREATE,
        userId: 'user-1',
      })
    ).resolves.not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith('Failed to create audit log:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
