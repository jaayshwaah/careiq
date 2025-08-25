// src/lib/supabaseClient.ts
"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client with:
 * - persistSession: true (localStorage)
 * - autoRefreshToken: true
 * - detectSessionInUrl: true (handles OAuth callbacks)
 *
 * Required ENV (public):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

let _browser: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("getBrowserSupabase() can only be used in the browser.");
  }
  if (_browser) return _browser;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  _browser = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // storage defaults to localStorage in browser; keep it.
    },
    global: {
      headers: {
        "x-client-info": "careiq-web",
      },
    },
  });

  return _browser;
}
