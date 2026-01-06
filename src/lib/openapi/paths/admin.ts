import { z } from 'zod';

import { errorResponseSchema, successResponseSchema } from '@/lib/schemas/common';
import {
  resetPasswordResponseSchema,
  updateUserSchema,
  userResponseSchema,
  usersListResponseSchema,
} from '@/lib/schemas/user';

import { registry } from '../registry';

// ============================================================================
// List Users
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/admin/users',
  tags: ['Admin'],
  summary: 'List all users (Admin only)',
  responses: {
    200: {
      description: 'List of users',
      content: { 'application/json': { schema: usersListResponseSchema } },
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
// Get User
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/admin/users/{id}',
  tags: ['Admin'],
  summary: 'Get user details (Admin only)',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'User ID' }),
    }),
  },
  responses: {
    200: {
      description: 'User details',
      content: {
        'application/json': {
          schema: z.object({
            user: userResponseSchema,
          }),
        },
      },
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
      description: 'User not found',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Update User
// ============================================================================

registry.registerPath({
  method: 'put',
  path: '/api/admin/users/{id}',
  tags: ['Admin'],
  summary: 'Update user status or role (Admin only)',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'User ID' }),
    }),
    body: {
      content: {
        'application/json': { schema: updateUserSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'User updated',
      content: {
        'application/json': {
          schema: z.object({
            user: userResponseSchema,
          }),
        },
      },
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
      description: 'User not found',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Delete User
// ============================================================================

registry.registerPath({
  method: 'delete',
  path: '/api/admin/users/{id}',
  tags: ['Admin'],
  summary: 'Delete user (Admin only)',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'User ID' }),
    }),
  },
  responses: {
    200: {
      description: 'User deleted',
      content: { 'application/json': { schema: successResponseSchema } },
    },
    400: {
      description: 'Cannot delete yourself',
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
      description: 'User not found',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Reset Password
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/admin/users/{id}/reset-password',
  tags: ['Admin'],
  summary: 'Reset user password (Admin only)',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'User ID' }),
    }),
  },
  responses: {
    200: {
      description: 'Password reset',
      content: { 'application/json': { schema: resetPasswordResponseSchema } },
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
      description: 'User not found',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Trigger Bot Ratings for Round
// ============================================================================

const botRatingsResultSchema = z
  .object({
    botId: z.string(),
    botName: z.string(),
    ratingsCreated: z.number(),
  })
  .openapi('BotRatingsResult');

const botRatingsResponseSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
    result: z.object({
      totalRatingsCreated: z.number(),
      bots: z.array(botRatingsResultSchema),
    }),
  })
  .openapi('BotRatingsResponse');

registry.registerPath({
  method: 'post',
  path: '/api/admin/rounds/{id}/bot-ratings',
  tags: ['Admin'],
  summary: 'Trigger bot ratings for a round (Admin only)',
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Round ID' }),
    }),
  },
  responses: {
    200: {
      description: 'Bot ratings triggered successfully',
      content: { 'application/json': { schema: botRatingsResponseSchema } },
    },
    400: {
      description: 'Error running bot ratings',
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
// Badge Award/Revoke
// ============================================================================

const badgeActionSchema = z
  .object({
    userId: z.string().openapi({ description: 'User ID' }),
    badgeKey: z.string().openapi({ description: 'Badge key' }),
  })
  .openapi('BadgeActionRequest');

const badgeAwardResponseSchema = z
  .object({
    message: z.string(),
    userBadge: z
      .object({
        id: z.string(),
        userId: z.string(),
        badgeId: z.string(),
        earnedAt: z.string(),
        badge: z.object({
          id: z.string(),
          key: z.string(),
          name: z.string(),
          description: z.string(),
          category: z.string(),
          rarity: z.string(),
        }),
      })
      .optional(),
    badge: z
      .object({
        id: z.string(),
        key: z.string(),
        name: z.string(),
      })
      .optional(),
  })
  .openapi('BadgeAwardResponse');

registry.registerPath({
  method: 'post',
  path: '/api/admin/badges/award',
  tags: ['Admin'],
  summary: 'Award a badge to a user (Admin only)',
  request: {
    body: {
      content: {
        'application/json': { schema: badgeActionSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Badge awarded or already owned',
      content: { 'application/json': { schema: badgeAwardResponseSchema } },
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
      description: 'User or badge not found',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/admin/badges/award',
  tags: ['Admin'],
  summary: 'Revoke a badge from a user (Admin only)',
  request: {
    body: {
      content: {
        'application/json': { schema: badgeActionSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Badge revoked',
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
      description: 'User does not have this badge',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});
