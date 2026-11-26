/**
 * Which app pages need a signed-in user (`frontend.md` §2).
 *
 * The list lives here, not inside `middleware.ts`, so the same rule can be unit
 * tested without booting Next. API route handlers are deliberately absent: they
 * authenticate through `getUser()` and answer with the error envelope (401)
 * instead of an HTML redirect.
 */

export const LOGIN_PATH = "/login";

export const SIGNUP_PATH = "/signup";

export const DASHBOARD_PATH = "/dashboard";

export const PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/analyses",
  "/resumes",
  "/settings",
] as const;

/** Drop a trailing slash so `/dashboard/` matches `/dashboard`. */
function normalizePathname(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

/**
 * True for a protected route and everything below it. A prefix must end at a
 * path boundary, so `/dashboardish` is not protected by `/dashboard`.
 */
export function isProtectedPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);

  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

/**
 * Where to go after signing in.
 *
 * Accepts only a same-origin path. Anything else — an absolute URL, a
 * protocol-relative `//host` (which browsers read as another site), a backslash
 * variant of it, or an empty value — falls back to `/dashboard`, so the
 * `?next=` parameter the OAuth callback reads can never turn into an open
 * redirect.
 */
export function toSafeRedirectPath(raw: string | null): string {
  if (raw === null) {
    return DASHBOARD_PATH;
  }

  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return DASHBOARD_PATH;
  }

  return raw;
}
