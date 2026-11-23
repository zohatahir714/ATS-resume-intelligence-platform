/**
 * Application errors (architecture §6).
 *
 * Every expected failure is an `AppError` with a stable code. Route handlers
 * reply with `{error:{code,message,requestId}}` built by `toErrorResponse`, and
 * the message is always the user-safe `userMessage` — exception details stay in
 * `developerMessage` for logs.
 */

export const APP_ERROR_CODES = [
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
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export const APP_ERROR_STATUS: Readonly<Record<AppErrorCode, number>> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  UNSUPPORTED_TYPE: 415,
  FILE_TOO_LARGE: 413,
  PARSE_FAILED: 422,
  LOW_TEXT: 422,
  UNSUPPORTED_LANGUAGE: 422,
  CONSENT_REQUIRED: 403,
  RESUME_LIMIT: 409,
  ANALYSIS_LIMIT: 429,
  REWRITE_LIMIT: 429,
  BULLET_REGEN_LIMIT: 429,
  AI_UNAVAILABLE: 503,
  AI_INVALID_OUTPUT: 502,
  INTERNAL: 500,
};

export const INTERNAL_ERROR_MESSAGE = "Something went wrong. Please try again.";

export interface AppErrorOptions {
  /** Original failure, kept for logs and debugging. */
  readonly cause?: unknown;
  /** Detail for server logs only; never sent to the client. */
  readonly developerMessage?: string;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly userMessage: string;

  constructor(
    code: AppErrorCode,
    status: number,
    userMessage: string,
    options: AppErrorOptions = {},
  ) {
    super(options.developerMessage ?? userMessage, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.userMessage = userMessage;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

export interface ErrorEnvelope {
  error: {
    code: AppErrorCode;
    message: string;
    requestId: string;
  };
}

export interface ErrorResponse {
  status: number;
  body: ErrorEnvelope;
}

/**
 * Turn anything thrown into the API error envelope. Unknown throwables become a
 * generic `INTERNAL` error so internals never leak to the client.
 */
export function toErrorResponse(
  error: unknown,
  requestId: string,
): ErrorResponse {
  const appError = isAppError(error)
    ? error
    : new AppError("INTERNAL", 500, INTERNAL_ERROR_MESSAGE, { cause: error });

  return {
    status: appError.status,
    body: {
      error: {
        code: appError.code,
        message: appError.userMessage,
        requestId,
      },
    },
  };
}
