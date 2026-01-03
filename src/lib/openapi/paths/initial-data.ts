import { z } from 'zod';

import { errorResponseSchema, roleSchema, userStatusSchema } from '@/lib/schemas/common';
import { prophecyResponseSchema } from '@/lib/schemas/prophecy';
import { ratingResponseSchema } from '@/lib/schemas/rating';
import { roundResponseSchema } from '@/lib/schemas/round';

import { registry } from '../registry';

// ============================================================================
// Initial Data Schemas
// ============================================================================

// User schema with isBot field (specific to initial-data)
const initialDataUserSchema = z
  .object({
    id: z.string(),
    username: z.string(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    avatarEffect: z.string().nullable(),
    avatarEffectColors: z.array(z.string()),
    role: roleSchema,
    status: userStatusSchema,
    isBot: z.boolean(),
    createdAt: z.string().datetime(),
  })
  .openapi('InitialDataUser');

const initialDataResponseSchema = z
  .object({
    users: z.array(initialDataUserSchema),
    rounds: z.array(roundResponseSchema),
    prophecies: z.array(prophecyResponseSchema),
    ratings: z.array(ratingResponseSchema),
    currentUserId: z.string(),
  })
  .openapi('InitialDataResponse');

// ============================================================================
// Get Initial Data
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/initial-data',
  tags: ['Data'],
  summary: 'Get all initial data for store hydration',
  responses: {
    200: {
      description: 'Initial data for store',
      content: { 'application/json': { schema: initialDataResponseSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});
