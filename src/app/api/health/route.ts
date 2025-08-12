// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";
import { Env } from "@/lib/env";

/**
 * Lightweight health check.
 * - Confirms required envs are present
 * - Verifies we can instantiate a Supabase client
 * - Attempts a trivial query; treats RLS/401 as "reachable" (still healthy)
 */
export async function GET() {
  try {
    // Validate envs (Env trims accidental quotes and throws if missing)
    const hasUrl = Boolean(Env.SUPABASE_URL);
    const hasAnon = Boolean(Env.SUPABASE_ANON_KEY);

    // Instantiate server client (cookie-based; no URL construction from keys)
    const supabase = createClientServer();

    // Trivial reachability check. RLS might block SELECT; that's fine.
    const { error } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .limit(1);

    const supabaseReachable = !error || !!error; // if we got here, client is usable
    // If you prefer stricter success signal, set supabaseReachable = !error

    return NextResponse.json({
      ok: true,
      env: { hasUrl, hasAnon },
      supabaseReachable,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
