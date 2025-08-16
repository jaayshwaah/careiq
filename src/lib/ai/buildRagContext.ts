// src/lib/ai/buildRagContext.ts
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { embedQuery } from "@/lib/knowledge/embed";

/**
 * Fetch top-K knowledge snippets to ground the model.
 * Returns a formatted context block you can drop into a system message.
 */
export async function buildRagContext(opts: {
  query: string;
  facilityId?: string | null;
  category?: string | null;
  topK?: number;
  accessToken?: string; // to respect RLS
}) {
  const { query, facilityId = null, category = null, topK = 6, accessToken } = opts;

  // If no query, skip
  if (!query || !query.trim()) return "";

  const supa = supabaseServerWithAuth(accessToken);
  let results: Array<{
    id: string;
    title: string;
    content: string;
    source_url: string | null;
    category: string;
  }> = [];

  try {
    const qEmbedding = await embedQuery(query);
    const { data, error } = await supa.rpc("search_knowledge", {
      query_embedding: qEmbedding,
      in_category: category,
      in_facility: facilityId,
      k: Math.max(1, Math.min(20, topK)),
    });

    if (error) {
      // FTS fallback
      const { data: fts, error: fErr } = await supa
        .from("knowledge_base")
        .select("id, title, content, source_url, category")
        .textSearch("fts", query, { type: "websearch", config: "english" })
        .limit(topK);
      if (!fErr && fts) results = fts as any[];
    } else if (data) {
      results = data as any[];
    }
  } catch {
    // swallow and return empty context
  }

  if (!results.length) return "";

  // Keep snippets short
  const snippets = results.map((r, i) => {
    const snippet =
      (r.content || "").slice(0, 800).replace(/\s+/g, " ").trim() +
      (r.content.length > 800 ? " ..." : "");
    const src = r.source_url ? ` [source](${r.source_url})` : "";
    return `(${i + 1}) [${r.category}] ${r.title}${src}\n${snippet}`;
  });

  return [
    "### Context (retrieved knowledge — cite by number if used)",
    snippets.join("\n\n"),
  ].join("\n\n");
}
