/**
 * Structured JSON logging (backend §10).
 *
 * One line per event to the console, shaped `{time, level, msg, ...fields}` so
 * Vercel can index it. Privacy rule: resume text, JD text and AI output are
 * never logged. As a backstop, fields whose name looks like content or a secret
 * (`resumeText`, `email`, `geminiApiKey`, …) are replaced with `[redacted]`,
 * and long strings are truncated — callers should pass lengths, hashes, codes
 * and ids instead.
 */

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export type LogValue = string | number | boolean | null;

/** Log entry fields. Known keys are documented; anything else must stay a primitive. */
export interface LogFields {
  /** Short machine-readable event name, e.g. `resume.upload`. */
  event?: string;
  requestId?: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  /** `AppError` code or an AI outcome, never message text. */
  code?: string;
  /** Hash of the user id, never the id or email. */
  userHash?: string;
  /** Gemini model id and usage metadata. */
  model?: string;
  tokens?: number;
  outcome?: string;
  [key: string]: LogValue | undefined;
}

const MAX_FIELD_LENGTH = 256;

const REDACTION_MARKER = "[redacted]";
const TRUNCATION_MARKER = "…[truncated]";

/** Words that mark a field as content or a secret; matched per key word. */
const SENSITIVE_KEY_WORDS = new Set([
  "resume",
  "resumes",
  "jd",
  "jobdescription",
  "description",
  "text",
  "content",
  "body",
  "prompt",
  "completion",
  "output",
  "email",
  "phone",
  "mobile",
  "name",
  "filename",
  "address",
  "key",
  "apikey",
  "token",
  "secret",
  "password",
  "authorization",
  "cookie",
  "session",
  "signature",
]);

function splitKeyWords(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter((word) => word.length > 0)
    .map((word) => word.toLowerCase());
}

export function isSensitiveKey(key: string): boolean {
  return splitKeyWords(key).some((word) => SENSITIVE_KEY_WORDS.has(word));
}

function sanitizeValue(value: LogValue): LogValue {
  if (typeof value === "string" && value.length > MAX_FIELD_LENGTH) {
    return `${value.slice(0, MAX_FIELD_LENGTH)}${TRUNCATION_MARKER}`;
  }

  return value;
}

function sanitizeFields(fields: LogFields): Record<string, LogValue> {
  const safe: Record<string, LogValue> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      continue;
    }

    safe[key] = isSensitiveKey(key) ? REDACTION_MARKER : sanitizeValue(value);
  }

  return safe;
}

function emit(level: LogLevel, event: string, fields: LogFields): void {
  const line = JSON.stringify({
    ...sanitizeFields(fields),
    time: new Date().toISOString(),
    level,
    msg: event,
  });

  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "debug":
      console.debug(line);
      break;
    case "info":
      console.info(line);
      break;
  }
}

export interface Logger {
  debug: (event: string, fields?: LogFields) => void;
  info: (event: string, fields?: LogFields) => void;
  warn: (event: string, fields?: LogFields) => void;
  error: (event: string, fields?: LogFields) => void;
}

export const logger: Logger = {
  debug: (event, fields = {}) => {
    emit("debug", event, fields);
  },
  info: (event, fields = {}) => {
    emit("info", event, fields);
  },
  warn: (event, fields = {}) => {
    emit("warn", event, fields);
  },
  error: (event, fields = {}) => {
    emit("error", event, fields);
  },
};
