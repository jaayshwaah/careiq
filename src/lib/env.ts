// src/lib/env.ts
/**
 * Centralized, safe access to environment variables.
 * - Validates presence for required vars
 * - Trims accidental wrapping quotes
 */

function getEnv(name: string, { required = false }: { required?: boolean } = {}) {
  let v = process.env[name];
  if (typeof v === "string") {
    // Trim accidental quotes from .env files: KEY="value" -> value
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    v = v.trim();
  }

  if (required && !v) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return v;
}

export const Env = {
  // Supabase (required)
  SUPABASE_URL: getEnv("NEXT_PUBLIC_SUPABASE_URL", { required: true })!,
  SUPABASE_ANON_KEY: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", { required: true })!,

  // Optional – server-only (never expose to client)
  SUPABASE_SERVICE_ROLE_KEY: getEnv("SUPABASE_SERVICE_ROLE_KEY") || undefined,

  // Optional public site URL for emails/links
  PUBLIC_SITE_URL: getEnv("NEXT_PUBLIC_SITE_URL") || undefined,
};
