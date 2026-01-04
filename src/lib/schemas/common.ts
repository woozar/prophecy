import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Extend Zod with OpenAPI support
extendZodWithOpenApi(z);

// Common ID parameter schema
export const idParamSchema = z.object({
  id: z.string().openapi({ description: 'Resource ID', example: 'clx1234567890' }),
});

// Standard error response
export const errorResponseSchema = z
  .object({
    error: z.string().openapi({ description: 'Error message' }),
  })
  .openapi('ErrorResponse');

// Success response without data
export const successResponseSchema = z
  .object({
    success: z.literal(true),
  })
  .openapi('SuccessResponse');

// User reference for embedded user data in responses
export const userReferenceSchema = z
  .object({
    id: z.string(),
    username: z.string(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    avatarEffect: z.string().nullable(),
    avatarEffectColors: z.array(z.string()),
  })
  .openapi('UserReference');

// Role enum
export const roleSchema = z.enum(['USER', 'ADMIN']).openapi('Role');

// User status enum
export const userStatusSchema = z
  .enum(['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'])
  .openapi('UserStatus');

// Type exports
export type IdParam = z.infer<typeof idParamSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type SuccessResponse = z.infer<typeof successResponseSchema>;
export type UserReference = z.infer<typeof userReferenceSchema>;
export type Role = z.infer<typeof roleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
