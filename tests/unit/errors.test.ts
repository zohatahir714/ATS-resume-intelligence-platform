import { describe, expect, it } from "vitest";

import {
  APP_ERROR_CODES,
  APP_ERROR_STATUS,
  AppError,
  INTERNAL_ERROR_MESSAGE,
  isAppError,
  toErrorResponse,
} from "@/lib/errors";

describe("AppError", () => {
  it("carries the code, status and user message", () => {
    const error = new AppError("NOT_FOUND", 404, "Resume not found.");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppError");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.status).toBe(404);
    expect(error.userMessage).toBe("Resume not found.");
    expect(error.message).toBe("Resume not found.");
  });

  it("keeps developer detail out of the user message", () => {
    const error = new AppError("INTERNAL", 500, "Server error.", {
      developerMessage: "Invalid server environment: DATABASE_URL",
      cause: new Error("boom"),
    });

    expect(error.userMessage).toBe("Server error.");
    expect(error.message).toContain("DATABASE_URL");
    expect(error.cause).toBeInstanceOf(Error);
  });

  it("is recognised by isAppError", () => {
    expect(isAppError(new AppError("VALIDATION", 400, "Bad input."))).toBe(
      true,
    );
    expect(isAppError(new Error("plain"))).toBe(false);
    expect(isAppError("nope")).toBe(false);
  });
});

describe("APP_ERROR_STATUS", () => {
  it("has a status for every code", () => {
    for (const code of APP_ERROR_CODES) {
      expect(APP_ERROR_STATUS[code]).toBeGreaterThanOrEqual(400);
      expect(APP_ERROR_STATUS[code]).toBeLessThan(600);
    }
  });

  it("lists each code once", () => {
    expect(new Set(APP_ERROR_CODES).size).toBe(APP_ERROR_CODES.length);
  });

  it("matches the codes in architecture §6", () => {
    expect([...APP_ERROR_CODES].sort()).toEqual(
      [
        "UNAUTHENTICATED",
        "FORBIDDEN",
        "NOT_FOUND",
        "VALIDATION",
        "UNSUPPORTED_TYPE",
        "FILE_TOO_LARGE",
        "PARSE_FAILED",
        "LOW_TEXT",
        "UNSUPPORTED_LANGUAGE",
        "CONSENT_REQUIRED",
        "RESUME_LIMIT",
        "ANALYSIS_LIMIT",
        "REWRITE_LIMIT",
        "BULLET_REGEN_LIMIT",
        "AI_UNAVAILABLE",
        "AI_INVALID_OUTPUT",
        "INTERNAL",
      ].sort(),
    );
  });
});

describe("toErrorResponse", () => {
  it("builds the error envelope for an AppError", () => {
    const result = toErrorResponse(
      new AppError("ANALYSIS_LIMIT", 429, "Daily analysis limit reached."),
      "req_123",
    );

    expect(result).toEqual({
      status: 429,
      body: {
        error: {
          code: "ANALYSIS_LIMIT",
          message: "Daily analysis limit reached.",
          requestId: "req_123",
        },
      },
    });
  });

  it("hides unknown errors behind a generic INTERNAL envelope", () => {
    const result = toErrorResponse(new Error("db password leaked"), "req_456");

    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe("INTERNAL");
    expect(result.body.error.message).toBe(INTERNAL_ERROR_MESSAGE);
    expect(result.body.error.message).not.toContain("password");
  });
});
