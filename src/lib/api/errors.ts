import { NextResponse } from "next/server";

/**
 * Custom API error class for typed HTTP error responses.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 500
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * Convert error to NextResponse
   */
  toResponse(): NextResponse {
    return NextResponse.json({ error: this.message }, { status: this.status });
  }
}

// Common error factories
export const Errors = {
  unauthorized: () => new ApiError("Unauthorized", 401),
  forbidden: (message = "Keine Berechtigung") => new ApiError(message, 403),
  notFound: (resource: string) => new ApiError(`${resource} nicht gefunden`, 404),
  badRequest: (message: string) => new ApiError(message, 400),
  internal: (message: string) => new ApiError(message, 500),
} as const;

/**
 * Wrap API handler with consistent error handling.
 * Catches ApiError instances and returns appropriate responses.
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   return handleApiError(async () => {
 *     const session = await requireAuth();
 *     // ... handler logic
 *     return NextResponse.json({ data });
 *   }, "Error loading data");
 * }
 */
export async function handleApiError(
  handler: () => Promise<NextResponse>,
  errorLogMessage: string
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ApiError) {
      return error.toResponse();
    }
    console.error(errorLogMessage, error);
    return Errors.internal(errorLogMessage.replace("Error ", "Fehler beim ")).toResponse();
  }
}
