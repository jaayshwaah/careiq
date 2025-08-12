// src/lib/supabase-browser.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Single browser client instance for client components.
 * Guards against missing envs in development.
 */
if (!supabaseUrl || !supabaseAnonKey) {
  // Avoid crashing the browser; surface a readable error in console.
  // Your UI should still handle "not signed in" states gracefully.
  // eslint-disable-next-line no-console
  console.error(
    "Supabase envs missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const supabaseBrowser =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : undefined;
