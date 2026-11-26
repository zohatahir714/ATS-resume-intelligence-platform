"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";

import { THEME_COOKIE, type Theme } from "@/lib/theme";

/** One year, so the choice survives a browser restart. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const BUTTON_CLASS =
  "flex size-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

export interface ThemeToggleProps {
  /** Read from the cookie on the server, so hydration starts in the right state. */
  readonly initialTheme: Theme;
}

/**
 * Light/dark switch. Flips the class on `<html>` immediately and stores the
 * choice in the `theme` cookie that `src/app/layout.tsx` reads on the next
 * request (see `src/lib/theme.ts` for why a cookie, not `localStorage`).
 */
export function ThemeToggle({ initialTheme }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const isDark = theme === "dark";

  function toggle() {
    const next: Theme = isDark ? "light" : "dark";

    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Dark theme"
      aria-pressed={isDark}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={BUTTON_CLASS}
    >
      {isDark ? (
        <Sun aria-hidden className="size-4" />
      ) : (
        <Moon aria-hidden className="size-4" />
      )}
    </button>
  );
}
