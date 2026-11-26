import type { Metadata } from "next";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard · ATS Resume Intelligence",
};

/**
 * Landing page after auth. T0.8 replaces this with the real app shell; it
 * exists now so signing in (and signing out) is observable end to end.
 */
export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user.email ?? "your account"}.
          </p>
        </div>
        <SignOutButton />
      </div>

      <p className="text-sm text-muted-foreground">
        Your analyses and usage meters appear here.
      </p>
    </main>
  );
}
