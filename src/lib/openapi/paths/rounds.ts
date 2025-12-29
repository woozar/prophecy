import { z } from 'zod';

import { errorResponseSchema, successResponseSchema } from '@/lib/schemas/common';
import {
  createRoundSchema,
  roundDetailResponseSchema,
  roundStatisticsSchema,
  roundsListResponseSchema,
  updateRoundSchema,
} from '@/lib/schemas/round';

import { registry } from '../registry';

// ============================================================================
// List Rounds
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/rounds',
  tags: ['Rounds'],
  summary: 'Get all rounds',
  responses: {
    200: {
      description: 'List of rounds',
      content: { 'application/json': { schema: roundsListResponseSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Create Round
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/rounds',
  tags: ['Rounds'],
  summary: 'Create a new round (Admin only)',
  request: {
    body: {
      content: {
        'application/json': { schema: createRoundSchema },
      },
    },
  },
  responses: {
    201: {
      description: 'Round created',
      content: { 'application/json': { schema: roundDetailResponseSchema } },
    },
    400: {
      description: 'Validation error',
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
  },
});

// ============================================================================
// Get Round
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/rounds/{id}',
  tags: ['Rounds'],
  summary: 'Get round details',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Round ID' }),
    }),
  },
  responses: {
    200: {
      description: 'Round details',
      content: { 'application/json': { schema: roundDetailResponseSchema } },
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
// Update Round
// ============================================================================

registry.registerPath({
  method: 'put',
  path: '/api/rounds/{id}',
  tags: ['Rounds'],
  summary: 'Update round (Admin only)',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Round ID' }),
    }),
    body: {
      content: {
        'application/json': { schema: updateRoundSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Round updated',
      content: { 'application/json': { schema: roundDetailResponseSchema } },
    },
    400: {
      description: 'Validation error',
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
      description: 'Round not found',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Delete Round
// ============================================================================

registry.registerPath({
  method: 'delete',
  path: '/api/rounds/{id}',
  tags: ['Rounds'],
  summary: 'Delete round (Admin only)',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Round ID' }),
    }),
  },
  responses: {
    200: {
      description: 'Round deleted',
      content: { 'application/json': { schema: successResponseSchema } },
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
      description: 'Round not found',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Round Statistics
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/rounds/{id}/statistics',
  tags: ['Rounds'],
  summary: 'Get round statistics',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Round ID' }),
    }),
  },
  responses: {
    200: {
      description: 'Round statistics',
      content: { 'application/json': { schema: roundStatisticsSchema } },
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
// Publish Results
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/rounds/{id}/publish-results',
  tags: ['Rounds'],
  summary: 'Publish round results (Admin only)',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Round ID' }),
    }),
  },
  responses: {
    200: {
      description: 'Results published',
      content: { 'application/json': { schema: roundDetailResponseSchema } },
    },
    400: {
      description: 'Rating phase not ended',
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
      description: 'Round not found',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Unpublish Results
// ============================================================================

registry.registerPath({
  method: 'delete',
  path: '/api/rounds/{id}/publish-results',
  tags: ['Rounds'],
  summary: 'Unpublish round results (Admin only)',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Round ID' }),
    }),
  },
  responses: {
    200: {
      description: 'Results unpublished',
      content: { 'application/json': { schema: successResponseSchema } },
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
      description: 'Round not found',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});
