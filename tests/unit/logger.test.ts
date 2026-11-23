import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isSensitiveKey, logger } from "@/lib/logger";

interface LogEntry {
  msg: string;
  level: string;
  time: string;
  [key: string]: unknown;
}

function lastEntry(spy: ReturnType<typeof vi.spyOn>): LogEntry {
  const call = spy.mock.lastCall;
  const line = call?.[0];

  if (typeof line !== "string") {
    throw new Error("logger did not write a string line");
  }

  return JSON.parse(line) as LogEntry;
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "debug").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logger", () => {
  it("writes one JSON line with level, message and timestamp", () => {
    logger.info("resume.upload", { requestId: "req_1", status: 201 });

    const entry = lastEntry(vi.mocked(console.info));

    expect(entry.level).toBe("info");
    expect(entry.msg).toBe("resume.upload");
    expect(entry.requestId).toBe("req_1");
    expect(entry.status).toBe(201);
    expect(Number.isNaN(Date.parse(entry.time))).toBe(false);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("routes each level to its console method", () => {
    logger.debug("a");
    logger.info("b");
    logger.warn("c");
    logger.error("d");

    expect(console.debug).toHaveBeenCalledTimes(1);
    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(lastEntry(vi.mocked(console.error)).level).toBe("error");
  });

  it("redacts content and secret fields but keeps metrics", () => {
    logger.info("analysis.created", {
      requestId: "req_1",
      resumeText: "Jane Doe, jane@example.com",
      jdText: "We need a TypeScript engineer",
      geminiApiKey: "AIza-not-a-real-key",
      userEmail: "jane@example.com",
      durationMs: 120,
      tokens: 512,
    });

    const entry = lastEntry(vi.mocked(console.info));

    expect(entry.resumeText).toBe("[redacted]");
    expect(entry.jdText).toBe("[redacted]");
    expect(entry.geminiApiKey).toBe("[redacted]");
    expect(entry.userEmail).toBe("[redacted]");
    expect(entry.durationMs).toBe(120);
    expect(entry.tokens).toBe(512);

    const serialized = JSON.stringify(entry);
    expect(serialized).not.toContain("Jane Doe");
    expect(serialized).not.toContain("AIza-not-a-real-key");
  });

  it("drops undefined fields and truncates long strings", () => {
    logger.info("health.check", { route: "/api/health", code: undefined });

    const entry = lastEntry(vi.mocked(console.info));
    expect("code" in entry).toBe(false);

    logger.info("misc", { userHash: "a".repeat(400) });
    const long = lastEntry(vi.mocked(console.info)).userHash;

    expect(typeof long).toBe("string");
    expect(String(long).endsWith("…[truncated]")).toBe(true);
  });

  it("does not let a field override the reserved keys", () => {
    logger.info("real.event", { msg: "spoofed", level: "error", time: "x" });

    const entry = lastEntry(vi.mocked(console.info));
    expect(entry.msg).toBe("real.event");
    expect(entry.level).toBe("info");
  });
});

describe("isSensitiveKey", () => {
  it("flags content and secret keys", () => {
    expect(isSensitiveKey("resumeText")).toBe(true);
    expect(isSensitiveKey("job_description")).toBe(true);
    expect(isSensitiveKey("NEXT_PUBLIC_SUPABASE_ANON_KEY")).toBe(true);
    expect(isSensitiveKey("authorizationHeader")).toBe(true);
  });

  it("allows operational fields", () => {
    expect(isSensitiveKey("requestId")).toBe(false);
    expect(isSensitiveKey("durationMs")).toBe(false);
    expect(isSensitiveKey("userHash")).toBe(false);
    expect(isSensitiveKey("model")).toBe(false);
    expect(isSensitiveKey("tokens")).toBe(false);
  });
});
