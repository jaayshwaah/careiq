// src/lib/supabaseClient.ts
"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-first Supabase client.
 * - In the browser: persists session to localStorage and auto-refreshes.
 * - On the server/SSR: returns a safe, in-memory client (no localStorage access).
 *
 * ENV (public):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

let _browser: SupabaseClient | null = null;
let _ssr: SupabaseClient | null = null;

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return { url, anon };
}

/**
 * Browser client (persists session). Safe to import anywhere; safe to call in the browser.
 * If called on the server, we fall back to a memory client (no localStorage), so SSR won’t crash.
 */
export function getBrowserSupabase(): SupabaseClient {
  const { url, anon } = getEnv();

  if (typeof window === "undefined") {
    // SSR-safe in-memory client (no throws during prerender)
    if (_ssr) return _ssr;
    _ssr = createClient(url, anon, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { headers: { "x-client-info": "careiq-ssr" } },
    });
    return _ssr;
  }

  if (_browser) return _browser;

  _browser = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // storage: default localStorage in browser
    },
    global: { headers: { "x-client-info": "careiq-web" } },
  });

  return _browser;
}

/**
 * Backwards-compat shim for old code that tried to “set” persistence.
 * Supabase handles this via client options; this function is a no-op now.
 */
export function setAuthPersistence(_persist: boolean): void {
  // No-op by design. Keeping export to avoid build-time import errors.
}
