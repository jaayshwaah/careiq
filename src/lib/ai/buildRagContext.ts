import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { embedQuery } from "@/lib/knowledge/embed";

export async function buildRagContext(opts: {
  query: string;
  facilityId?: string | null;
  category?: string | null;
  topK?: number;
  accessToken?: string; // to respect RLS
}) {
  const { query, facilityId = null, category = null, topK = 6, accessToken } = opts;

  // 1) Embed the query
  const q = query.trim();
  if (!q) return "";
  const embedding = await embedQuery(q);

  // 2) Vector match via RPC, fallback to FTS
  const supa = supabaseServerWithAuth(accessToken);
  const { data: hits, error } = await supa.rpc("match_knowledge", {
    query_embedding: embedding,
    match_count: topK,
    p_facility_id: facilityId,
    p_category: category,
  });

  let results = hits as any[] | null;
  if (error || !results || results.length === 0) {
    const { data: ftsHits } = await supa
      .from("knowledge_base")
      .select("id, facility_id, category, title, content, metadata, source_url, last_updated")
      .textSearch("fts", q, { type: "websearch", config: "english" })
      .limit(topK);
    results = ftsHits || [];
  }

  // 3) Format into a compact context block
  const snippets = (results || []).map((r: any, i: number) => {
    const snippet = (r.content || "").slice(0, 800).replace(/\s+/g, " ").trim() +
      ((r.content || "").length > 800 ? " ..." : "");
    const src = r.source_url ? ` [source](${r.source_url})` : "";
    const cat = r.category ? `[${r.category}] ` : "";
    return `(${i + 1}) ${cat}${r.title}${src}\n${snippet}`;
  });

  if (!snippets.length) return "";
  return [
    "### Context (retrieved knowledge — cite by number if used)",
    snippets.join("\n\n"),
  ].join("\n\n");
}