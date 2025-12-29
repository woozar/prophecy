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
