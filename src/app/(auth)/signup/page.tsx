import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CredentialsForm } from "@/components/auth/credentials-form";
import { GoogleButton } from "@/components/auth/google-button";
import { getUser } from "@/lib/auth";
import { DASHBOARD_PATH, LOGIN_PATH } from "@/lib/supabase/routes";

export const metadata: Metadata = {
  title: "Create account · ATS Resume Intelligence",
};

export default async function SignupPage() {
  const user = await getUser();

  if (user !== null) {
    redirect(DASHBOARD_PATH);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Create account</h1>
        <p className="text-sm text-muted-foreground">
          Email and password, or continue with Google. No email confirmation.
        </p>
      </div>

      <CredentialsForm mode="sign-up" />

      <div className="flex items-center gap-3">
        <span aria-hidden className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>

      <GoogleButton />

      <p className="text-sm text-muted-foreground">
        {"Already have an account? "}
        <Link
          href={LOGIN_PATH}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
