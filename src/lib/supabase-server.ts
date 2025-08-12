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
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  // Route-handlers/server-components: use next/headers cookies
  const cookieStore = nextCookies();

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
