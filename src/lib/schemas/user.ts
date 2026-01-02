import { z } from 'zod';

import { roleSchema, userStatusSchema } from './common';

// ============================================================================
// User Response
// ============================================================================

export const userResponseSchema = z
  .object({
    id: z.string(),
    username: z.string(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    avatarEffect: z.string().nullable(),
    avatarEffectColors: z.array(z.string()),
    role: roleSchema,
    status: userStatusSchema,
    createdAt: z.string().datetime(),
    _count: z
      .object({
        prophecies: z.number(),
        ratings: z.number(),
      })
      .optional(),
  })
  .openapi('User');

export const usersListResponseSchema = z
  .object({
    users: z.array(userResponseSchema),
  })
  .openapi('UsersListResponse');

// ============================================================================
// Admin: Update User
// ============================================================================

export const updateUserSchema = z
  .object({
    status: userStatusSchema.optional(),
    role: roleSchema.optional(),
  })
  .openapi('UpdateUserRequest');

// ============================================================================
// Password Login Status
// ============================================================================

export const togglePasswordLoginSchema = z
  .object({
    enabled: z.boolean(),
  })
  .openapi('TogglePasswordLoginRequest');

export const passwordLoginStatusSchema = z
  .object({
    passwordLoginEnabled: z.boolean(),
    forcePasswordChange: z.boolean(),
    hasPasskeys: z.boolean(),
    canDisablePasswordLogin: z.boolean(),
  })
  .openapi('PasswordLoginStatus');

export const togglePasswordLoginResponseSchema = z
  .object({
    success: z.boolean(),
    passwordLoginEnabled: z.boolean(),
    message: z.string(),
  })
  .openapi('TogglePasswordLoginResponse');

// ============================================================================
// Avatar Settings
// ============================================================================

const avatarEffects = ['glow', 'particles', 'lightning', 'halo', 'fire', 'none'] as const;
const avatarColors = [
  'cyan',
  'teal',
  'violet',
  'emerald',
  'rose',
  'amber',
  'blue',
  'pink',
] as const;

export const updateAvatarSettingsSchema = z
  .object({
    avatarEffect: z.enum(avatarEffects).optional(),
    avatarEffectColors: z.array(z.enum(avatarColors)).optional(),
  })
  .openapi('UpdateAvatarSettingsRequest');

export { avatarEffects, avatarColors };

export const avatarSettingsResponseSchema = z
  .object({
    avatarEffect: z.string().nullable(),
    avatarEffectColors: z.array(z.string()),
  })
  .openapi('AvatarSettingsResponse');

// ============================================================================
// Passkeys
// ============================================================================

export const passkeySchema = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    createdAt: z.string().datetime(),
    lastUsedAt: z.string().datetime().nullable(),
  })
  .openapi('Passkey');

export const passkeysListResponseSchema = z
  .object({
    passkeys: z.array(passkeySchema),
  })
  .openapi('PasskeysListResponse');

export const registerPasskeyOptionsRequestSchema = z
  .object({
    name: z.string().optional(),
  })
  .openapi('RegisterPasskeyOptionsRequest');

export const deletePasskeySchema = z
  .object({
    id: z.string(),
  })
  .openapi('DeletePasskeyRequest');

// ============================================================================
// Admin: Reset Password
// ============================================================================

export const resetPasswordResponseSchema = z
  .object({
    temporaryPassword: z.string(),
  })
  .openapi('ResetPasswordResponse');

// ============================================================================
// Type Exports
// ============================================================================

export type UserResponse = z.infer<typeof userResponseSchema>;
export type UsersListResponse = z.infer<typeof usersListResponseSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type TogglePasswordLoginInput = z.infer<typeof togglePasswordLoginSchema>;
export type PasswordLoginStatus = z.infer<typeof passwordLoginStatusSchema>;
export type UpdateAvatarSettingsInput = z.infer<typeof updateAvatarSettingsSchema>;
export type AvatarSettingsResponse = z.infer<typeof avatarSettingsResponseSchema>;
export type Passkey = z.infer<typeof passkeySchema>;
export type PasskeysListResponse = z.infer<typeof passkeysListResponseSchema>;
