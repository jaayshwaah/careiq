// Browser Supabase client (singleton)
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnvBrowser } from "./env";

let client: ReturnType<typeof createClient> | null = null;

export function getBrowserSupabase() {
  if (client) return client;
  const { url, anon } = getSupabaseEnvBrowser();
  client = createClient(url, anon, { auth: { persistSession: true } });
  return client;
}

// For legacy imports expecting `supabase` default
const supabase = getBrowserSupabase();
export default supabase;
