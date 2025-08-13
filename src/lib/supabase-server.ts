// Server-side Supabase client factory (no top-level side effects).
// IMPORTANT: Do NOT create a client at import time.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnvServer } from "./env";

/** Call this INSIDE your request handlers. */
export function createClientServer(): SupabaseClient {
  const { url, anon } = getSupabaseEnvServer();
  return createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "careiq-nextjs" } },
  });
}

/** Optional helper if callers want a named getter (still lazy). */
export function getSupabaseServer(): SupabaseClient {
  return createClientServer();
}

// Note: No exported singleton like `supabaseServer` here.
// Creating a client at module load causes build-time env errors during prerender.
