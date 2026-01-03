import { z } from 'zod';

import {
  errorResponseSchema,
  successResponseSchema,
  userReferenceSchema,
} from '@/lib/schemas/common';
import {
  createProphecySchema,
  propheciesListResponseSchema,
  propheciesQuerySchema,
  prophecyDetailResponseSchema,
  updateProphecySchema,
} from '@/lib/schemas/prophecy';
import { rateSchema, ratingResponseSchema, resolveSchema } from '@/lib/schemas/rating';

import { registry } from '../registry';

// ============================================================================
// Audit Log Schemas
// ============================================================================

const auditLogEntityTypeSchema = z.enum(['RATING', 'PROPHECY']).openapi('AuditLogEntityType');

const auditLogActionSchema = z
  .enum(['CREATE', 'UPDATE', 'DELETE', 'BULK_DELETE'])
  .openapi('AuditLogAction');

const auditLogSchema = z
  .object({
    id: z.string(),
    entityType: auditLogEntityTypeSchema,
    entityId: z.string(),
    action: auditLogActionSchema,
    prophecyId: z.string().nullable(),
    userId: z.string(),
    oldValue: z.string().nullable(),
    newValue: z.string().nullable(),
    context: z.string().nullable(),
    createdAt: z.string().datetime(),
    user: userReferenceSchema.pick({ id: true, username: true, displayName: true }),
  })
  .openapi('AuditLog');

const auditLogsResponseSchema = z
  .object({
    auditLogs: z.array(auditLogSchema),
  })
  .openapi('AuditLogsResponse');

// ============================================================================
// List Prophecies
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/prophecies',
  tags: ['Prophecies'],
  summary: 'Get prophecies with optional filters',
  request: {
    query: propheciesQuerySchema,
  },
  responses: {
    200: {
      description: 'List of prophecies',
      content: { 'application/json': { schema: propheciesListResponseSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Create Prophecy
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/prophecies',
  tags: ['Prophecies'],
  summary: 'Create a new prophecy',
  request: {
    body: {
      content: {
        'application/json': { schema: createProphecySchema },
      },
    },
  },
  responses: {
    201: {
      description: 'Prophecy created',
      content: { 'application/json': { schema: prophecyDetailResponseSchema } },
    },
    400: {
      description: 'Validation error or submission deadline passed',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    404: {
      description: 'Round not found',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Update Prophecy
// ============================================================================

registry.registerPath({
  method: 'put',
  path: '/api/prophecies/{id}',
  tags: ['Prophecies'],
  summary: 'Update own prophecy',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Prophecy ID' }),
    }),
    body: {
      content: {
        'application/json': { schema: updateProphecySchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Prophecy updated',
      content: { 'application/json': { schema: prophecyDetailResponseSchema } },
    },
    400: {
      description: 'Validation error or submission deadline passed',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    403: {
      description: 'Not your prophecy',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    404: {
      description: 'Prophecy not found',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Delete Prophecy
// ============================================================================

registry.registerPath({
  method: 'delete',
  path: '/api/prophecies/{id}',
  tags: ['Prophecies'],
  summary: 'Delete own prophecy',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Prophecy ID' }),
    }),
  },
  responses: {
    200: {
      description: 'Prophecy deleted',
      content: { 'application/json': { schema: successResponseSchema } },
    },
    400: {
      description: 'Submission deadline passed',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    403: {
      description: 'Not your prophecy',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    404: {
      description: 'Prophecy not found',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Rate Prophecy
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/prophecies/{id}/rate',
  tags: ['Prophecies'],
  summary: 'Rate a prophecy (-10 to +10)',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Prophecy ID' }),
    }),
    body: {
      content: {
        'application/json': { schema: rateSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Rating saved',
      content: {
        'application/json': {
          schema: z.object({
            prophecy: z.object({
              id: z.string(),
              title: z.string(),
              description: z.string().nullable(),
              creatorId: z.string(),
              roundId: z.string(),
              createdAt: z.string(),
              fulfilled: z.boolean().nullable(),
              resolvedAt: z.string().nullable(),
            }),
            rating: ratingResponseSchema,
          }),
        },
      },
    },
    400: {
      description: 'Invalid rating or cannot rate own prophecy',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    404: {
      description: 'Prophecy not found',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Resolve Prophecy
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/prophecies/{id}/resolve',
  tags: ['Prophecies'],
  summary: 'Mark prophecy as fulfilled or not (Admin only)',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Prophecy ID' }),
    }),
    body: {
      content: {
        'application/json': { schema: resolveSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Prophecy resolved',
      content: { 'application/json': { schema: prophecyDetailResponseSchema } },
    },
    400: {
      description: 'Rating phase not ended yet',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    403: {
      description: 'Forbidden (not admin)',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    404: {
      description: 'Prophecy not found',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Get Audit Logs
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/prophecies/{id}/audit',
  tags: ['Prophecies'],
  summary: 'Get audit logs for a prophecy',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Prophecy ID' }),
    }),
  },
  responses: {
    200: {
      description: 'Audit logs for the prophecy',
      content: { 'application/json': { schema: auditLogsResponseSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    404: {
      description: 'Prophecy not found',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});
