// Browser Supabase client that NEVER initializes at module load.
// It lazily creates the client on first use, and only in the browser.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Internal lazy initializer
function _init(): SupabaseClient {
  if (typeof window === "undefined") {
    // If someone tries to use the browser client during SSR/prerender, avoid env access.
    throw new Error("supabase-browser: attempted to initialize on the server.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error("supabase-browser: NEXT_PUBLIC_SUPABASE_URL is missing/invalid.");
  }
  if (!anon) {
    throw new Error("supabase-browser: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.");
  }
  return createClient(url, anon, { auth: { persistSession: true } });
}

let _client: SupabaseClient | null = null;

// Expose a function to explicitly get the client (preferred in new code)
export function getBrowserSupabase(): SupabaseClient {
  if (_client) return _client;
  _client = _init();
  return _client;
}

/**
 * Backward-compatible export named `supabase` that behaves like a client
 * but initializes lazily on first property access. This lets you keep:
 *
 *   import { supabase } from "@/lib/supabaseClient";
 *   await supabase.from("messages").select("*")
 *
 * …without creating a client at import time.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop, receiver) {
    const c = getBrowserSupabase();
    // @ts-ignore – forward everything to the real client
    const value = (c as any)[prop];
    return typeof value === "function" ? value.bind(c) : value;
  },
});
