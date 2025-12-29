import { z } from 'zod';

import { roleSchema } from './common';

// ============================================================================
// Password Login
// ============================================================================

export const passwordLoginSchema = z
  .object({
    username: z
      .string({ required_error: 'Benutzername erforderlich' })
      .min(1, 'Benutzername erforderlich'),
    password: z.string({ required_error: 'Passwort erforderlich' }).min(1, 'Passwort erforderlich'),
  })
  .openapi('PasswordLoginRequest');

export const loginResponseSchema = z
  .object({
    user: z.object({
      id: z.string(),
      username: z.string(),
      displayName: z.string().nullable(),
      role: roleSchema,
      avatarUrl: z.string().nullable(),
      avatarEffect: z.string().nullable(),
      avatarEffectColors: z.array(z.string()),
    }),
    forcePasswordChange: z.boolean().optional(),
  })
  .openapi('LoginResponse');

// ============================================================================
// Password Registration
// ============================================================================

export const registerPasswordSchema = z
  .object({
    username: z
      .string({ required_error: 'Benutzername erforderlich' })
      .min(3, 'Benutzername muss mindestens 3 Zeichen lang sein'),
    password: z
      .string({ required_error: 'Passwort erforderlich' })
      .min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
    displayName: z.string().optional(),
  })
  .openapi('RegisterPasswordRequest');

export const registerResponseSchema = z
  .object({
    user: z.object({
      id: z.string(),
      username: z.string(),
      displayName: z.string().nullable(),
      status: z.literal('PENDING'),
    }),
    message: z.string(),
  })
  .openapi('RegisterResponse');

// ============================================================================
// Change Password
// ============================================================================

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, 'Neues Passwort muss mindestens 8 Zeichen haben'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
  })
  .openapi('ChangePasswordRequest');

// ============================================================================
// WebAuthn Login Options
// ============================================================================

export const webAuthnLoginOptionsRequestSchema = z
  .object({
    username: z.string().optional(),
  })
  .openapi('WebAuthnLoginOptionsRequest');

export const webAuthnLoginOptionsResponseSchema = z
  .object({
    options: z.object({
      challenge: z.string(),
      timeout: z.number().optional(),
      rpId: z.string().optional(),
      allowCredentials: z
        .array(
          z.object({
            id: z.string(),
            type: z.literal('public-key'),
            transports: z.array(z.string()).optional(),
          })
        )
        .optional(),
      userVerification: z.string().optional(),
    }),
    challengeKey: z.string(),
  })
  .openapi('WebAuthnLoginOptionsResponse');

// ============================================================================
// WebAuthn Login Verify
// ============================================================================

export const webAuthnLoginVerifyRequestSchema = z
  .object({
    credential: z.object({
      id: z.string(),
      rawId: z.string().optional(),
      response: z.object({
        authenticatorData: z.string(),
        clientDataJSON: z.string(),
        signature: z.string(),
        userHandle: z.string().optional().nullable(),
      }),
      authenticatorAttachment: z.string().optional().nullable(),
      clientExtensionResults: z.record(z.unknown()),
      type: z.literal('public-key'),
    }),
    challengeKey: z.string(),
  })
  .openapi('WebAuthnLoginVerifyRequest');

// ============================================================================
// WebAuthn Register Options
// ============================================================================

export const webAuthnRegisterOptionsRequestSchema = z
  .object({
    username: z.string().min(3, 'Benutzername muss mindestens 3 Zeichen lang sein'),
    displayName: z.string().optional(),
  })
  .openapi('WebAuthnRegisterOptionsRequest');

export const webAuthnRegisterOptionsResponseSchema = z
  .object({
    options: z.object({
      challenge: z.string(),
      rp: z.object({
        name: z.string(),
        id: z.string().optional(),
      }),
      user: z.object({
        id: z.string(),
        name: z.string(),
        displayName: z.string(),
      }),
      pubKeyCredParams: z.array(
        z.object({
          type: z.literal('public-key'),
          alg: z.number(),
        })
      ),
      timeout: z.number().optional(),
      authenticatorSelection: z
        .object({
          authenticatorAttachment: z.string().optional(),
          requireResidentKey: z.boolean().optional(),
          residentKey: z.string().optional(),
          userVerification: z.string().optional(),
        })
        .optional(),
      attestation: z.string().optional(),
      excludeCredentials: z
        .array(
          z.object({
            id: z.string(),
            type: z.literal('public-key'),
            transports: z.array(z.string()).optional(),
          })
        )
        .optional(),
    }),
    tempUserId: z.string(),
    username: z.string(),
    displayName: z.string(),
  })
  .openapi('WebAuthnRegisterOptionsResponse');

// ============================================================================
// WebAuthn Register Verify
// ============================================================================

export const webAuthnRegisterVerifyRequestSchema = z
  .object({
    credential: z.object({
      id: z.string(),
      rawId: z.string().optional(),
      response: z.object({
        clientDataJSON: z.string(),
        attestationObject: z.string(),
        transports: z.array(z.string()).optional(),
        publicKeyAlgorithm: z.number().optional(),
        publicKey: z.string().optional(),
        authenticatorData: z.string().optional(),
      }),
      authenticatorAttachment: z.string().optional().nullable(),
      clientExtensionResults: z.record(z.unknown()),
      type: z.literal('public-key'),
    }),
    tempUserId: z.string(),
    username: z.string(),
    displayName: z.string(),
  })
  .openapi('WebAuthnRegisterVerifyRequest');

// ============================================================================
// Type Exports
// ============================================================================

export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type RegisterPasswordInput = z.infer<typeof registerPasswordSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type WebAuthnLoginOptionsRequest = z.infer<typeof webAuthnLoginOptionsRequestSchema>;
export type WebAuthnLoginOptionsResponse = z.infer<typeof webAuthnLoginOptionsResponseSchema>;
export type WebAuthnLoginVerifyRequest = z.infer<typeof webAuthnLoginVerifyRequestSchema>;
export type WebAuthnRegisterOptionsRequest = z.infer<typeof webAuthnRegisterOptionsRequestSchema>;
export type WebAuthnRegisterOptionsResponse = z.infer<typeof webAuthnRegisterOptionsResponseSchema>;
export type WebAuthnRegisterVerifyRequest = z.infer<typeof webAuthnRegisterVerifyRequestSchema>;
