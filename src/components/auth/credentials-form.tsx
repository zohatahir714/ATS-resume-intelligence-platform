"use client";

import { useActionState } from "react";

import { signInAction, signUpAction } from "@/actions/auth";
import {
  EMPTY_AUTH_FORM_STATE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth-form";

const COPY = {
  "sign-in": {
    submit: "Sign in",
    pending: "Signing in…",
    passwordAutoComplete: "current-password",
    passwordHint: undefined,
  },
  "sign-up": {
    submit: "Create account",
    pending: "Creating account…",
    passwordAutoComplete: "new-password",
    passwordHint: `At least ${PASSWORD_MIN_LENGTH} characters.`,
  },
} as const;

export interface CredentialsFormProps {
  readonly mode: keyof typeof COPY;
}

const INPUT_CLASS =
  "h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-60";

const LABEL_CLASS = "text-sm font-medium";

const SUBMIT_CLASS =
  "h-10 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60";

/** Email and password form (`frontend.md` §2: both auth pages). */
export function CredentialsForm({ mode }: CredentialsFormProps) {
  const action = mode === "sign-in" ? signInAction : signUpAction;
  const [state, formAction, isPending] = useActionState(
    action,
    EMPTY_AUTH_FORM_STATE,
  );
  const copy = COPY[mode];
  const emailError = state.fieldErrors?.email;
  const passwordError = state.fieldErrors?.password;

  const passwordDescribedBy =
    passwordError !== undefined
      ? "password-error"
      : copy.passwordHint === undefined
        ? undefined
        : "password-hint";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={LABEL_CLASS}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          defaultValue={state.email ?? ""}
          aria-invalid={emailError !== undefined}
          aria-describedby={
            emailError === undefined ? undefined : "email-error"
          }
          className={INPUT_CLASS}
        />
        {emailError === undefined ? null : (
          <p id="email-error" className="text-sm text-destructive">
            {emailError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={LABEL_CLASS}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={copy.passwordAutoComplete}
          required
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          aria-invalid={passwordError !== undefined}
          aria-describedby={passwordDescribedBy}
          className={INPUT_CLASS}
        />
        {passwordError === undefined ? null : (
          <p id="password-error" className="text-sm text-destructive">
            {passwordError}
          </p>
        )}
        {passwordError !== undefined ||
        copy.passwordHint === undefined ? null : (
          <p id="password-hint" className="text-xs text-muted-foreground">
            {copy.passwordHint}
          </p>
        )}
      </div>

      {state.error === undefined ? null : (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}

      <button type="submit" disabled={isPending} className={SUBMIT_CLASS}>
        {isPending ? copy.pending : copy.submit}
      </button>
    </form>
  );
}
