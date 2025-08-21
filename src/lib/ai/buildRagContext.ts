import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { embedQuery } from "@/lib/knowledge/embed";

/**
 * State-aware RAG retrieval with facility preference.
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

  // Embed once (kept here in case you wire a pgvector RPC later)
  await embedQuery(q).catch(() => null);

  const supa = accessToken ? supabaseServerWithAuth(accessToken) : supabaseServerWithAuth();
  const selectCols =
    "id, facility_id, state, category, title, content, metadata, source_url, last_updated";

  // Pull a broader pool then prefer facility/state/category client-side
  const { data: pool } = await supa.from("knowledge_base").select(selectCols).limit(topK * 8);

  const prefer = (r: any) => {
    let score = 0;
    if (facilityId && r.facility_id === facilityId) score += 4;
    if (facilityState && r.state && r.state.toUpperCase() === facilityState.toUpperCase())
      score += 2;
    if (category && r.category === category) score += 1;
    return score;
  };

  const ranked = (pool || [])
    .map((r: any) => ({ r, score: prefer(r) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((x) => x.r);

  const snippets = ranked.map((r: any, i: number) => {
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
