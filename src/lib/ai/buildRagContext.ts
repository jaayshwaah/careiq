// src/lib/ai/buildRagContext.ts
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { embedQuery } from "@/lib/knowledge/embed";

export type RegulationSource = {
  id: string;
  facility_id?: string | null;
  state?: string | null;
  category?: string | null;
  title: string;
  content: string;
  source_url?: string | null;
  last_updated?: string | null;
  metadata?: any;
  similarity?: number;
};

export interface RAGContextOptions {
  query: string;
  facilityId?: string | null;
  facilityState?: string | null;
  category?: string | null;
  topK?: number;
  accessToken?: string;
  useVector?: boolean; // fallback to text search if vector fails
}

/**
 * Enhanced RAG context builder with facility-aware, state-specific retrieval
 */
export async function buildRagContext(opts: RAGContextOptions): Promise<string> {
  const {
    query,
    facilityId = null,
    facilityState = null,
    category = null,
    topK = 6,
    accessToken,
    useVector = true,
  } = opts;

  const q = (query || "").trim();
  if (!q) return "";

  const supa = accessToken ? supabaseServerWithAuth(accessToken) : supabaseServerWithAuth();
  
  let results: RegulationSource[] = [];

  // Try vector search first, fall back to text search
  if (useVector) {
    try {
      results = await performVectorSearch(supa, q, topK, facilityId, facilityState);
    } catch (error) {
      console.warn("Vector search failed, falling back to text search:", error);
      results = await performTextSearch(supa, q, topK, facilityId, facilityState, category);
    }
  } else {
    results = await performTextSearch(supa, q, topK, facilityId, facilityState, category);
  }

  // If no results, try broader search without facility constraints
  if (results.length === 0) {
    results = await performBroaderSearch(supa, q, topK);
  }

  return formatEnhancedContext(results, facilityState, facilityId);
}

/**
 * Vector-based semantic search using embeddings
 */
async function performVectorSearch(
  supa: any,
  query: string,
  topK: number,
  facilityId?: string | null,
  facilityState?: string | null
): Promise<RegulationSource[]> {
  // Generate embedding for the query
  const embedding = await embedQuery(query);
  
  // Try the enhanced vector function first
  try {
    const { data: vectorResults, error: vectorError } = await supa.rpc("match_regulations_enhanced", {
      query_embedding: embedding,
      match_count: topK,
      p_facility_id: facilityId || null,
      p_state: facilityState || null,
      similarity_threshold: 0.7,
    });

    if (vectorError) throw vectorError;
    return vectorResults || [];
  } catch (error) {
    // Fallback to basic vector search
    const { data: basicResults, error: basicError } = await supa.rpc("match_knowledge", {
      query_embedding: embedding,
      match_count: topK,
      p_facility_id: facilityId || null,
      p_category: null,
    });

    if (basicError) throw basicError;
    return basicResults || [];
  }
}

/**
 * Full-text search as fallback or primary method
 */
async function performTextSearch(
  supa: any,
  query: string,
  topK: number,
  facilityId?: string | null,
  facilityState?: string | null,
  category?: string | null
): Promise<RegulationSource[]> {
  try {
    // Try the simple search function if available
    const { data: simpleResults, error: simpleError } = await supa.rpc("search_knowledge_simple", {
      search_query: query,
      match_count: topK,
      p_facility_id: facilityId || null,
      p_state: facilityState || null,
    });

    if (!simpleError && simpleResults) {
      return simpleResults;
    }
  } catch (error) {
    console.warn("Simple search function not available, using direct query");
  }

  // Direct full-text search as final fallback
  let queryBuilder = supa
    .from("knowledge_base")
    .select("id, facility_id, state, category, title, content, metadata, source_url, last_updated")
    .textSearch("content", query, { type: "websearch", config: "english" });

  // Apply filters
  if (facilityId) {
    queryBuilder = queryBuilder.eq("facility_id", facilityId);
  }
  if (facilityState) {
    queryBuilder = queryBuilder.eq("state", facilityState);
  }
  if (category) {
    queryBuilder = queryBuilder.eq("category", category);
  }

  const { data, error } = await queryBuilder
    .order("last_updated", { ascending: false })
    .limit(topK);

  if (error) {
    console.error("Text search error:", error);
    return [];
  }

  return data || [];
}

/**
 * Broader search without facility constraints when initial search fails
 */
async function performBroaderSearch(
  supa: any,
  query: string,
  topK: number
): Promise<RegulationSource[]> {
  const { data, error } = await supa
    .from("knowledge_base")
    .select("id, facility_id, state, category, title, content, metadata, source_url, last_updated")
    .textSearch("content", query, { type: "websearch", config: "english" })
    .order("last_updated", { ascending: false })
    .limit(topK);

  if (error) {
    console.error("Broader search error:", error);
    return [];
  }

  return data || [];
}

