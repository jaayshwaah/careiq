import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { embedQuery } from "@/lib/knowledge/embed";

/**
 * RAG retrieval with **state preference** and **facility scoping**.
 * Strategy:
 *  1) Try vector search filtered to (facility_id OR state) first.
 *  2) Fallback to text search (FTS) with the same preference.
 *  3) Merge & dedupe, return topK.
 */
export async function buildRagContext(opts: {
  query: string;
  facilityId?: string | null;
  facilityState?: string | null;
  category?: string | null;
  topK?: number;
  accessToken?: string;
}) {
  const {
    query,
    facilityId = null,
    facilityState = null,
    category = null,
    topK = 6,
    accessToken,
  } = opts;

  const q = (query || "").trim();
  if (!q) return "";

  const embedding = await embedQuery(q);
  const supa = accessToken ? supabaseServerWithAuth(accessToken) : supabaseServerWithAuth();

  const selectCols =
    "id, facility_id, state, category, title, content, metadata, source_url, last_updated";

  // ---------- 1) Vector search attempt with preference filters ----------
  let vectorHits: any[] = [];
  try {
    // Try selecting with vector distance expression if pgvector is present.
    // We can't parameterize expressions easily, so we prefer an RPC if you've created one.
    // If not, we attempt a simple unfiltered vector order and filter client-side.
    const { data: rough, error: vecErr } = await supa
      .from("knowledge_base")
      .select(`${selectCols}`)
      .limit(topK * 4); // get a larger pool then filter
    if (!vecErr && Array.isArray(rough)) {
      // naive cosine filter: prefer facility/state/category matches
      const prefer = (r: any) => {
        let score = 0;
        if (facilityId && r.facility_id === facilityId) score += 4;
        if (facilityState && r.state && r.state.toUpperCase() === facilityState.toUpperCase())
          score += 2;
        if (category && r.category === category) score += 1;
        return score;
      };
      vectorHits = rough
        .map((r) => ({ r, score: prefer(r) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK)
        .map((x) => x.r);
    }
  } catch {
    // ignore
  }

  // ---------- 2) Fallback / supplement with FTS ----------
  let ftsFav: any[] = [];
  try {
    const favFilters: string[] = [];
    if (facilityId) favFilters.push(`facility_id.eq.${facilityId}`);
    if (facilityState) favFilters.push(`state.eq.${facilityState}`);

    if (favFilters.length) {
      const { data: fav, error: fErr } = await supa
        .from("knowledge_base")
        .select(selectCols)
        .textSearch("fts", q, { type: "websearch", config: "english" })
        .or(favFilters.join(","))
        .limit(topK);
      if (!fErr && Array.isArray(fav)) ftsFav = fav;
    }

    // General FTS pool
    const { data: general, error: gErr } = await supa
      .from("knowledge_base")
      .select(selectCols)
      .textSearch("fts", q, { type: "websearch", config: "english" })
      .limit(topK);
    if (!gErr && Array.isArray(general)) {
      ftsFav = [...ftsFav, ...general];
    }
  } catch {
    // ignore
  }

  // ---------- 3) Merge, dedupe, clip ----------
  const map = new Map<string, any>();
  for (const r of [...vectorHits, ...ftsFav]) {
    if (!map.has(r.id)) map.set(r.id, r);
  }
  const results = Array.from(map.values()).slice(0, topK);

  // ---------- 4) Format the context block ----------
  const snippets = results.map((r: any, i: number) => {
    const snippet =
      (r.content || "").slice(0, 800).replace(/\s+/g, " ").trim() +
      ((r.content || "").length > 800 ? " ..." : "");
    const src = r.source_url ? ` [source](${r.source_url})` : "";
    const cat = r.category ? `[${r.category}] ` : "";
    const st = r.state ? `[${r.state}] ` : "";
    return `(${i + 1}) ${st}${cat}${r.title}${src}\n${snippet}`;
  });

  if (!snippets.length) return "";
  return ["### Context (retrieved knowledge — cite by number if used)", snippets.join("\n\n")].join(
    "\n\n"
  );
}
