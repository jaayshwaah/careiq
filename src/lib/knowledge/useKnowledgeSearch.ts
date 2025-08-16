// src/lib/knowledge/useKnowledgeSearch.ts
import { useState } from "react";

export function useKnowledgeSearch() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function search(query: string, opts?: { category?: string; facilityId?: string; topK?: number }) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, ...opts }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Search failed");
      setResults(json.results || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return { loading, results, error, search };
}
