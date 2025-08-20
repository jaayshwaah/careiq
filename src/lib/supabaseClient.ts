// src/lib/supabaseClient.ts
// Browser-only Supabase client (lazy init). Safe to import in client components.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

export function getBrowserSupabase(): SupabaseClient {
  if (typeof window === "undefined") {
    // Guard against accidental server usage.
    const handler: ProxyHandler<any> = {
      get() {
        throw new Error(
          "getBrowserSupabase() used on the server. Use a server client instead."
        );
      },
    };
    // @ts-expect-error proxy trap
    return new Proxy({}, handler);
  }

  if (_client) return _client;

  const url = reqEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = reqEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  _client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // handles magic links / password reset
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
