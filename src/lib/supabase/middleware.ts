import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/env";
import { isProtectedPath, LOGIN_PATH } from "@/lib/supabase/routes";

/** What one session refresh hands back: the visitor and the response to build on. */
export interface SessionRefresh {
  user: User | null;
  response: NextResponse;
}

/** Test seam; `updateSession` uses `refreshSession` unless given another one. */
export type SessionRefresher = (
  request: NextRequest,
) => Promise<SessionRefresh>;

/**
 * Refresh the Supabase session for one request.
 *
 * Two jobs, in this order:
 * 1. Exchange an expiring access token for a fresh one. Cookies written by the
 *    refresh are copied onto whatever response leaves `updateSession` — the
 *    cookies are attached to `response` here, and a redirect built from it
 *    copies them across, otherwise the browser would keep the stale token.
 * 2. Report who the visitor is, so the caller can guard protected pages.
 *
 * `auth.getUser()` verifies the token with Supabase; `getSession()` only decodes
 * the cookie and must not be trusted on the server (`security.md` §2).
 *
 * Throws when the public environment is missing or malformed, or when Supabase
 * cannot be reached; `updateSession` decides what a request should do then.
 */
async function refreshSession(request: NextRequest): Promise<SessionRefresh> {
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

  return { user: data.user, response };
}

/** `/login` for this request, carrying any cookies the refresh already wrote. */
function toLogin(request: NextRequest, from?: NextResponse): NextResponse {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = LOGIN_PATH;
  loginUrl.search = "";

  const redirect = NextResponse.redirect(loginUrl);

  for (const cookie of from?.cookies.getAll() ?? []) {
    redirect.cookies.set(cookie);
  }

  return redirect;
}

/**
 * Middleware entry point: refresh the session, then protect `(app)` routes.
 *
 * Middleware runs before every matched request, so anything thrown here is a 500
 * for the whole site — on Vercel the page says `MIDDLEWARE_INVOCATION_FAILED`.
 * A missing or malformed `NEXT_PUBLIC_SUPABASE_*` value throws while the client
 * is created; an outage or a rejected token can throw while it is used. Such a
 * failure is logged (messages and variable names only, never a cookie or token)
 * and degraded instead of fatal: public pages still render, protected pages go
 * to `/login`, and `requireUser()` in the `(app)` layout remains the real gate.
 *
 * `next.config.ts` refuses to build with those variables missing, so this path
 * covers runtime failures rather than a misconfigured deployment.
 */
export async function updateSession(
  request: NextRequest,
  refresh: SessionRefresher = refreshSession,
): Promise<NextResponse> {
  const isProtected = isProtectedPath(request.nextUrl.pathname);

  let session: SessionRefresh;

  try {
    session = await refresh(request);
  } catch (error) {
    console.error("middleware: session refresh failed", {
      path: request.nextUrl.pathname,
      protected: isProtected,
      reason: error instanceof Error ? error.message : "unknown error",
    });

    return isProtected ? toLogin(request) : NextResponse.next();
  }

  if (session.user === null && isProtected) {
    return toLogin(request, session.response);
  }

  return session.response;
}
