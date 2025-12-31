import { prisma } from '@/lib/db/prisma';

export type AuditEntityType = 'RATING' | 'PROPHECY';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'BULK_DELETE';

export interface CreateAuditLogParams {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  prophecyId?: string;
  userId: string;
  oldValue?: unknown;
  newValue?: unknown;
  context?: string;
}

/**
 * Creates an audit log entry for tracking changes to entities.
 * This function is fire-and-forget - errors are logged but don't throw.
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        prophecyId: params.prophecyId,
        userId: params.userId,
        oldValue: params.oldValue !== undefined ? JSON.stringify(params.oldValue) : null,
        newValue: params.newValue !== undefined ? JSON.stringify(params.newValue) : null,
        context: params.context,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main operation
    console.error('Failed to create audit log:', error);
  }
}
