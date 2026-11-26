"use server";

import { redirect } from "next/navigation";

import {
  type AuthFormState,
  credentialsSchema,
  describeAuthError,
} from "@/lib/auth-form";
import { getServerEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { DASHBOARD_PATH, LOGIN_PATH } from "@/lib/supabase/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Auth mutations (T0.7), called from the login and signup forms.
 *
 * Sessions are written as cookies by `@supabase/ssr`, which Server Actions are
 * allowed to set; `redirect()` then carries them onto the response. Failures
 * come back as form state so the form can keep the user's input and show a
 * specific message.
 */

interface ParsedCredentials {
  readonly email: string;
  readonly password: string;
}

type CredentialsResult =
  | { readonly ok: true; readonly credentials: ParsedCredentials }
  | { readonly ok: false; readonly state: AuthFormState };

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

function parseCredentials(formData: FormData): CredentialsResult {
  const email = readField(formData, "email").trim();
  const password = readField(formData, "password");
  const result = credentialsSchema.safeParse({ email, password });

  if (result.success) {
    return { ok: true, credentials: result.data };
  }

  const firstMessage = (field: string): string | undefined =>
    result.error.issues.find((issue) => issue.path[0] === field)?.message;

  return {
    ok: false,
    state: {
      email,
      fieldErrors: {
        email: firstMessage("email"),
        password: firstMessage("password"),
      },
    },
  };
}

export async function signInAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseCredentials(formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const { email, password } = parsed.credentials;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error !== null) {
    logger.warn("auth.sign_in_failed", {
      code: error.code,
      status: error.status,
    });

    return { email, error: describeAuthError(error) };
  }

  redirect(DASHBOARD_PATH);
}

export async function signUpAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = parseCredentials(formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const { email, password } = parsed.credentials;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error !== null) {
    logger.warn("auth.sign_up_failed", {
      code: error.code,
      status: error.status,
    });

    return { email, error: describeAuthError(error) };
  }

  if (data.session === null) {
    // Email confirmation is off for this project (`setup-guide.md` §3), so a
    // missing session means the project still has it on — or the address is
    // already registered and Supabase hid that fact. Either way the user needs
    // an email before they can continue, and staying on the form is honest.
    return {
      email,
      error: "Check your inbox to confirm the address, then sign in.",
    };
  }

  redirect(DASHBOARD_PATH);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error !== null) {
    // Redirecting to /login with the session still in place would bounce the
    // user straight back to the dashboard, so fail loudly instead.
    logger.error("auth.sign_out_failed", {
      code: error.code,
      status: error.status,
    });

    throw new AppError(
      "INTERNAL",
      500,
      "Could not sign you out. Please try again.",
      { cause: error, developerMessage: error.message },
    );
  }

  redirect(LOGIN_PATH);
}

export async function signInWithGoogleAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // `APP_URL` (not the request Host header) decides where Supabase sends the
  // browser back to; the auth helper would otherwise be open to host spoofing.
  const redirectTo = new URL("/auth/callback", getServerEnv().APP_URL);
  redirectTo.searchParams.set("next", DASHBOARD_PATH);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectTo.toString() },
  });

  if (error !== null) {
    logger.error("auth.oauth_start_failed", {
      code: error.code,
      status: error.status,
    });

    throw new AppError(
      "INTERNAL",
      500,
      "Could not start Google sign-in. Try again, or use your email and password.",
      { cause: error, developerMessage: error.message },
    );
  }

  redirect(data.url);
}
