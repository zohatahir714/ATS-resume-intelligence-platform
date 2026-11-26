import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/** Next.js entry point; the logic lives in `@/lib/supabase/middleware`. */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on every request except Next.js internals, the favicon and static
  // images. API routes are included so their session cookies are refreshed;
  // `updateSession` never redirects them.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
