// Server-side Supabase client (no @supabase/ssr).
// Compatible with legacy imports expecting `createClientServer`.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function pickEnv(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v && String(v).trim().length) return String(v).trim();
  }
  return undefined;
}

/**
 * Resolve env with fallbacks:
 * - URL: prefers NEXT_PUBLIC_SUPABASE_URL, falls back to SUPABASE_URL
 * - ANON KEY: prefers NEXT_PUBLIC_SUPABASE_ANON_KEY, falls back to SUPABASE_ANON_KEY
 *
 * NOTE: We DO NOT create a client at module import time. That prevents
 * "Invalid URL" crashes during build when Next collects page data.
 */
function resolveSupabaseEnv() {
  const url = pickEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  const anon = pickEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY");

  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error(
      "Supabase URL is missing or invalid. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) to your https://... value."
    );
  }
  if (!anon) {
    throw new Error(
      "Supabase anon key is missing. Set NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)."
    );
  }
  return { url, anon };
}

/** Preferred name used by your existing code */
export function createClientServer(): SupabaseClient {
  const { url, anon } = resolveSupabaseEnv();
  return createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "careiq-nextjs" } },
  });
}

/** Also export with our newer name for convenience */
export function getSupabaseServerClient(): SupabaseClient {
  return createClientServer();
}
