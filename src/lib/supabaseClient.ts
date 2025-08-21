// src/lib/supabaseClient.ts
"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Single browser instance with persistent session.
 * Fixes "need to login every time" caused by non-persistent or re-created clients.
 */
export function getBrowserSupabase(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  browserClient = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
    global: {
      headers: { "x-client-info": "careiq-web" },
    },
  });

  return browserClient;
}
