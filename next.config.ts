import type { NextConfig } from "next";

import { loadPublicEnv } from "./src/lib/env";

/**
 * Validate the public environment as the build starts.
 *
 * `getPublicEnv()` is lazy, so a deployment missing `NEXT_PUBLIC_SUPABASE_*`
 * used to build successfully and then fail on every request inside
 * `src/middleware.ts` — Vercel reports that as a 500 `MIDDLEWARE_INVOCATION_FAILED`
 * on the project URL with nothing in the build log. Failing here keeps the
 * variable names in the build log instead. CI builds without secrets and is
 * unaffected: `loadPublicEnv` honours `SKIP_ENV_VALIDATION=1`.
 */
try {
  loadPublicEnv(process.env);
} catch (error) {
  throw new Error(
    "Public environment is missing or invalid. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for this deployment, then redeploy (Vercel: Settings → Environment Variables).",
    { cause: error },
  );
}

const nextConfig: NextConfig = {};

export default nextConfig;
