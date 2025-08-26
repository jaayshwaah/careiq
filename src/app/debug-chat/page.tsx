// src/app/debug-chat/page.tsx
"use client";

import { useState } from "react";

export default function DebugChatPage() {
  const [input, setInput] = useState("Hello, test message");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function testChat() {
    setLoading(true);
    setError("");
    setResponse("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: input }]
        }),
      });

      console.log("Response status:", res.status);
      console.log("Response headers:", Object.fromEntries(res.headers.entries()));

      const data = await res.json();
      console.log("Response data:", data);

      if (!res.ok) {
        setError(`HTTP ${res.status}: ${data.error || "Unknown error"}`);
        return;
      }

      if (data.content) {
        setResponse(data.content);
      } else {
        setError("No content in response: " + JSON.stringify(data));
      }

    } catch (err: any) {
      setError("Network error: " + err.message);
      console.error("Chat test error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Debug Chat API</h1>
      
      <div>
        <label className="block text-sm font-medium mb-2">Test Message:</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
          rows={3}
        />
      </div>

      <button
        onClick={testChat}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Testing..." : "Test Chat API"}
      </button>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-medium text-red-800">Error:</h3>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {response && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-medium text-green-800">Response:</h3>
          <p className="text-green-700 text-sm whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  );
}