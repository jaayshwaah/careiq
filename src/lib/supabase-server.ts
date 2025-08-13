// Server-side Supabase client without @supabase/ssr.
// Works in Next.js 15 with React 19, Node runtime.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Create a fresh server-side Supabase client.
 * We don't persist sessions or read cookies here; this app uses anon reads/writes.
 * If you later add RLS-authenticated endpoints, we can extend this to bind cookies/headers.
 */
export function getSupabaseServerClient() {
  return createClient(url, anon, {
    auth: { persistSession: false },
    global: {
      headers: {
        "X-Client-Info": "careiq-nextjs",
      },
    },
  });
}

// Convenience export if you prefer a singleton per import site.
// For serverless/edge handlers, creating on-demand is fine.
export const supabaseServer = getSupabaseServerClient();
