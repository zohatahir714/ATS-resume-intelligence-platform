import "server-only";

import { cookies } from "next/headers";

import { parseTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

/**
 * The theme to render for this request, read from the `theme` cookie.
 *
 * Called by the root layout (to set the class on `<html>`) and by the app
 * layout (to hand the toggle its current state), so both agree on the first
 * render and hydration matches.
 */
export async function readTheme(): Promise<Theme> {
  const cookieStore = await cookies();

  return parseTheme(cookieStore.get(THEME_COOKIE)?.value);
}
