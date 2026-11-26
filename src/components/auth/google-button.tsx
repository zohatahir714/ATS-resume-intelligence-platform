import { signInWithGoogleAction } from "@/actions/auth";

const BUTTON_CLASS =
  "h-10 w-full rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/** Starts the Google OAuth flow; Supabase returns to `/auth/callback`. */
export function GoogleButton() {
  return (
    <form action={signInWithGoogleAction}>
      <button type="submit" className={BUTTON_CLASS}>
        Continue with Google
      </button>
    </form>
  );
}
