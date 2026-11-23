import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPublicEnv,
  getServerEnv,
  loadPublicEnv,
  loadServerEnv,
  resetEnvCache,
} from "@/lib/env";
import { isAppError } from "@/lib/errors";

type RawEnv = Record<string, string | undefined>;

const validEnv: RawEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://ats-dev.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-placeholder",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-placeholder",
  DATABASE_URL:
    "postgresql://postgres:password@aws-0.pooler.supabase.com:6543/postgres",
  MIGRATION_DATABASE_URL:
    "postgresql://postgres:password@aws-0.pooler.supabase.com:5432/postgres",
  GEMINI_API_KEY: "gemini-key-placeholder",
  APP_URL: "http://localhost:3000",
};

function catchError(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }

  throw new Error("expected the call to throw");
}

afterEach(() => {
  resetEnvCache();
  vi.unstubAllEnvs();
});

describe("loadServerEnv", () => {
  it("applies the documented defaults", () => {
    const env = loadServerEnv(validEnv);

    expect(env.GEMINI_MODEL_PRIMARY).toBe("gemini-2.5-flash");
    expect(env.GEMINI_MODEL_FALLBACK).toBe("gemini-2.5-flash-lite");
    expect(env.AI_ENABLED).toBe(true);
    expect(env.AI_MOCK).toBe(false);
    expect(env.ENGINE_VERSION).toBe("1.0.0");
    expect(env.PROMPT_VERSION).toBe("1");
    expect(env.APP_URL).toBe("http://localhost:3000");
  });

  it.each([
    ["true", true],
    ["1", true],
    ["false", false],
    ["0", false],
  ])("parses AI_ENABLED=%s as %s", (raw, expected) => {
    expect(loadServerEnv({ ...validEnv, AI_ENABLED: raw }).AI_ENABLED).toBe(
      expected,
    );
  });

  it("rejects a missing variable and names it without echoing values", () => {
    const { GEMINI_API_KEY: _omitted, ...withoutKey } = validEnv;

    const error = catchError(() => loadServerEnv(withoutKey));

    expect(isAppError(error)).toBe(true);
    if (!isAppError(error)) {
      throw error;
    }

    expect(error.code).toBe("INTERNAL");
    expect(error.status).toBe(500);
    expect(error.message).toContain("GEMINI_API_KEY");
  });

  it("never puts a malformed secret value into the error", () => {
    const error = catchError(() =>
      loadServerEnv({ ...validEnv, DATABASE_URL: "sup3r-secret-value" }),
    );

    expect(isAppError(error)).toBe(true);
    if (!isAppError(error)) {
      throw error;
    }

    expect(error.message).toContain("DATABASE_URL");
    expect(error.message).not.toContain("sup3r-secret-value");
  });

  it("skips validation when SKIP_ENV_VALIDATION=1", () => {
    const raw: RawEnv = { SKIP_ENV_VALIDATION: "1", AI_ENABLED: "true" };
    const env = loadServerEnv(raw);

    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.AI_ENABLED).toBe("true");
  });
});

describe("loadPublicEnv", () => {
  it("needs only the NEXT_PUBLIC_* variables", () => {
    const env = loadPublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://ats-dev.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-placeholder",
    });

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://ats-dev.supabase.co");
  });

  it("rejects a missing public variable", () => {
    const error = catchError(() =>
      loadPublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://ats-dev.supabase.co",
      }),
    );

    expect(isAppError(error)).toBe(true);
    if (!isAppError(error)) {
      throw error;
    }

    expect(error.message).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });
});

describe("env accessors", () => {
  it("reads getPublicEnv from process.env and caches it", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ats-dev.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key-placeholder");

    const first = getPublicEnv();

    expect(first.NEXT_PUBLIC_SUPABASE_URL).toBe("https://ats-dev.supabase.co");
    expect(getPublicEnv()).toBe(first);

    resetEnvCache();
    expect(getPublicEnv()).not.toBe(first);
  });

  it("reads getServerEnv through the skip flag in CI", () => {
    vi.stubEnv("SKIP_ENV_VALIDATION", "1");

    const env = getServerEnv();

    // Validation (and its defaults) is skipped, so raw values pass through.
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.AI_MOCK).toBeUndefined();
    expect(getServerEnv()).toBe(env);
  });
});
