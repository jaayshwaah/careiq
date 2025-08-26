// src/lib/authFetch.ts
import { getBrowserSupabase } from "@/lib/supabaseClient";

/**
 * Fetch with automatic auth headers
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const supabase = getBrowserSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers || {});
  
  // Add auth header if token exists
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Set content-type for JSON if not already set
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

/**
 * Simple chat API call with auth
 */
export async function chatAPI(messages: Array<{role: string, content: string}>) {
  const response = await authFetch("/api/chat", {
    method: "POST", 
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(error.error || error.message || "Chat request failed");
  }

  return response.json();
}