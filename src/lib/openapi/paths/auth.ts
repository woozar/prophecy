import {
  changePasswordSchema,
  loginResponseSchema,
  passwordLoginSchema,
  registerPasswordSchema,
  registerResponseSchema,
  webAuthnLoginOptionsRequestSchema,
  webAuthnLoginOptionsResponseSchema,
  webAuthnLoginVerifyRequestSchema,
  webAuthnRegisterOptionsRequestSchema,
  webAuthnRegisterOptionsResponseSchema,
  webAuthnRegisterVerifyRequestSchema,
} from '@/lib/schemas/auth';
import { errorResponseSchema, successResponseSchema } from '@/lib/schemas/common';

import { registry } from '../registry';

// ============================================================================
// Password Login
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/auth/login/password',
  tags: ['Auth'],
  summary: 'Login with username and password',
  security: [],
  request: {
    body: {
      content: {
        'application/json': { schema: passwordLoginSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: { 'application/json': { schema: loginResponseSchema } },
    },
    400: {
      description: 'Bad request',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    401: {
      description: 'Invalid credentials',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    403: {
      description: 'Account not approved or blocked',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Password Registration
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/auth/register/password',
  tags: ['Auth'],
  summary: 'Register with username and password',
  security: [],
  request: {
    body: {
      content: {
        'application/json': { schema: registerPasswordSchema },
      },
    },
  },
  responses: {
    201: {
      description: 'Registration successful',
      content: { 'application/json': { schema: registerResponseSchema } },
    },
    400: {
      description: 'Validation error or username taken',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Change Password
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/auth/change-password',
  tags: ['Auth'],
  summary: 'Change password for authenticated user',
  request: {
    body: {
      content: {
        'application/json': { schema: changePasswordSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Password changed successfully',
      content: { 'application/json': { schema: successResponseSchema } },
    },
    400: {
      description: 'Validation error',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    401: {
      description: 'Unauthorized or wrong current password',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// Logout
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/auth/logout',
  tags: ['Auth'],
  summary: 'Logout and clear session',
  responses: {
    200: {
      description: 'Logout successful',
      content: { 'application/json': { schema: successResponseSchema } },
    },
  },
});

// ============================================================================
// WebAuthn Login Options
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/auth/login/options',
  tags: ['Auth', 'WebAuthn'],
  summary: 'Get WebAuthn authentication options',
  security: [],
  request: {
    body: {
      content: {
        'application/json': { schema: webAuthnLoginOptionsRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Authentication options',
      content: { 'application/json': { schema: webAuthnLoginOptionsResponseSchema } },
    },
    400: {
      description: 'No passkey registered',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    404: {
      description: 'User not found',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// WebAuthn Login Verify
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/auth/login/verify',
  tags: ['Auth', 'WebAuthn'],
  summary: 'Verify WebAuthn authentication response',
  security: [],
  request: {
    body: {
      content: {
        'application/json': { schema: webAuthnLoginVerifyRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: { 'application/json': { schema: loginResponseSchema } },
    },
    400: {
      description: 'Verification failed',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
    404: {
      description: 'Passkey not found',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// WebAuthn Register Options
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/auth/register/options',
  tags: ['Auth', 'WebAuthn'],
  summary: 'Get WebAuthn registration options',
  security: [],
  request: {
    body: {
      content: {
        'application/json': { schema: webAuthnRegisterOptionsRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Registration options',
      content: { 'application/json': { schema: webAuthnRegisterOptionsResponseSchema } },
    },
    400: {
      description: 'Username taken',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});

// ============================================================================
// WebAuthn Register Verify
// ============================================================================

registry.registerPath({
  method: 'post',
  path: '/api/auth/register/verify',
  tags: ['Auth', 'WebAuthn'],
  summary: 'Verify WebAuthn registration response',
  security: [],
  request: {
    body: {
      content: {
        'application/json': { schema: webAuthnRegisterVerifyRequestSchema },
      },
    },
  },
  responses: {
    201: {
      description: 'Registration successful',
      content: { 'application/json': { schema: registerResponseSchema } },
    },
    400: {
      description: 'Verification failed',
      content: { 'application/json': { schema: errorResponseSchema } },
    },
  },
});
