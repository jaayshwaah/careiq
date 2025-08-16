// src/components/KnowledgeSearchDemo.tsx
"use client";

import { useState } from "react";
import { useKnowledgeSearch } from "@/lib/knowledge/useKnowledgeSearch";

export default function KnowledgeSearchDemo({ facilityId }: { facilityId?: string }) {
  const [q, setQ] = useState("");
  const { loading, results, error, search } = useKnowledgeSearch();

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask about CMS, survey prep, policies…"
          className="flex-1 rounded-xl border px-4 py-3"
        />
        <button
          onClick={() => search(q, { facilityId })}
          className="rounded-xl px-4 py-3 border bg-black text-white"
          disabled={loading || !q}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <ul className="space-y-3">
        {results.map((r) => (
          <li key={r.id} className="rounded-xl border p-4 bg-white">
            <div className="text-sm text-gray-500">{r.category}</div>
            <div className="font-semibold">{r.title}</div>
            <div className="mt-2 text-gray-700 whitespace-pre-wrap line-clamp-6">
              {r.content}
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {r.source_url ? <a href={r.source_url} target="_blank" className="underline">Source</a> : "Uploaded"}
              {typeof r.similarity === "number" && (
                <span className="ml-2">• score {(r.similarity).toFixed(3)}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
