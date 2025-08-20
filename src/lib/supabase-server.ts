// src/lib/supabase/server.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Service client (bypasses RLS). Use for admin tasks like ingestion & audit logs. */
export function supabaseService(): SupabaseClient {
  return createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Auth-aware client honoring RLS using a bearer access token (from cookie or header). */
export function supabaseServerWithAuth(accessToken?: string): SupabaseClient {
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} },
  });
}

// Compatibility export
export const createClientServer = supabaseServerWithAuth;
export const supabaseServer = supabaseServerWithAuth;

export default { supabaseService, supabaseServerWithAuth, createClientServer, supabaseServer };
