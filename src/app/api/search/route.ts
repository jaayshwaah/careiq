// src/app/api/search/route.ts
import { NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { embedQuery } from "@/lib/knowledge/embed";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // Expect: { query: string, topK?: number, category?: string, facilityId?: string }
    const { query, topK = 8, category, facilityId } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ ok: false, error: "query is required" }, { status: 400 });
    }

    // If you have user session tokens, forward Authorization header to respect RLS by facility
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

    const supa = supabaseServerWithAuth(accessToken);

    // Embed the query
    const qEmbedding = await embedQuery(query);

    // Vector search
    let sql = `
      select id, facility_id, category, title, content, metadata, source_url, last_updated,
             1 - (embedding <#> cast($1 as vector)) as similarity
      from public.knowledge_base
      where embedding is not null
    `;
    const params: any[] = [qEmbedding];

    // Optional filters (also constrained by RLS if accessToken present)
    if (category) {
      sql += ` and category = $${params.length + 1}`;
      params.push(category);
    }
    if (facilityId) {
      sql += ` and facility_id = $${params.length + 1}::uuid`;
      params.push(facilityId);
    }

    sql += ` order by embedding <#> cast($1 as vector) asc limit ${Math.max(1, Math.min(50, topK))}`;

    const { data: vectorHits, error: vErr } = await supa.rpc("exec_sql", { query: sql, params });
    // If you don't have rpc/exec_sql helper, we can use supabase-js's SQL via a PostgREST view.
    // To avoid complexity, we’ll do a PostgREST approach below.

    // ---- SIMPLER: PostgREST approach with similarity computed client-side filter ----
    // If the rpc above isn't set up, comment it out and use the PostgREST approach:
    // const { data: vectorHits, error: vErr } = await supa
    //   .from("knowledge_base")
    //   .select("id, facility_id, category, title, content, metadata, source_url, last_updated, embedding")
    //   .limit(200); // small scan; OK for MVP—upgrade to RPC later

    if (vErr) {
      console.warn("Vector query fallback to FTS due to error:", vErr.message);
    }

    let results: any[] = [];

    if (!vErr && Array.isArray(vectorHits)) {
      results = vectorHits;
    } else {
      // FTS fallback
      const { data: ftsHits, error: fErr } = await supa
        .from("knowledge_base")
        .select("id, facility_id, category, title, content, metadata, source_url, last_updated")
        .textSearch("fts", query, { type: "websearch", config: "english" })
        .limit(topK);

      if (fErr) {
        return NextResponse.json({ ok: false, error: fErr.message }, { status: 500 });
      }
      results = ftsHits || [];
    }

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err.message || "unknown error" }, { status: 500 });
  }
}
