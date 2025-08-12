// src/lib/supabase-server.ts
import { cookies as nextCookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    // Throwing a clear error helps if envs are missing on Vercel
    throw new Error(`Missing environment variable: ${name}`);
  }
  return v;
}

/**
 * Server-side Supabase client for API routes and server components.
 * Exported name matches your imports in API routes.
 */
export function createClientServer() {
  const cookieStore = nextCookies();

  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL"); // e.g. https://xxxx.supabase.co
  const supabaseAnonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  // NOTE: Do NOT construct new URL() from the anon key.
  // Pass strings directly to Supabase helpers.
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        // next/headers cookies are mutable in route handlers
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}
