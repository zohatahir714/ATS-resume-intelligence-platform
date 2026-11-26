import { type NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { LOGIN_PATH, toSafeRedirectPath } from "@/lib/supabase/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * OAuth callback (`setup-guide.md` §5).
 *
 * Supabase sends the browser back here with a one-time `code`. Exchanging it
 * for a session writes the auth cookies through `cookies()`, which Route
 * Handlers may set, and the redirect below carries them to the browser.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = toSafeRedirectPath(searchParams.get("next"));

  if (code === null) {
    return NextResponse.redirect(new URL(`${LOGIN_PATH}?error=oauth`, origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error !== null) {
    logger.warn("auth.oauth_callback_failed", {
      code: error.code,
      status: error.status,
    });

    return NextResponse.redirect(new URL(`${LOGIN_PATH}?error=oauth`, origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
