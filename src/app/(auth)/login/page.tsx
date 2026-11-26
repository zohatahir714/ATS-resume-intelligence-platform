import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CredentialsForm } from "@/components/auth/credentials-form";
import { GoogleButton } from "@/components/auth/google-button";
import { getUser } from "@/lib/auth";
import { DASHBOARD_PATH, SIGNUP_PATH } from "@/lib/supabase/routes";

export const metadata: Metadata = {
  title: "Sign in · ATS Resume Intelligence",
};

interface LoginPageProps {
  readonly searchParams: Promise<{ readonly error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getUser();

  if (user !== null) {
    redirect(DASHBOARD_PATH);
  }

  const { error } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Use your email and password, or continue with Google.
        </p>
      </div>

      {error === "oauth" ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {
            "Google sign-in didn't complete. Try again, or use your email and password."
          }
        </p>
      ) : null}

      <CredentialsForm mode="sign-in" />

      <div className="flex items-center gap-3">
        <span aria-hidden className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton />

      <p className="text-sm text-muted-foreground">
        {"No account? "}
        <Link
          href={SIGNUP_PATH}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
