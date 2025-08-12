"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const endRef = useRef<HTMLDivElement>(null);

  const messages: Message[] = useMemo(() => chat?.messages ?? [], [chat?.messages]);

  // Auto-scroll when messages change
  useEffect(() => {
    // Scroll the container, then ensure the sentinel is visible
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

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
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !(e as any).isComposing &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey
    ) {
      e.preventDefault();
      void sendCurrent();
    }
  }

  if (!chat) {
    // Home view with starter suggestions + composer (light-first)
    return (
      <div className="flex h-full flex-col">
        <div className="m-auto w-full max-w-2xl px-6 pb-40 pt-10">
          <div className="mb-3 text-center text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Welcome to CareIQ
          </div>
          <p className="mb-6 text-center text-sm text-gray-600 dark:text-white/60">
            Ask anything. Your chat history stays on this device (for now). Connect a model later for smarter replies.
          </p>

          <div className="mx-auto mb-6 grid max-w-xl grid-cols-2 gap-2 text-left text-sm">
            {["Summarize this article", "Draft an email to a family", "Explain PBJ reporting", "Create a staffing plan"].map(
              (t) => (
                <button
                  key={t}
                  onClick={() => !busy && onSend(t)}
                  className="rounded-xl px-3 py-2 text-left transition bg-black/[0.05] hover:bg-black/[0.08] dark:bg-white/10 dark:hover:bg-white/15 disabled:opacity-50"
                  disabled={busy}
                >
                  {t}
                </button>
              )
            )}
          </div>

          <form onSubmit={handleSubmit} className="panel mx-auto max-w-2xl p-2 dark:shadow-2xl">
            <textarea
              ref={inputRef}
              className="input max-h-40 min-h-[56px] w-full resize-y rounded-xl bg-transparent px-3 py-3 disabled:opacity-60"
              placeholder="Message CareIQ"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={busy}
              aria-label="Message input"
            />
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-xs text-gray-600 dark:text-white/50">
                Enter to send • Shift+Enter newline
              </span>
              <button
                type="submit"
                className="btn-solid rounded-lg px-4 py-1.5 text-sm font-medium focus:ring-2"
                disabled={!input.trim() || busy}
                aria-disabled={!input.trim() || busy}
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
      <div className="sticky top-0 z-10 border-b border-black/10 bg-white/80 px-6 py-3 backdrop-blur dark:border-white/10 dark:bg-[#0b0b0b]/70">
        <div className="text-center text-sm font-medium text-gray-900 dark:text-white">
          {chat.title || "New chat"}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 pb-[140px] pt-6 md:px-6"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 ? (
          <EmptyState onSend={onSend} />
        ) : (
          messages.map((m) => <MessageBubble key={m.id} m={m} />)
        )}
        <div ref={endRef} />
      </div>

      {/* Composer (sticky dock) */}
      <form
        onSubmit={handleSubmit}
        className="pointer-events-auto sticky inset-x-0 bottom-0 mx-4 mb-4 rounded-2xl border p-2 shadow-soft bg-white border-black/10 dark:bg-[#0b0b0b] dark:border-white/10 md:mx-6"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        aria-label="Message composer"
      >
        <textarea
          ref={inputRef}
          className="input max-h-40 min-h-[48px] w-full resize-y rounded-xl bg-transparent px-3 py-3 disabled:opacity-60"
          placeholder="Message CareIQ"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
          aria-label="Message input"
        />
        <div className="flex items-center justify-between px-1 pb-1">
          <span className="text-xs text-gray-600 dark:text-white/50">Enter to send • Shift+Enter newline</span>
          <button
            type="submit"
            className="btn-solid rounded-lg px-4 py-1.5 text-sm font-medium focus:ring-2"
            disabled={!input.trim() || busy}
            aria-disabled={!input.trim() || busy}
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Bubbles ---------- */

function MessageBubble({ m }: { m: Message }) {
  const isUser = m.role === "user";
  const bubbleClasses = isUser
    ? "bg-black text-white dark:bg-white dark:text-black" // user bubble: solid contrast
    : "bg-black/[0.05] text-gray-900 dark:bg-white/10 dark:text-white"; // assistant bubble: soft panel

  const metaClasses = isUser ? "text-white/70 dark:text-black/60" : "text-gray-600 dark:text-white/50";

  return (
    <div className={`mb-4 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] rounded-2xl px-4 py-2 text-[15px] leading-relaxed shadow-soft ${bubbleClasses}`}>
        <div className="whitespace-pre-wrap">{m.content}</div>
        <div className={`mt-1 text-[11px] ${metaClasses}`}>{timeAgo(m.createdAt)}</div>
      </div>
    </div>
  );
}

/* ---------- Empty ---------- */

function EmptyState({ onSend }: { onSend: (text: string) => void | Promise<void> }) {
  return (
    <div className="m-auto max-w-xl p-8 text-center">
      <div className="mb-4 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
        Welcome to CareIQ
      </div>
      <p className="mb-6 text-sm text-gray-600 dark:text-white/60">
        Ask anything. Your chat history lives on this device. Connect a model later for smarter replies.
      </p>
      <div className="grid grid-cols-2 gap-2 text-left text-sm">
        {["Summarize this article", "Draft an email to a family", "Explain PBJ reporting", "Create a staffing plan"].map(
          (t) => (
            <button
              key={t}
              onClick={() => onSend(t)}
              className="rounded-xl px-3 py-2 text-left transition bg-black/[0.05] hover:bg-black/[0.08] dark:bg-white/10 dark:hover:bg-white/15"
            >
              {t}
            </button>
          )
        )}
      </div>
    </div>
  );
}
