// Server-side Supabase client factory (no top-level side effects)
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnvServer } from "./env";

export function createClientServer(): SupabaseClient {
  const { url, anon } = getSupabaseEnvServer();
  return createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "careiq-nextjs" } },
  });
}

// Optional convenience if some legacy code imported a singleton
export const supabaseServer: SupabaseClient = createClientServer();
