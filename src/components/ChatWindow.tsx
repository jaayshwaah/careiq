// src/components/ChatWindow.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { Chat, Message } from "@/types";
import HeaderBanner from "@/components/HeaderBanner";
import Suggestions from "@/components/Suggestions";

export default function ChatWindow({
  chat,
  onSend,
}: {
  chat: Chat | null;
  onSend: (content: string) => Promise<void>;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = (chat?.messages || []) as Message[];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function sendCurrent() {
    if (!input.trim() || busy) return;
    const text = input;
    setInput("");
    setBusy(true);
    try {
      await onSend(text);
    } finally {
      setBusy(false);
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!busy) void sendCurrent();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !(e as any).isComposing) {
      e.preventDefault();
      if (!busy) void sendCurrent();
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex min-h-[60vh] flex-col gap-4">
      {empty && <HeaderBanner />}

      {/* Messages */}
      <div ref={listRef} className="flex-1">
        <div className="flex flex-col gap-4">
          {messages.map((m) => (
            <div key={m.id} className="rounded-xl border border-black/10 dark:border-white/10 p-4">
              <div className="text-xs mb-1 opacity-60">{m.role}</div>
              <div>{m.content}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="glass ring-1 ring-black/10 dark:ring-white/10 rounded-2xl p-3"
        aria-label="Message composer"
      >
        <textarea
          id="composer-input"
          ref={inputRef}
          className="max-h-40 min-h-[72px] w-full resize-none bg-transparent outline-none"
          placeholder="Message CareIQ"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
        />
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="rounded-full px-4 py-2 text-sm bg-black text-white disabled:opacity-60 dark:bg-white dark:text-black"
            disabled={busy || !input.trim()}
          >
            Send
          </button>
        </div>
      </form>

      {/* Suggestions BELOW composer — prefill only */}
      <Suggestions onPick={setInput} targetId="composer-input" />
    </div>
  );
}
