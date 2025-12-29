import { NextResponse } from 'next/server';

import { ZodSchema, z } from 'zod';

/**
 * Result type for validation functions.
 * Either success with typed data or failure with error response.
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

/**
 * Validate request body against a Zod schema.
 * Returns typed data on success or a JSON error response on failure.
 *
 * @example
 * ```typescript
 * const validation = await validateBody(request, createProphecySchema);
 * if (!validation.success) return validation.response;
 * const { roundId, title, description } = validation.data;
 * ```
 */
export async function validateBody<T extends ZodSchema>(
  request: Request,
  schema: T
): Promise<ValidationResult<z.infer<T>>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.errors[0];
      return {
        success: false,
        response: NextResponse.json({ error: firstError.message }, { status: 400 }),
      };
    }

    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      response: NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 }),
    };
  }
}

/**
 * Validate query parameters against a Zod schema.
 * Returns typed data on success or a JSON error response on failure.
 *
 * @example
 * ```typescript
 * const validation = validateQuery(request, propheciesQuerySchema);
 * if (!validation.success) return validation.response;
 * const { roundId, filter } = validation.data;
 * ```
 */
export function validateQuery<T extends ZodSchema>(
  request: Request,
  schema: T
): ValidationResult<z.infer<T>> {
  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(params);

  if (!result.success) {
    const firstError = result.error.errors[0];
    return {
      success: false,
      response: NextResponse.json({ error: firstError.message }, { status: 400 }),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Validate path parameters against a Zod schema.
 * Returns typed data on success or a JSON error response on failure.
 *
 * @example
 * ```typescript
 * const validation = validateParams(await params, idParamSchema);
 * if (!validation.success) return validation.response;
 * const { id } = validation.data;
 * ```
 */
export function validateParams<T extends ZodSchema>(
  params: Record<string, string>,
  schema: T
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(params);

  if (!result.success) {
    const firstError = result.error.errors[0];
    return {
      success: false,
      response: NextResponse.json({ error: firstError.message }, { status: 400 }),
    };
  }

  return { success: true, data: result.data };
}
