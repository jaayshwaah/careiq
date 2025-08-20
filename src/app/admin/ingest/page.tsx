"use client";
import { useState } from "react";

export default function IngestPage() {
  const [facilityId, setFacilityId] = useState("");
  const [category, setCategory] = useState("MDS");
  const [token, setToken] = useState("");
  const [result, setResult] = useState<string>("");

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
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Ingest Documents</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          name="facility_id"
          placeholder="facility_id (e.g., pvh)"
          className="w-full border rounded px-3 py-2"
          value={facilityId}
          onChange={(e) => setFacilityId(e.target.value)}
          required
        />
        <input
          name="category"
          placeholder="category (e.g., MDS)"
          className="w-full border rounded px-3 py-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <input
          name="source_url"
          placeholder="optional source URL"
          className="w-full border rounded px-3 py-2"
        />
        <input
          name="last_updated"
          placeholder="optional last_updated (YYYY-MM-DD)"
          className="w-full border rounded px-3 py-2"
        />
        <div>
          <label className="block text-sm mb-1">Files</label>
          <input name="files" type="file" multiple className="w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">X-Admin-Token</label>
          <input
            placeholder="ADMIN_INGEST_KEY"
            className="w-full border rounded px-3 py-2"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>
        <button className="px-4 py-2 rounded bg-black text-white">Ingest</button>
      </form>
      {result && (
        <pre className="bg-gray-100 text-sm p-3 rounded whitespace-pre-wrap break-words">{result}</pre>
      )}
    </div>
  );
}