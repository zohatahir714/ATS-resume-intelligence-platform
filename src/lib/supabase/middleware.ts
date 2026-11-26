import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/env";
import { isProtectedPath, LOGIN_PATH } from "@/lib/supabase/routes";

/**
 * Refresh the Supabase session and protect `(app)` routes (`frontend.md` §2).
 *
 * Two jobs, in this order:
 * 1. Exchange an expiring access token for a fresh one. Cookies written by the
 *    refresh are copied onto whatever response leaves here — including the
 *    redirect below, otherwise the browser would keep the stale token.
 * 2. Send anonymous visitors of a protected page to `/login`.
 *
 * `auth.getUser()` verifies the token with Supabase; `getSession()` only decodes
 * the cookie and must not be trusted on the server (`security.md` §2).
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
  } = getPublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headersToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        // `@supabase/ssr` asks for no-store cache headers whenever it writes an
        // auth cookie; without them a CDN could serve one user's session to
        // another.
        for (const [name, value] of Object.entries(headersToSet)) {
          response.headers.set(name, value);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();

  if (data.user === null && isProtectedPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.search = "";

    const redirect = NextResponse.redirect(loginUrl);

    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }

    return redirect;
  }

  return response;
}
