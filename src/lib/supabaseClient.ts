// src/lib/supabaseClient.ts
// Single browser Supabase client with persistent sessions & "remember me" toggle.
// Exposes getBrowserSupabase() and setAuthPersistence("local" | "session").
// Safe to import anywhere (SSR-safe proxy returned on the server).

"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Persistence preference key in localStorage
const AUTH_PERSIST_KEY = "careiq.auth.persist"; // "local" | "session"
type PersistMode = "local" | "session";

let client: SupabaseClient | null = null;
let currentPersistMode: PersistMode | null = null;

/** Read user preference for persistence. Defaults to "local" (remember me). */
function readPersistMode(): PersistMode {
  if (typeof window === "undefined") return "local";
  try {
    const v = window.localStorage.getItem(AUTH_PERSIST_KEY);
    return v === "session" ? "session" : "local";
  } catch {
    return "local";
  }
}

/** Map preference to the right Web Storage (local or session). */
function getStorageForMode(mode: PersistMode): Storage | undefined {
  if (typeof window === "undefined") {
    // SSR/Edge: return a tiny no-op storage to avoid crashes
    // @ts-expect-error - minimal interface is fine for supabase-js
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return mode === "session" ? window.sessionStorage : window.localStorage;
}

/** Create a real browser client bound to a specific persistence mode. */
function createBrowserClient(mode: PersistMode): SupabaseClient {
  const storage = getStorageForMode(mode);
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage,
      // A stable storage key so the session survives reloads
      storageKey: "careiq.auth.token",
    },
    global: {
      // use native fetch
      fetch: (...args) => fetch(...args as [RequestInfo, RequestInit?]),
    },
  });
}

/** Create a server-safe proxy that defers real work to the browser. */
function createServerSafeProxy(): SupabaseClient {
  // @ts-expect-error building a very small proxy
  return new Proxy({}, {
    get() {
      throw new Error(
        "Supabase browser client was used on the server. Call getBrowserSupabase() in client components only."
      );
    },
  });
}

/** Public: get the (singleton) browser client, honoring the saved persistence mode. */
export function getBrowserSupabase(): SupabaseClient {
  if (typeof window === "undefined") {
    return createServerSafeProxy();
  }
  const desired = readPersistMode();
  if (!client || currentPersistMode !== desired) {
    client = createBrowserClient(desired);
    currentPersistMode = desired;
  }
  return client!;
}

/** Public: toggle persistence. Use "local" for remember-me, "session" to clear on close. */
export function setAuthPersistence(mode: PersistMode) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(AUTH_PERSIST_KEY, mode);
    } catch {}
  }
  // Recreate the client on next access with the new storage backing
  client = null;
}

/** Convenience default export that always resolves to the current browser client. */
const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const c = getBrowserSupabase() as any;
    const v = c[prop];
    return typeof v === "function" ? v.bind(c) : v;
  },
});

export default supabase;
export { supabase };
