import { z } from "zod";

import { AppError } from "@/lib/errors";

/**
 * The only place the app reads environment variables (AGENTS.md).
 *
 * Two schemas are kept apart. `publicSchema` holds only the `NEXT_PUBLIC_*`
 * values that are safe inside the browser bundle; `serverSchema` adds secrets
 * and server configuration that must never reach it. Values are parsed lazily
 * through `getPublicEnv()` / `getServerEnv()` so that merely importing this
 * module cannot fail a build, and so a build without secrets
 * (`SKIP_ENV_VALIDATION=1`) stays green.
 */

const SKIP_VALUES = new Set(["1", "true"]);

const booleanish = z
  .union([z.boolean(), z.enum(["1", "0", "true", "false"])])
  .transform((value) => value === true || value === "1" || value === "true");

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.url(),
  MIGRATION_DATABASE_URL: z.url(),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL_PRIMARY: z.string().min(1).default("gemini-2.5-flash"),
  GEMINI_MODEL_FALLBACK: z.string().min(1).default("gemini-2.5-flash-lite"),
  AI_ENABLED: booleanish.default(true),
  AI_MOCK: booleanish.default(false),
  ENGINE_VERSION: z.string().min(1).default("1.0.0"),
  PROMPT_VERSION: z.string().min(1).default("1"),
  APP_URL: z.url(),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

type RawEnv = Record<string, string | undefined>;

let cachedPublicEnv: PublicEnv | undefined;
let cachedServerEnv: ServerEnv | undefined;

function isValidationSkipped(raw: RawEnv): boolean {
  const flag = raw.SKIP_ENV_VALIDATION;

  return flag !== undefined && SKIP_VALUES.has(flag.toLowerCase());
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) =>
      issue.path.length > 0 ? issue.path.map(String).join(".") : "(env)",
    )
    .sort()
    .join(", ");
}

function parseEnv<T extends z.ZodType>(
  schema: T,
  raw: RawEnv,
  scope: string,
): z.infer<T> {
  const result = schema.safeParse(raw);

  if (result.success) {
    return result.data;
  }

  if (isValidationSkipped(raw)) {
    // CI sets SKIP_ENV_VALIDATION=1 (see .github/workflows/ci.yml). Return the
    // unvalidated values so a build without secrets still compiles; a missing
    // value then fails at the point of use instead of at import time.
    return raw as unknown as z.infer<T>;
  }

  // Variable names only: a rejected value can itself be a secret (a malformed
  // connection string, a truncated key), so it is never echoed into the error.
  throw new AppError(
    "INTERNAL",
    500,
    "Server configuration is invalid. Check the environment variables.",
    {
      developerMessage: `Invalid ${scope} environment: ${describeIssues(result.error)}`,
    },
  );
}

/** Validate a public environment. Exported for tests. */
export function loadPublicEnv(raw: RawEnv): PublicEnv {
  return parseEnv(publicSchema, raw, "public");
}

/** Validate a server environment. Exported for tests. */
export function loadServerEnv(raw: RawEnv): ServerEnv {
  return parseEnv(serverSchema, raw, "server");
}

export function getPublicEnv(): PublicEnv {
  // Static member access so Next.js can inline these values into client bundles.
  cachedPublicEnv ??= loadPublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION,
  });

  return cachedPublicEnv;
}

export function getServerEnv(): ServerEnv {
  cachedServerEnv ??= loadServerEnv(process.env);

  return cachedServerEnv;
}

/** Test helper: drop parsed values so the next getter re-reads `process.env`. */
export function resetEnvCache(): void {
  cachedPublicEnv = undefined;
  cachedServerEnv = undefined;
}
