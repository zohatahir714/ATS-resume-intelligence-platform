import Link from "next/link";

import { AppNav } from "@/components/app-shell/app-nav";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { Theme } from "@/lib/theme";

export interface AppTopBarProps {
  readonly email: string;
  readonly theme: Theme;
}

/**
 * Top bar: compact navigation on small screens, account controls on all sizes.
 * The ⌘K menu from `ui-ux.md` §2 is not part of this task.
 */
export function AppTopBar({ email, theme }: AppTopBarProps) {
  return (
    <header className="shrink-0 border-b border-border bg-background">
      <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href="/dashboard"
          className="truncate text-sm font-semibold tracking-tight focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:hidden"
        >
          ATS Resume
        </Link>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden max-w-52 truncate text-xs text-muted-foreground sm:inline">
            {email}
          </span>
          <ThemeToggle initialTheme={theme} />
          <SignOutButton />
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden">
        <AppNav layout="bar" />
      </div>
    </header>
  );
}
