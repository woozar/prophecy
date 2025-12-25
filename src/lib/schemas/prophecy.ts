import { z } from 'zod';

export const createProphecySchema = z.object({
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
});

export const updateProphecySchema = z.object({
  title: z
    .string()
    .min(1, 'Titel ist erforderlich')
    .max(200, 'Titel darf maximal 200 Zeichen haben'),
  description: z
    .string()
    .max(2000, 'Beschreibung darf maximal 2000 Zeichen haben')
    .optional()
    .default(''),
});

export type CreateProphecyInput = z.infer<typeof createProphecySchema>;
export type UpdateProphecyInput = z.infer<typeof updateProphecySchema>;
