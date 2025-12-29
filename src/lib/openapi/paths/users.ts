import { z } from 'zod';

import { errorResponseSchema, successResponseSchema } from '@/lib/schemas/common';
import {
  avatarSettingsResponseSchema,
  passkeySchema,
  passkeysListResponseSchema,
  passwordLoginStatusSchema,
  togglePasswordLoginResponseSchema,
  togglePasswordLoginSchema,
  updateAvatarSettingsSchema,
} from '@/lib/schemas/user';

import { registry } from '../registry';

// ============================================================================
// Password Login Status
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/users/me/password-login',
  tags: ['User'],
  summary: 'Get password login status',
  responses: {
    200: {
      description: 'Password login status',
      content: { 'application/json': { schema: passwordLoginStatusSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/users/me/password-login',
  tags: ['User'],
  summary: 'Toggle password login',
  request: {
    body: {
      content: {
        'application/json': { schema: togglePasswordLoginSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Password login toggled',
      content: { 'application/json': { schema: togglePasswordLoginResponseSchema } },
    },
    400: {
      description: 'Cannot disable without passkey',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Avatar
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/users/me/avatar',
  tags: ['User'],
  summary: 'Upload avatar image',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            avatar: z.string().openapi({
              type: 'string',
              format: 'binary',
              description: 'Avatar image file (JPEG, PNG, WebP, GIF, max 5MB)',
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Avatar uploaded',
      content: {
        'application/json': {
          schema: z.object({
            avatarUrl: z.string(),
          }),
        },
      },
    },
    400: {
      description: 'Invalid file',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/users/me/avatar',
  tags: ['User'],
  summary: 'Delete avatar image',
  responses: {
    200: {
      description: 'Avatar deleted',
      content: { 'application/json': { schema: successResponseSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Avatar Settings
// ============================================================================

registry.registerPath({
  method: 'patch',
  path: '/api/users/me/avatar-settings',
  tags: ['User'],
  summary: 'Update avatar effect settings',
  request: {
    body: {
      content: {
        'application/json': { schema: updateAvatarSettingsSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Avatar settings updated',
      content: { 'application/json': { schema: avatarSettingsResponseSchema } },
    },
    400: {
      description: 'Invalid settings',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Passkeys
// ============================================================================

registry.registerPath({
  method: 'get',
  path: '/api/users/me/passkeys',
  tags: ['User', 'WebAuthn'],
  summary: 'List user passkeys',
  responses: {
    200: {
      description: 'List of passkeys',
      content: { 'application/json': { schema: passkeysListResponseSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/users/me/passkeys',
  tags: ['User', 'WebAuthn'],
  summary: 'Register new passkey (get options)',
  responses: {
    200: {
      description: 'Registration options',
      content: {
        'application/json': {
          schema: z.object({
            options: z.record(z.unknown()),
          }),
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/users/me/passkeys',
  tags: ['User', 'WebAuthn'],
  summary: 'Rename passkey',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            id: z.string(),
            name: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Passkey renamed',
      content: { 'application/json': { schema: successResponseSchema } },
    },
    400: {
      description: 'ID and name required',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    404: {
      description: 'Passkey not found',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/users/me/passkeys',
  tags: ['User', 'WebAuthn'],
  summary: 'Delete passkey',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            id: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Passkey deleted',
      content: {
        'application/json': {
          schema: z.object({
            passkeys: z.array(passkeySchema),
          }),
        },
      },
    },
    400: {
      description: 'Cannot delete last authentication method',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});
