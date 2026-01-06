import { z } from 'zod';

// Import common to ensure extendZodWithOpenApi is called
import './common';

// ============================================================================
// Base Round Schema (shared between create and update)
// ============================================================================

const baseRoundSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Titel ist erforderlich')
    .max(100, 'Titel darf maximal 100 Zeichen haben'),
  submissionDeadline: z.coerce.date({ required_error: 'Einreichungs-Deadline ist erforderlich' }),
  ratingDeadline: z.coerce.date({ required_error: 'Bewertungs-Deadline ist erforderlich' }),
  fulfillmentDate: z.coerce.date({ required_error: 'Stichtag ist erforderlich' }),
});

const dateOrderRefinements = <T extends z.ZodTypeAny>(schema: T) =>
  schema
    .refine(
      (data: z.infer<typeof baseRoundSchema>) => data.submissionDeadline <= data.ratingDeadline,
      {
        message: 'Einreichungs-Deadline darf nicht nach der Bewertungs-Deadline liegen',
        path: ['submissionDeadline'],
      }
    )
    .refine((data: z.infer<typeof baseRoundSchema>) => data.ratingDeadline < data.fulfillmentDate, {
      message: 'Bewertungs-Deadline muss vor dem Stichtag liegen',
      path: ['ratingDeadline'],
    });

// ============================================================================
// Request Schemas
// ============================================================================

export const createRoundSchema =
  dateOrderRefinements(baseRoundSchema).openapi('CreateRoundRequest');
export const updateRoundSchema =
  dateOrderRefinements(baseRoundSchema).openapi('UpdateRoundRequest');

// ============================================================================
// Response Schemas
// ============================================================================

export const roundResponseSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    submissionDeadline: z.string().datetime(),
    ratingDeadline: z.string().datetime(),
    fulfillmentDate: z.string().datetime(),
    resultsPublishedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
  })
  .openapi('Round');

export const roundsListResponseSchema = z
  .object({
    rounds: z.array(roundResponseSchema),
  })
  .openapi('RoundsListResponse');

export const roundDetailResponseSchema = z
  .object({
    round: roundResponseSchema,
  })
  .openapi('RoundDetailResponse');

// ============================================================================
// Statistics Response
// ============================================================================

export const roundStatisticsSchema = z
  .object({
    roundId: z.string(),
    totalProphecies: z.number(),
    fulfilledCount: z.number(),
    notFulfilledCount: z.number(),
    unresolvedCount: z.number(),
    averageRating: z.number().nullable(),
    topCreators: z.array(
      z.object({
        userId: z.string(),
        username: z.string(),
        displayName: z.string().nullable(),
        avatarUrl: z.string().nullable(),
        fulfilledCount: z.number(),
        totalCount: z.number(),
        averageRating: z.number().nullable(),
      })
    ),
  })
  .openapi('RoundStatistics');

// ============================================================================
// Type Exports
// ============================================================================

export type CreateRoundInput = z.infer<typeof createRoundSchema>;
export type UpdateRoundInput = z.infer<typeof updateRoundSchema>;
export type RoundResponse = z.infer<typeof roundResponseSchema>;
export type RoundsListResponse = z.infer<typeof roundsListResponseSchema>;
export type RoundDetailResponse = z.infer<typeof roundDetailResponseSchema>;
export type RoundStatistics = z.infer<typeof roundStatisticsSchema>;
