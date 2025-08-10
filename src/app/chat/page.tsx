// src/app/chat/page.tsx
'use client';

import { useState } from 'react';

type Msg = { role: 'system' | 'user' | 'assistant'; content: string };

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'system', content: 'You are CareIQ, a helpful assistant for senior care operations.' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage() {
    if (!input.trim()) return;
    setError(null);
    const next = [...messages, { role: 'user', content: input }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      const reply = data?.reply ?? '(no reply)';
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">CareIQ Chat</h1>

      <div className="border rounded-xl p-4 space-y-3 bg-black/5">
        {messages
          .filter(m => m.role !== 'system')
          .map((m, i) => (
            <div key={i} className={`p-3 rounded-lg ${m.role === 'user' ? 'bg-white' : 'bg-gray-100'}`}>
              <div className="text-xs uppercase tracking-wider opacity-70">{m.role}</div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
        {loading && <div className="text-sm opacity-70">…thinking</div>}
        {error && <div className="text-sm text-red-600">Error: {error}</div>}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border rounded-lg px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask CareIQ anything…"
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60"
          onClick={sendMessage}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </main>
  );
}
