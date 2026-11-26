import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME,
  isTheme,
  parseTheme,
  THEME_COOKIE,
  THEMES,
} from "@/lib/theme";

describe("parseTheme", () => {
  it("reads both known values", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
  });

  it.each([undefined, "", "Dark", " system", "darkish", "true"])(
    "falls back to the default for %s",
    (value) => {
      expect(parseTheme(value)).toBe(DEFAULT_THEME);
    },
  );

  it("defaults to light", () => {
    expect(DEFAULT_THEME).toBe("light");
  });

  it("declares exactly the two themes it renders", () => {
    expect(THEMES).toEqual(["light", "dark"]);
  });

  it("uses a cookie name that needs no encoding", () => {
    expect(THEME_COOKIE).toMatch(/^[\w-]+$/);
  });
});

describe("isTheme", () => {
  it("accepts only the declared values", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("system")).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });
});
