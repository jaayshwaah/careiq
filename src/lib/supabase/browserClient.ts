// src/lib/supabase/browserClient.ts
"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,            // <— keep session in localStorage
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    autoRefreshToken: true,          // <— refresh before expiry
    detectSessionInUrl: true,        // <— handle magic-link callbacks
  },
});
