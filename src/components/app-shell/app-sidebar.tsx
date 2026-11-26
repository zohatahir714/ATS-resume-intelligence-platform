import Link from "next/link";

import { AppNav } from "@/components/app-shell/app-nav";

/** Slim left navigation (`ui-ux.md` §2-3); hidden below `md`. */
export function AppSidebar() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-2 border-r border-border bg-surface px-3 py-4 md:flex">
      <Link
        href="/dashboard"
        className="px-2 pb-3 text-sm font-semibold tracking-tight focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        ATS Resume Intelligence
      </Link>
      <AppNav />
    </aside>
  );
}
