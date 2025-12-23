import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError, Errors, handleApiError } from "./errors";
import { NextResponse } from "next/server";

describe("ApiError", () => {
  it("creates error with message and default status 500", () => {
    const error = new ApiError("Something went wrong");
    expect(error.message).toBe("Something went wrong");
    expect(error.status).toBe(500);
    expect(error.name).toBe("ApiError");
  });

  it("creates error with custom status", () => {
    const error = new ApiError("Not found", 404);
    expect(error.message).toBe("Not found");
    expect(error.status).toBe(404);
  });

  it("converts to NextResponse with correct status and body", () => {
    const error = new ApiError("Forbidden", 403);
    const response = error.toResponse();

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(403);
  });
});

describe("Errors factory", () => {
  it("creates unauthorized error with 401", () => {
    const error = Errors.unauthorized();
    expect(error.message).toBe("Unauthorized");
    expect(error.status).toBe(401);
  });

  it("creates forbidden error with default message", () => {
    const error = Errors.forbidden();
    expect(error.message).toBe("Keine Berechtigung");
    expect(error.status).toBe(403);
  });

  it("creates forbidden error with custom message", () => {
    const error = Errors.forbidden("Custom forbidden");
    expect(error.message).toBe("Custom forbidden");
    expect(error.status).toBe(403);
  });

  it("creates notFound error with resource name", () => {
    const error = Errors.notFound("Prophezeiung");
    expect(error.message).toBe("Prophezeiung nicht gefunden");
    expect(error.status).toBe(404);
  });

  it("creates badRequest error", () => {
    const error = Errors.badRequest("Invalid input");
    expect(error.message).toBe("Invalid input");
    expect(error.status).toBe(400);
  });

  it("creates internal error", () => {
    const error = Errors.internal("Server error");
    expect(error.message).toBe("Server error");
    expect(error.status).toBe(500);
  });
});

describe("handleApiError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns response from successful handler", async () => {
    const mockResponse = NextResponse.json({ data: "test" });
    const handler = vi.fn().mockResolvedValue(mockResponse);

    const result = await handleApiError(handler, "Error message");

    expect(result).toBe(mockResponse);
    expect(handler).toHaveBeenCalled();
  });

  it("catches ApiError and returns its response", async () => {
    const handler = vi.fn().mockRejectedValue(new ApiError("Not found", 404));

    const result = await handleApiError(handler, "Error loading");

    expect(result.status).toBe(404);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("catches generic error and returns 500 response", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("Database error"));

    const result = await handleApiError(handler, "Error loading data");

    expect(result.status).toBe(500);
    expect(console.error).toHaveBeenCalledWith("Error loading data", expect.any(Error));
  });

  it("transforms error message for German response", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("Unexpected"));

    const result = await handleApiError(handler, "Error loading prophecy");
    const body = await result.json();

    expect(body.error).toBe("Fehler beim loading prophecy");
  });
});
