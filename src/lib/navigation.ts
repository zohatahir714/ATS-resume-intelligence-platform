/**
 * Active-state rule for the app navigation (`ui-ux.md` §3: slim left nav).
 *
 * Kept out of the component so the path-boundary rule is unit tested: a link
 * is active on its own path and below it, never on a sibling that merely shares
 * a prefix (`/resumes` must not light up for `/resumesomething`).
 */
export function isActiveNavPath(
  pathname: string | null,
  href: string,
): boolean {
  if (pathname === null) {
    return false;
  }

  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  return normalized === href || normalized.startsWith(`${href}/`);
}
