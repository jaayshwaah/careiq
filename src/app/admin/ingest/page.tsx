"use client";
import { useState, useEffect } from "react";

export default function IngestPage() {
  const [facilityId, setFacilityId] = useState("");
  const [category, setCategory] = useState("MDS");
  const [token, setToken] = useState("");
  const [result, setResult] = useState<string>("");
  const [docs, setDocs] = useState<any[]>([]);

  async function loadDocs() {
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "*", topK: 50, facilityId: facilityId || null, category: category || null }),
      });
      const json = await res.json();
      if (json.ok) setDocs(json.results || []);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadDocs();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setResult("Uploading...");
    const res = await fetch("/api/ingest", {
      method: "POST",
      headers: token ? { "x-admin-token": token } : undefined,
      body: fd,
    });
    const json = await res.json();
    setResult(JSON.stringify(json, null, 2));
    loadDocs();
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Ingest Documents</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input name="facility_id" placeholder="facility_id (e.g., pvh)" className="w-full border rounded px-3 py-2" value={facilityId} onChange={(e) => setFacilityId(e.target.value)} required />
        <input name="category" placeholder="category (e.g., MDS)" className="w-full border rounded px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)} />
        <input name="source_url" placeholder="optional source URL" className="w-full border rounded px-3 py-2" />
        <input name="last_updated" placeholder="optional last_updated (YYYY-MM-DD)" className="w-full border rounded px-3 py-2" />
        <div>
          <label className="block text-sm mb-1">Files</label>
          <input name="files" type="file" multiple className="w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">X-Admin-Token</label>
          <input placeholder="ADMIN_INGEST_KEY" className="w-full border rounded px-3 py-2" value={token} onChange={(e) => setToken(e.target.value)} />
        </div>
        <button className="px-4 py-2 rounded bg-black text-white">Ingest</button>
      </form>

      {result && <pre className="bg-gray-100 text-sm p-3 rounded whitespace-pre-wrap break-words">{result}</pre>}

      <div className="pt-6">
        <h2 className="text-xl font-semibold mb-2">Currently Ingested</h2>
        {docs.length === 0 ? (
          <p className="text-sm text-gray-500">No documents found</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {docs.map((d: any) => (
              <li key={d.id} className="border p-2 rounded">
                <strong>{d.title}</strong> ({d.category || "general"})
                <div className="text-gray-600 truncate">{d.content.slice(0,120)}...</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}