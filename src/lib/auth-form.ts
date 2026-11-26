import { z } from "zod";

/**
 * Rules and messages shared by the auth forms and their Server Actions (T0.7).
 *
 * This module must stay importable from Client Components, so it has no
 * `server-only` import: the forms reuse the length constants for their HTML
 * attributes, while the Server Actions re-validate with the same schema. A
 * `"use server"` module cannot export anything but async functions, which is
 * why the form state type and its empty value live here instead of in
 * `src/actions/auth.ts`.
 */

/** Minimum password length (`security.md` §2: enforced client and server side). */
export const PASSWORD_MIN_LENGTH = 8;

/** bcrypt (Supabase's hasher) ignores bytes past 72, so longer input is refused. */
export const PASSWORD_MAX_LENGTH = 72;

/** Longest address RFC 5321 allows. */
export const EMAIL_MAX_LENGTH = 254;

const emailField = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(EMAIL_MAX_LENGTH, "That email address is too long.")
  .pipe(z.email("Enter a valid email address."));

const passwordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`);

/** Sign in and sign up ask for the same two fields under the same rules. */
export const credentialsSchema = z.object({
  email: emailField,
  password: passwordField,
});

export type Credentials = z.infer<typeof credentialsSchema>;

export interface AuthFieldErrors {
  readonly email?: string;
  readonly password?: string;
}

/** What an auth Server Action hands back to the form. */
export interface AuthFormState {
  /** Form-level failure, shown as an alert above the submit button. */
  readonly error?: string;
  readonly fieldErrors?: AuthFieldErrors;
  /**
   * The submitted address, echoed back so a failed attempt does not clear the
   * field: React 19 resets uncontrolled inputs when a form action finishes.
   * The password is never echoed.
   */
  readonly email?: string;
}

export const EMPTY_AUTH_FORM_STATE: AuthFormState = {};

export interface AuthErrorLike {
  readonly code?: string;
  readonly status?: number;
}

/**
 * Supabase answers with stable error codes; the UI shows our own wording so the
 * message is specific and never echoes whatever the service happened to say.
 */
const AUTH_ERROR_MESSAGES: Readonly<Record<string, string | undefined>> = {
  invalid_credentials: "Email or password is incorrect.",
  email_not_confirmed: "Confirm your email address before signing in.",
  user_already_exists:
    "An account with this email already exists. Sign in instead.",
  email_exists: "An account with this email already exists. Sign in instead.",
  weak_password: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
  same_password: "Choose a password you have not used before.",
  over_email_send_rate_limit:
    "Too many attempts. Wait a minute, then try again.",
  over_request_rate_limit: "Too many attempts. Wait a minute, then try again.",
  signup_disabled: "Sign-ups are turned off for this project.",
  provider_disabled: "Google sign-in is turned off for this project.",
  validation_failed: "Check the email address and try again.",
  email_address_not_authorized:
    "That email address is not allowed to sign up here.",
  session_not_found: "Your session expired. Sign in again.",
};

const GENERIC_AUTH_ERROR = "Something went wrong. Please try again.";
const INVALID_INPUT_ERROR =
  "Check the email address and password, then try again.";
const RATE_LIMIT_ERROR = "Too many attempts. Wait a minute, then try again.";

/** A user-facing sentence for an auth failure. */
export function describeAuthError(error: AuthErrorLike): string {
  if (error.code !== undefined) {
    const message = AUTH_ERROR_MESSAGES[error.code];

    if (message !== undefined) {
      return message;
    }
  }

  if (error.status === 400) {
    return INVALID_INPUT_ERROR;
  }

  if (error.status === 429) {
    return RATE_LIMIT_ERROR;
  }

  return GENERIC_AUTH_ERROR;
}
