// src/lib/supabase/server.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Service client (server-only): bypasses RLS. Use ONLY in API routes / server code
 * where you need to write to DB during ingestion or maintenance tasks.
 */
export function supabaseService(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: {} },
  });
}

/**
 * Server client with optional bearer token to RESPECT RLS (multi-tenant reads).
 * Pass the access token from the request's Authorization header if you have it.
 */
export function supabaseServerWithAuth(accessToken?: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : { headers: {} },
  });
}

/**
 * Backwards-compat exports for older imports in your codebase.
 * Some routes expect these exact names from "@/lib/supabase-server".
 */
export function createClientServer(): SupabaseClient {
  // Historically, this returned an anon server client.
  return supabaseServerWithAuth();
}
export function supabaseServer(): SupabaseClient {
  return supabaseServerWithAuth();
}

// Default export with common helpers, in case something imports default.
const supabaseServerModule = {
  supabaseService,
  supabaseServerWithAuth,
  createClientServer,
  supabaseServer,
};
export default supabaseServerModule;
