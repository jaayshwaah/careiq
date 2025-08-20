// src/lib/supabase-browser.ts
// A browser Supabase client that is safe to import anywhere (lazy-init).
// Use only in client components when calling methods.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

export function getBrowserSupabase(): SupabaseClient {
  if (typeof window === "undefined") {
    // Guard against accidental server use
    const handler: ProxyHandler<any> = {
      get() {
        throw new Error(
          "getBrowserSupabase() used on the server. Use server helpers instead."
        );
      },
    };
    return new Proxy({} as SupabaseClient, handler);
  }

  if (_client) return _client;

  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  _client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // handles magic link/password reset flows
    },
    global: { headers: { "X-Client-Info": "careiq-browser" } },
  });

  return _client;
}

// Convenience default export proxy
const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const c = getBrowserSupabase() as any;
    const v = c[prop];
    return typeof v === "function" ? v.bind(c) : v;
  },
});
export default supabase;
export { supabase };
