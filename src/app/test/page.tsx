// src/app/test/page.tsx
"use client";
import { useState } from "react";

export default function TestPage() {
  const [txt, setTxt] = useState("");
  const [resp, setResp] = useState("");

  async function send() {
    setResp("...");
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: txt }], useRag: false }),
    });
    const j = await r.json();
    setResp(JSON.stringify(j, null, 2));
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-3">
      <textarea className="w-full border rounded p-3" rows={5} value={txt} onChange={e=>setTxt(e.target.value)} />
      <button onClick={send} className="px-4 py-2 rounded bg-black text-white">Send</button>
      <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto">{resp}</pre>
    </div>
  );
}
