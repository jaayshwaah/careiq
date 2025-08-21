// src/lib/supabaseClient.ts
// Browser-side Supabase with persistent sessions & auto refresh,
// now safe to import in server prerenders (no hard throw).

"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Preference key for persistence mode ("local" | "session")
const AUTH_PERSIST_KEY = "careiq.auth.persist";
type PersistMode = "local" | "session";

let client: SupabaseClient | null = null;
let currentPersistMode: PersistMode | null = null;

/** Read persistence mode from localStorage (default "local"). */
function readPersistMode(): PersistMode {
  if (typeof window === "undefined") return "local";
  try {
    const v = window.localStorage.getItem(AUTH_PERSIST_KEY);
    if (v === "session" || v === "local") return v;
  } catch {}
  return "local";
}

/** Choose backing storage per mode, with a safe no-op fallback. */
function getStorageForMode(mode: PersistMode): Storage {
  if (typeof window === "undefined") {
    // Minimal no-op storage used during server prerenders.
    // It avoids crashes if createClient inspects storage.
    // @ts-expect-error: implementing only what's needed
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return mode === "session" ? window.sessionStorage : window.localStorage;
}

/** Create a real browser client. */
function createBrowserClient(mode: PersistMode): SupabaseClient {
  const storage = getStorageForMode(mode);
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage,
      storageKey: "careiq.auth.token",
    },
    global: { fetch: (...args) => fetch(...args) },
  });
}

/**
 * Create a "deferred" proxy for server environments.
 * - It won't make network calls during prerender.
 * - If any method is actually invoked on the server, it throws with a clear message.
 * - On the client hydration pass, we re-create a real client and all calls work.
 */
function createServerSafeProxy(): SupabaseClient {
  const err = () =>
    new Error(
      "Supabase browser client method was called on the server. " +
        "Wrap calls in `useEffect`/event handlers or use your server client (@/lib/supabase-server) on the server."
    );

  // Proxy that throws only when a method is actually INVOKED on the server
  const fn = () => {
    throw err();
  };

  // We only need to shape the few namespaces we might touch in code:
  const auth = new Proxy(
    {},
    {
      get: () => fn,
    }
  );

  const from = () => fn;

  return new Proxy({} as unknown as SupabaseClient, {
    get(_t, prop: string) {
      if (prop === "auth") return auth as any;
      if (prop === "from") return from as any;
      // Any other access returns a callable that errors if invoked
      return fn as any;
    },
  });
}

/**
 * Get a singleton Supabase client for the browser.
 * On the server (during prerender), returns a safe proxy instead of throwing.
 */
export function getBrowserSupabase(): SupabaseClient {
  if (typeof window === "undefined") {
    // Server prerender / build time: return safe proxy (no hard crash).
    return createServerSafeProxy();
  }

  const desiredMode = readPersistMode();
  if (!client || currentPersistMode !== desiredMode) {
    client = createBrowserClient(desiredMode);
    currentPersistMode = desiredMode;
  }
  return client!;
}

/** Allow toggling between "local" (remember me) and "session" (clear on close). */
export function setAuthPersistence(mode: PersistMode) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(AUTH_PERSIST_KEY, mode);
    } catch {}
  }
  // Recreate real client on next access
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
