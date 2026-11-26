/**
 * Theme preference (`ui-ux.md` §2: light and dark).
 *
 * The choice lives in a cookie rather than `localStorage` so the server can
 * render the right class on `<html>` on the first byte: no flash of the wrong
 * theme, and no blocking inline script in the document. The cookie holds no
 * personal data, so JavaScript may read and write it.
 *
 * This module is imported by Client Components (the toggle), so it stays free
 * of `server-only`; `src/lib/theme-server.ts` reads the cookie on the server.
 */

export const THEME_COOKIE = "theme";

export const THEMES = ["light", "dark"] as const;

export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "light";

export function isTheme(value: string | undefined): value is Theme {
  return value === "light" || value === "dark";
}

/** An unknown or missing cookie value falls back to the default theme. */
export function parseTheme(value: string | undefined): Theme {
  return isTheme(value) ? value : DEFAULT_THEME;
}
