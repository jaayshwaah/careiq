// src/lib/supabaseClient.ts
// Browser-only Supabase client (lazy init). Uses literal NEXT_PUBLIC_* keys
// so Next.js can inline them into the client bundle.

"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

// IMPORTANT: use literal env keys (no dynamic lookup)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

function assertPublicEnv() {
  if (!SUPABASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!SUPABASE_ANON_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
}

export function getBrowserSupabase(): SupabaseClient {
  if (typeof window === "undefined") {
    // Guard against accidental server usage
    const handler: ProxyHandler<any> = {
      get() {
        throw new Error(
          "getBrowserSupabase() used on the server. Use a server-side client instead."
        );
      },
    };
    // @ts-expect-error proxy trap
    return new Proxy({}, handler);
  }

  if (_client) return _client;

  assertPublicEnv();

  _client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
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
