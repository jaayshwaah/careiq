import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { embedQuery } from "@/lib/knowledge/embed";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.SEARCH);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { query, topK = 8, category = null, facilityId = null } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ ok: false, error: "query is required" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const embedding = await embedQuery(query);
    const { data: vectorHits, error: vErr } = await supa.rpc("match_knowledge", {
      query_embedding: embedding,
      match_count: topK,
      p_facility_id: facilityId,
      p_category: category,
    });

    if (vErr) {
      // FTS fallback
      const { data: ftsHits, error: fErr } = await supa
        .from("knowledge_base")
        .select("id, facility_id, category, title, content, metadata, source_url, last_updated")
        .textSearch("fts", query, { type: "websearch", config: "english" })
        .limit(topK);
      if (fErr) return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
      return NextResponse.json({ ok: true, results: ftsHits || [] });
    }

    return NextResponse.json({ ok: true, results: vectorHits || [] });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err.message || "unknown error" }, { status: 500 });
  }
}