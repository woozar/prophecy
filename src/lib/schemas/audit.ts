import { z } from 'zod';

// Import common to ensure extendZodWithOpenApi is called
import './common';

// ============================================================================
// Audit Log Types
// ============================================================================

export const auditEntityTypeSchema = z.enum(['RATING', 'PROPHECY']).openapi('AuditEntityType');

export const auditActionSchema = z
  .enum(['CREATE', 'UPDATE', 'DELETE', 'BULK_DELETE'])
  .openapi('AuditAction');

// ============================================================================
// Audit Log User (embedded in response)
// ============================================================================

export const auditLogUserSchema = z
  .object({
    id: z.string(),
    username: z.string(),
    displayName: z.string().nullable(),
  })
  .openapi('AuditLogUser');

// ============================================================================
// Audit Log Entry
// ============================================================================

export const auditLogSchema = z
  .object({
    id: z.string(),
    entityType: auditEntityTypeSchema,
    entityId: z.string(),
    action: auditActionSchema,
    prophecyId: z.string().nullable(),
    userId: z.string(),
    oldValue: z.string().nullable(),
    newValue: z.string().nullable(),
    context: z.string().nullable(),
    createdAt: z.string().datetime(),
    user: auditLogUserSchema.optional(),
  })
  .openapi('AuditLog');

// ============================================================================
// API Response
// ============================================================================

export const auditLogsResponseSchema = z
  .object({
    auditLogs: z.array(auditLogSchema),
  })
  .openapi('AuditLogsResponse');

// ============================================================================
// Type Exports
// ============================================================================

export type AuditEntityType = z.infer<typeof auditEntityTypeSchema>;
export type AuditAction = z.infer<typeof auditActionSchema>;
export type AuditLogUser = z.infer<typeof auditLogUserSchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
export type AuditLogsResponse = z.infer<typeof auditLogsResponseSchema>;
