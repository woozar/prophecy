import { z } from 'zod';

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
      (data: z.infer<typeof baseRoundSchema>) => data.submissionDeadline < data.ratingDeadline,
      {
        message: 'Einreichungs-Deadline muss vor der Bewertungs-Deadline liegen',
        path: ['submissionDeadline'],
      }
    )
    .refine((data: z.infer<typeof baseRoundSchema>) => data.ratingDeadline < data.fulfillmentDate, {
      message: 'Bewertungs-Deadline muss vor dem Stichtag liegen',
      path: ['ratingDeadline'],
    });

export const createRoundSchema = dateOrderRefinements(baseRoundSchema);
export const updateRoundSchema = dateOrderRefinements(baseRoundSchema);

export type CreateRoundInput = z.infer<typeof createRoundSchema>;
export type UpdateRoundInput = z.infer<typeof updateRoundSchema>;
