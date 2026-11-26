"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/lib/env";

/**
 * Supabase client for Client Components.
 *
 * `createBrowserClient` keeps one instance per browser tab, so calling this
 * from several components does not create several GoTrue clients. The anon key
 * is public by design (`NEXT_PUBLIC_*`); authorization is enforced by RLS and
 * the server-side repositories.
 */
export function createSupabaseBrowserClient() {
  const {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
  } = getPublicEnv();

  return createBrowserClient(url, anonKey);
}
