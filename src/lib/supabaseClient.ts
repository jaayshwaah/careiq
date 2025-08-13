// Browser Supabase client (used by client components).
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// We intentionally don't guard with try/catch here because this runs in the browser.
// Missing envs will show clearly in the console if misconfigured.
export const supabase = createClient(url, anon, {
  auth: { persistSession: true },
});
