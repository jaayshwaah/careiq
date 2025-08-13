// Centralized, typed env access with safe fallbacks.
// Use ONLY public vars in the browser; server can read either.

function pick(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v && String(v).trim().length) return String(v).trim();
  }
  return undefined;
}

export function getSupabaseEnvServer() {
  const url = pick("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  const anon = pick("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY");
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error(
      "Supabase URL missing/invalid. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)."
    );
  }
  if (!anon) {
    throw new Error(
      "Supabase anon key missing. Set NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)."
    );
  }
  return { url, anon };
}

export function getSupabaseEnvBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return { url, anon };
}

export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
