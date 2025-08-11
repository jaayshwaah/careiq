"use client";
import { useEffect, useRef, useState } from "react";
import type { Chat, Message } from "@/types";
import { timeAgo } from "@/lib/utils";

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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll when messages change
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [chat?.messages.length]);

  // Auto-focus on mount / when switching chats
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
    return () => clearTimeout(t);
  }, [chat?.id]);

  async function sendCurrent() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");
    try {
      await onSend(text);
    } finally {
      setBusy(false);
      // Refocus after sending
      inputRef.current?.focus({ preventScroll: true });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendCurrent();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter newline; ignore if composing or with modifiers
    if (e.key === "Enter" && !e.shiftKey && !(e as any).isComposing && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      void sendCurrent();
    }
  }

  if (!chat) {
    // Home view with composer
    return (
      <div className="flex h-full flex-col">
        <div className="m-auto max-w-2xl px-6 pb-40 pt-10 text-center">
          <div className="mb-3 text-2xl font-semibold tracking-tight">Welcome to CareIQ</div>
          <p className="mb-6 text-white/60">
            Ask anything. Your chat history stays on this device (for now). Connect a model later for smarter replies.
          </p>

          <div className="mx-auto mb-6 grid max-w-xl grid-cols-2 gap-2 text-left text-sm">
            {[
              "Summarize this article",
              "Draft an email to a family",
              "Explain PBJ reporting",
              "Create a staffing plan",
            ].map((t) => (
              <button
                key={t}
                onClick={() => !busy && onSend(t)}
                className="rounded-xl bg-white/5 px-3 py-2 text-left hover:bg-white/10 disabled:opacity-50"
                disabled={busy}
              >
                {t}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#0b0b0b] p-2 shadow-2xl"
          >
            <textarea
              ref={inputRef}
              className="max-h-40 min-h-[56px] w-full resize-y rounded-xl bg-transparent px-3 py-3 outline-none placeholder:text-white/40 disabled:opacity-60"
              placeholder="Message CareIQ"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={busy}
            />
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-xs text-white/40">Enter to send • Shift+Enter newline</span>
              <button
                type="submit"
                className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
                disabled={!input.trim() || busy}
              >
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-black/60 px-6 py-3 backdrop-blur">
        <div className="text-center text-sm font-medium text-white/80">
          {chat.title || "New chat"}
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 pb-24 pt-6">
        {chat.messages.length === 0 ? (
          <EmptyState onSend={onSend} />
        ) : (
          chat.messages.map((m) => <MessageBubble key={m.id} m={m} />)
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="absolute inset-x-0 bottom-0 mx-4 mb-4 rounded-2xl border border-white/10 bg-[#0b0b0b] p-2 shadow-2xl"
      >
        <textarea
          ref={inputRef}
          className="max-h-40 min-h-[48px] w-full resize-y rounded-xl bg-transparent px-3 py-3 outline-none placeholder:text-white/40 disabled:opacity-60"
          placeholder="Message CareIQ"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
        />
        <div className="flex items-center justify-between px-1 pb-1">
          <span className="text-xs text-white/40">Enter to send • Shift+Enter newline</span>
          <button
            type="submit"
            className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
            disabled={!input.trim() || busy}
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ m }: { m: Message }) {
  const isUser = m.role === "user";
  return (
    <div className={`mb-4 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2 text-[15px] leading-relaxed ${
          isUser ? "bg-white text-black" : "bg-white/5 text-white"
        }`}
      >
        <div className="whitespace-pre-wrap">{m.content}</div>
        <div className={`mt-1 text-[11px] ${isUser ? "text-black/60" : "text-white/50"}`}>
          {timeAgo(m.createdAt)}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onSend }: { onSend: (text: string) => void | Promise<void> }) {
  return (
    <div className="m-auto max-w-xl p-8 text-center">
      <div className="mb-4 text-2xl font-semibold tracking-tight">Welcome to CareIQ</div>
      <p className="mb-6 text-white/60">
        Ask anything. Your chat history lives on this device. Connect a model later for smarter replies.
      </p>
      <div className="grid grid-cols-2 gap-2 text-left text-sm">
        {[
          "Summarize this article",
          "Draft an email to a family",
          "Explain PBJ reporting",
          "Create a staffing plan",
        ].map((t) => (
          <button
            key={t}
            onClick={() => onSend(t)}
            className="rounded-xl bg-white/5 px-3 py-2 text-left hover:bg-white/10"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
