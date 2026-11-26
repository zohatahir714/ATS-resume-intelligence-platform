import { describe, expect, it } from "vitest";

import {
  credentialsSchema,
  describeAuthError,
  EMAIL_MAX_LENGTH,
  EMPTY_AUTH_FORM_STATE,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth-form";

const VALID = {
  email: "  candidate@example.com ",
  password: "correct horse battery",
};

describe("credentialsSchema", () => {
  it("accepts an email and a password of the minimum length", () => {
    const minimumPassword = "a".repeat(PASSWORD_MIN_LENGTH);
    const result = credentialsSchema.safeParse({
      email: VALID.email,
      password: minimumPassword,
    });

    expect(result.success).toBe(true);
  });

  it("trims surrounding whitespace from the email", () => {
    const result = credentialsSchema.safeParse(VALID);

    expect(result.data?.email).toBe("candidate@example.com");
  });

  it("rejects a missing or malformed email with a specific message", () => {
    const missing = credentialsSchema.safeParse({ ...VALID, email: "" });
    const malformed = credentialsSchema.safeParse({
      ...VALID,
      email: "not-an-email",
    });

    expect(missing.success).toBe(false);
    expect(missing.error?.issues[0]?.message).toBe("Enter your email address.");
    expect(malformed.success).toBe(false);
    expect(malformed.error?.issues[0]?.message).toBe(
      "Enter a valid email address.",
    );
  });

  it("rejects an email that is too long", () => {
    const domain = "@example.com";
    const email = `${"a".repeat(EMAIL_MAX_LENGTH)}${domain}`;
    const result = credentialsSchema.safeParse({ ...VALID, email });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "That email address is too long.",
    );
  });

  it("rejects a short password and names the minimum", () => {
    const result = credentialsSchema.safeParse({
      ...VALID,
      password: "a".repeat(PASSWORD_MIN_LENGTH - 1),
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
    );
  });

  it("rejects a password over the bcrypt limit", () => {
    const result = credentialsSchema.safeParse({
      ...VALID,
      password: "a".repeat(PASSWORD_MAX_LENGTH + 1),
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`,
    );
  });

  it("does not trim the password", () => {
    const password = "  spaces inside  ";
    const result = credentialsSchema.safeParse({ ...VALID, password });

    expect(result.data?.password).toBe(password);
  });
});

describe("describeAuthError", () => {
  it.each([
    ["invalid_credentials", "Email or password is incorrect."],
    [
      "user_already_exists",
      "An account with this email already exists. Sign in instead.",
    ],
    ["email_not_confirmed", "Confirm your email address before signing in."],
    ["provider_disabled", "Google sign-in is turned off for this project."],
    [
      "over_request_rate_limit",
      "Too many attempts. Wait a minute, then try again.",
    ],
  ])("maps %s to its own sentence", (code, message) => {
    expect(describeAuthError({ code, status: 400 })).toBe(message);
  });

  it("falls back to the status when the code is unknown", () => {
    expect(describeAuthError({ code: "some_new_code", status: 400 })).toBe(
      "Check the email address and password, then try again.",
    );
    expect(describeAuthError({ code: "some_new_code", status: 429 })).toBe(
      "Too many attempts. Wait a minute, then try again.",
    );
  });

  it("stays generic when there is nothing to go on", () => {
    expect(describeAuthError({})).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("never echoes a service message", () => {
    const message = describeAuthError({
      code: "unknown_service_code",
      status: 500,
    });

    expect(message).not.toContain("unknown_service_code");
  });
});

describe("EMPTY_AUTH_FORM_STATE", () => {
  it("shows neither a field error nor a form error", () => {
    expect(EMPTY_AUTH_FORM_STATE.error).toBeUndefined();
    expect(EMPTY_AUTH_FORM_STATE.fieldErrors).toBeUndefined();
  });
});
