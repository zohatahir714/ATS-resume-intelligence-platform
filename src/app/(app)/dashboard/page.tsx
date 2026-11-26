import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard · ATS Resume Intelligence",
};

/**
 * Empty dashboard (`ui-ux.md` §3). The history table and usage meters arrive
 * with T3.9 and T3.2; until there are analyses, the pane states the next step
 * once and offers the single action.
 */
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Every analysis you run lands here, newest first.
        </p>
      </header>

      <section className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border bg-surface px-6 py-10">
        <h2 className="text-sm font-medium">No analyses yet</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Upload a resume and paste a job description to see how an ATS reads
          it: the score, the keywords you are missing, and what to fix first.
        </p>
        <Link
          href="/analyses/new"
          className="mt-1 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          New analysis
        </Link>
      </section>
    </div>
  );
}
