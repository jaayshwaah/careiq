// src/lib/supabaseClient.ts
// Browser-only Supabase client with persistent sessions & auto refresh.
// Also supports switching between localStorage (remember me) and sessionStorage.

"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Where we store the user's preference for persistence ("local" | "session")
const AUTH_PERSIST_KEY = "careiq.auth.persist"; // change key name if you like

type PersistMode = "local" | "session";

let client: SupabaseClient | null = null;
let currentPersistMode: PersistMode | null = null;

// Safely read the persistence preference. Default to "local" (remember me).
function readPersistMode(): PersistMode {
  if (typeof window === "undefined") return "local";
  try {
    const v = window.localStorage.getItem(AUTH_PERSIST_KEY);
    if (v === "session" || v === "local") return v;
  } catch {}
  return "local";
}

function getStorageForMode(mode: PersistMode): Storage {
  if (typeof window === "undefined") {
    // No-op storage to satisfy types during SSR (shouldn't be called on server)
    // @ts-expect-error minimal shim
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return mode === "session" ? window.sessionStorage : window.localStorage;
}

function createBrowserClient(mode: PersistMode): SupabaseClient {
  const storage = getStorageForMode(mode);

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // important for magic link / oauth callback handling
      detectSessionInUrl: true,
      storage,
      // optional: set a custom storage key prefix
      storageKey: "careiq.auth.token",
    },
    // optional: attach fetch to avoid edge cases
    global: {
      fetch: (...args) => fetch(...args),
    },
  });
}

/**
 * Get a singleton browser Supabase client honoring the persisted preference.
 * Default is "local" (remember me). You can call setAuthPersistence() to switch.
 */
export function getBrowserSupabase(): SupabaseClient {
  if (typeof window === "undefined") {
    // Guard against server usage
    throw new Error("getBrowserSupabase() called on the server");
  }

  const desiredMode = readPersistMode();
  if (!client || currentPersistMode !== desiredMode) {
    client = createBrowserClient(desiredMode);
    currentPersistMode = desiredMode;
  }
  return client!;
}

/**
 * Allow the app to switch persistence mode at runtime, e.g. from a login checkbox.
 * - "local": persists across browser restarts (remember me)
 * - "session": clears when the tab/browser is closed
 */
export function setAuthPersistence(mode: PersistMode) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(AUTH_PERSIST_KEY, mode);
    } catch {}
  }
  // Recreate client with new storage backing:
  client = null;
}

/** Convenience default export proxy so you can `import supabase from "@/lib/supabaseClient"` */
const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const c = getBrowserSupabase() as any;
    const v = c[prop];
    return typeof v === "function" ? v.bind(c) : v;
  },
});

export default supabase;
export { supabase };
