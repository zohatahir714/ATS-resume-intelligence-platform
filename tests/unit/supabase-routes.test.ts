import { describe, expect, it } from "vitest";

import {
  DASHBOARD_PATH,
  isProtectedPath,
  LOGIN_PATH,
  PROTECTED_PATH_PREFIXES,
  toSafeRedirectPath,
} from "@/lib/supabase/routes";

describe("isProtectedPath", () => {
  it.each(PROTECTED_PATH_PREFIXES)(
    "protects %s and every route below it",
    (prefix) => {
      expect(isProtectedPath(prefix)).toBe(true);
      expect(isProtectedPath(`${prefix}/`)).toBe(true);
      expect(isProtectedPath(`${prefix}/child`)).toBe(true);
      expect(isProtectedPath(`${prefix}/child/grandchild`)).toBe(true);
    },
  );

  it("leaves public and API routes to their own handling", () => {
    const publicPaths = [
      "/",
      LOGIN_PATH,
      "/signup",
      "/privacy",
      "/api/health",
      "/api/analyses",
      "/api/resumes",
    ];

    for (const path of publicPaths) {
      expect(isProtectedPath(path)).toBe(false);
    }
  });

  it("matches on path boundaries only", () => {
    expect(isProtectedPath("/dashboardish")).toBe(false);
    expect(isProtectedPath("/resumesss")).toBe(false);
    expect(isProtectedPath("/settingsx/y")).toBe(false);
    expect(isProtectedPath("/old/dashboard")).toBe(false);
  });

  it("uses /login as the redirect target", () => {
    expect(LOGIN_PATH).toBe("/login");
  });

  it("lands signed-in users on a protected page", () => {
    expect(isProtectedPath(DASHBOARD_PATH)).toBe(true);
  });
});

describe("toSafeRedirectPath", () => {
  it("keeps a same-origin path", () => {
    expect(toSafeRedirectPath("/resumes")).toBe("/resumes");
    expect(toSafeRedirectPath("/analyses/new")).toBe("/analyses/new");
  });

  it.each([
    null,
    "",
    "https://evil.example/dashboard",
    "//evil.example",
    "/\\evil.example",
    "dashboard",
  ])("falls back to the dashboard for %s", (raw) => {
    expect(toSafeRedirectPath(raw)).toBe(DASHBOARD_PATH);
  });
});
