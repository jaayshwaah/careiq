'use client';

import { useState } from 'react';

export default function ChatComposer({ conversationId }: { conversationId: string }) {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const content = value.trim();
    if (!content) return;
    setSending(true);
    setValue('');

    // Single call that saves the user message, calls OpenAI, and saves assistant message
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ conversationId, content }),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Unknown error' }));
      alert(`Chat failed: ${error}`);
      setSending(false);
      return;
    }

    // Reload messages
    window.location.reload();
  };

  return (
    <div className="mx-auto max-w-3xl">
      <textarea
        className="w-full rounded border p-3"
        rows={3}
        placeholder="Message CareIQ…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sending) send();
          }
        }}
        disabled={sending}
      />
      <div className="mt-2 flex justify-end">
        <button className="rounded border px-4 py-2" onClick={send} disabled={sending}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
