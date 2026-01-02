import { z } from 'zod';

// Import common to ensure extendZodWithOpenApi is called
import { userReferenceSchema } from './common';

// ============================================================================
// Request Schemas
// ============================================================================

export const createProphecySchema = z
  .object({
    roundId: z.string().min(1, 'Runde ist erforderlich'),
    title: z
      .string()
      .min(1, 'Titel ist erforderlich')
      .max(200, 'Titel darf maximal 200 Zeichen haben'),
    description: z
      .string()
      .max(2000, 'Beschreibung darf maximal 2000 Zeichen haben')
      .optional()
      .default(''),
  })
  .openapi('CreateProphecyRequest');

export const updateProphecySchema = z
  .object({
    title: z
      .string()
      .min(1, 'Titel ist erforderlich')
      .max(200, 'Titel darf maximal 200 Zeichen haben'),
    description: z
      .string()
      .max(2000, 'Beschreibung darf maximal 2000 Zeichen haben')
      .optional()
      .default(''),
  })
  .openapi('UpdateProphecyRequest');

// ============================================================================
// Response Schemas
// ============================================================================

export const prophecyResponseSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    creatorId: z.string(),
    roundId: z.string(),
    createdAt: z.string().datetime(),
    fulfilled: z.boolean().nullable(),
    resolvedAt: z.string().datetime().nullable(),
  })
  .openapi('Prophecy');

export const prophecyWithCreatorSchema = prophecyResponseSchema
  .extend({
    creator: userReferenceSchema.optional(),
  })
  .openapi('ProphecyWithCreator');

export const propheciesListResponseSchema = z
  .object({
    prophecies: z.array(prophecyResponseSchema),
  })
  .openapi('PropheciesListResponse');

export const prophecyDetailResponseSchema = z
  .object({
    prophecy: prophecyResponseSchema,
  })
  .openapi('ProphecyDetailResponse');

// ============================================================================
// Query Parameters
// ============================================================================

export const propheciesQuerySchema = z
  .object({
    roundId: z.string().optional(),
    filter: z.enum(['mine', 'toRate']).optional(),
  })
  .openapi('PropheciesQuery');

// ============================================================================
// Type Exports
// ============================================================================

export type CreateProphecyInput = z.infer<typeof createProphecySchema>;
export type UpdateProphecyInput = z.infer<typeof updateProphecySchema>;
export type ProphecyResponse = z.infer<typeof prophecyResponseSchema>;
export type ProphecyWithCreator = z.infer<typeof prophecyWithCreatorSchema>;
export type PropheciesListResponse = z.infer<typeof propheciesListResponseSchema>;
export type ProphecyDetailResponse = z.infer<typeof prophecyDetailResponseSchema>;
export type PropheciesQuery = z.infer<typeof propheciesQuerySchema>;
