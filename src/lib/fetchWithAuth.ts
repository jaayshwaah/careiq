// src/lib/fetchWithAuth.ts
import { getBrowserSupabase } from "@/lib/supabaseClient";

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const supabase = getBrowserSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // Good defaults for JSON bodies (don’t set for FormData)
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, { ...init, headers });
}