/**
 * Format context with enhanced structure and facility awareness
 */
function formatEnhancedContext(
  results: RegulationSource[],
  facilityState?: string | null,
  facilityId?: string | null
): string {
  if (!results.length) return "";

  // Group results by source type for better organization
  const grouped = groupResultsBySource(results);
  
  let context = "### Relevant Regulations (cite by number if used)\n\n";
  let index = 1;

  // Federal/CMS regulations first (highest authority)
  if (grouped.cms.length > 0) {
    context += "**Federal CMS Requirements:**\n";
    for (const reg of grouped.cms) {
      context += formatRegulationEntry(reg, index);
      index++;
    }
    context += "\n";
  }

  // State-specific regulations (when available and relevant)
  if (grouped.state.length > 0) {
    const stateLabel = facilityState || "State";
    context += `**${stateLabel} Requirements:**\n`;
    for (const reg of grouped.state) {
      context += formatRegulationEntry(reg, index);
      index++;
    }
    context += "\n";
  }

  // Accreditation standards
  if (grouped.accreditation.length > 0) {
    context += "**Accreditation Standards:**\n";
    for (const reg of grouped.accreditation) {
      context += formatRegulationEntry(reg, index);
      index++;
    }
    context += "\n";
  }

  // Facility-specific policies (if any)
  if (grouped.facility.length > 0) {
    context += "**Facility-Specific Policies:**\n";
    for (const reg of grouped.facility) {
      context += formatRegulationEntry(reg, index);
      index++;
    }
    context += "\n";
  }

  // General/other sources
  if (grouped.other.length > 0) {
    context += "**Additional Resources:**\n";
    for (const reg of grouped.other) {
      context += formatRegulationEntry(reg, index);
      index++;
    }
  }

  return context.trim();
}

/**
 * Group results by source type for organized presentation
 */
function groupResultsBySource(results: RegulationSource[]) {
  const groups = {
    cms: [] as RegulationSource[],
    state: [] as RegulationSource[],
    accreditation: [] as RegulationSource[],
    facility: [] as RegulationSource[],
    other: [] as RegulationSource[],
  };

  for (const result of results) {
    const category = (result.category || "").toLowerCase();
    
    if (category.includes("cms") || category.includes("cfr") || category.includes("federal")) {
      groups.cms.push(result);
    } else if (category.includes("state") || result.state) {
      groups.state.push(result);
    } else if (category.includes("joint commission") || category.includes("cdc") || category.includes("accreditation")) {
      groups.accreditation.push(result);
    } else if (result.facility_id) {
      groups.facility.push(result);
    } else {
      groups.other.push(result);
    }
  }

  return groups;
}

/**
 * Format individual regulation entry with proper truncation and metadata
 */
function formatRegulationEntry(reg: RegulationSource, index: number): string {
  const maxContentLength = 600;
  let content = (reg.content || "").replace(/\s+/g, " ").trim();
  
  if (content.length > maxContentLength) {
    content = content.slice(0, maxContentLength).trim() + "...";
  }

  // Extract regulation number from metadata or title if available
  const regNumber = extractRegulationNumber(reg);
  const regNumberText = regNumber ? `${regNumber} ` : "";
  
  // Source URL if available
  const sourceText = reg.source_url ? ` [Source](${reg.source_url})` : "";
  
  // State indicator
  const stateText = reg.state ? `[${reg.state}] ` : "";
  
  // Category indicator
  const categoryText = reg.category ? `[${reg.category}] ` : "";

  return `(${index}) ${stateText}${categoryText}${regNumberText}${reg.title}${sourceText}\n${content}\n\n`;
}

/**
 * Extract regulation number from various sources
 */
function extractRegulationNumber(reg: RegulationSource): string | null {
  // Check metadata first
  if (reg.metadata?.regulation_number) {
    return reg.metadata.regulation_number;
  }
  
  // Look for CFR patterns in title or content
  const text = `${reg.title} ${reg.content}`.slice(0, 200);
  const cfrMatch = text.match(/\b\d{1,2}\s+CFR\s+\d+\.\d+[a-z]?\b/i);
  if (cfrMatch) {
    return cfrMatch[0];
  }
  
  // Look for F-tag patterns
  const ftagMatch = text.match(/F-?tag\s*\d+/i);
  if (ftagMatch) {
    return ftagMatch[0];
  }
  
  return null;
}

/**
 * Legacy function name for backward compatibility
 */
export const buildRAGContext = buildRagContext;