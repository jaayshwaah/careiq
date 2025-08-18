// src/lib/supabase-browser.ts
// A browser Supabase client that is *safe* to import on the server.
// It never initializes at module load and never throws during SSR/prerender.
// If accidentally used on the server at runtime, calls will throw with a clear message.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cached browser client
let _client: SupabaseClient | null = null;

// Create a small throwing proxy used ONLY if someone actually tries to use
// the browser client on the server at runtime (shouldn't happen in our app).
function serverThrowingClient(): SupabaseClient {
  const handler: ProxyHandler<any> = {
    get() {
      throw new Error(
        "Supabase browser client was used on the server. Use server helpers from `@/lib/supabase/server` instead."
      );
    },
    apply() {
      throw new Error(
        "Supabase browser client was used on the server. Use server helpers from `@/lib/supabase/server` instead."
      );
    },
  };
  return new Proxy({}, handler) as SupabaseClient;
}

/** Returns a browser Supabase client; safe to call in event handlers/effects. */
export function getBrowserSupabase(): SupabaseClient {
  if (_client) return _client;

  // During SSR/prerender there is no window — return a throwing stub.
  if (typeof window === "undefined") {
    return serverThrowingClient();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error("Missing or invalid NEXT_PUBLIC_SUPABASE_URL.");
  }
  if (!anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  _client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: { headers: { "X-Client-Info": "careiq-browser" } },
  });

  return _client;
}

/**
 * Convenience default export: a proxy that forwards to getBrowserSupabase()
 * on first property access. Safe to *import* anywhere; safe to *use* only
 * in the browser.
 */
const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const c = getBrowserSupabase() as any;
    const v = c[prop];
    return typeof v === "function" ? v.bind(c) : v;
  },
});
export default supabase;

// Also expose a named export for legacy imports
export { supabase };
