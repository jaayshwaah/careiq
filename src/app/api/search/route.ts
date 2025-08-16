import { NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { embedQuery } from "@/lib/knowledge/embed";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { query, topK = 8, category, facilityId } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ ok: false, error: "query is required" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const qEmbedding = await embedQuery(query);

    // Prefer the RPC if you created it in Supabase:
    const { data: vectorHits, error: vErr } = await supa.rpc("search_knowledge", {
      query_embedding: qEmbedding,
      in_category: category ?? null,
      in_facility: facilityId ?? null,
      k: Math.max(1, Math.min(50, topK))
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
