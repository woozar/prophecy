import { z } from 'zod';

// Import common to ensure extendZodWithOpenApi is called
import './common';

// ============================================================================
// Rate Prophecy
// ============================================================================

export const rateSchema = z
  .object({
    value: z
      .number()
      .int('Bewertung muss eine ganze Zahl sein')
      .min(-10, 'Bewertung muss mindestens -10 sein')
      .max(10, 'Bewertung darf maximal +10 sein'),
  })
  .openapi('RateRequest');

export const ratingResponseSchema = z
  .object({
    id: z.string(),
    value: z.number(),
    prophecyId: z.string(),
    userId: z.string(),
    createdAt: z.string().datetime(),
  })
  .openapi('Rating');

// ============================================================================
// Resolve Prophecy
// ============================================================================

export const resolveSchema = z
  .object({
    fulfilled: z.boolean({ required_error: 'fulfilled ist erforderlich' }),
  })
  .openapi('ResolveRequest');

// ============================================================================
// Type Exports
// ============================================================================

export type RateInput = z.infer<typeof rateSchema>;
export type RatingResponse = z.infer<typeof ratingResponseSchema>;
export type ResolveInput = z.infer<typeof resolveSchema>;
