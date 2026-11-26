import { signOutAction } from "@/actions/auth";

const BUTTON_CLASS =
  "h-9 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/** Revokes the session and returns to `/login`. */
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className={BUTTON_CLASS}>
        Sign out
      </button>
    </form>
  );
}
