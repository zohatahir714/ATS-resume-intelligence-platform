import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LOGIN_PATH } from "@/lib/supabase/routes";

/**
 * The signed-in user, verified by Supabase, or `null`.
 *
 * Use this in API route handlers, where the answer becomes a 401 error
 * envelope, and in `requireUser()` for pages and Server Actions.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  return data.user;
}

/**
 * The signed-in user, or a redirect to `/login`.
 *
 * For Server Components and Server Actions only: `redirect()` relies on the
 * Next.js request scope. `src/middleware.ts` already guards these routes; this
 * is the in-render check that also covers layouts and actions reached directly.
 */
export async function requireUser(): Promise<User> {
  const user = await getUser();

  if (user === null) {
    redirect(LOGIN_PATH);
  }

  return user;
}
