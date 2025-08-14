"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Chat, Message } from "@/types";
import { timeAgo } from "@/lib/utils";
import HeaderBanner from "@/components/HeaderBanner";
import { Send } from "lucide-react";

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
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const p = (navigator as any).userAgentData?.platform || navigator.platform || "";
    return /Mac|iPhone|iPad|Macintosh/.test(p);
  }, []);

  const sendHint = isMac ? (
    <span className="text-xs text-gray-600 dark:text-white/50">
      Press <kbd>Return</kbd> to send • <kbd>Shift</kbd>+<kbd>Return</kbd> for newline
    </span>
  ) : (
    <span className="text-xs text-gray-600 dark:text-white/50">
      Press <kbd>Enter</kbd> to send • <kbd>Shift</kbd>+<kbd>Enter</kbd> for newline
    </span>
  );

  async function sendCurrent() {
    const text = input.trim();
    if (!text) return;
    setBusy(true);
    try {
      await onSend(text);
      setInput("");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!busy) void sendCurrent();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
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

  // ----- EMPTY / NEW CHAT VIEW -----
  if (!chat || (messages?.length ?? 0) === 0) {
    return (
      <div className="flex h-full flex-col">
        <HeaderBanner />

        {/* Center composer, like ChatGPT before first message */}
        <div className="mx-auto w-full max-w-2xl px-6 pt-2">
          <form
            onSubmit={handleSubmit}
            className="glass ring-1 ring-black/10 dark:ring-white/10 rounded-2xl p-3 shadow-soft focus-within:ring-2 focus-within:ring-black/20 dark:focus-within:ring-white/20 transition"
            aria-label="Message composer (centered)"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                className="max-h-40 min-h-[68px] w-full resize-y rounded-xl bg-transparent px-3 py-3 text-[15px] leading-relaxed placeholder:text-ink-subtle focus:outline-none disabled:opacity-60"
                placeholder="Message CareIQ"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={busy}
              />
              <button
                type="submit"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition
                           ring-1 ring-black/10 dark:ring-white/10
                           bg-white/70 hover:bg-white/90 active:bg-white
                           dark:bg-white/10 dark:hover:bg-white/15
                           shadow-soft hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!input.trim() || busy}
                title="Send"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
            <div className="mt-1 flex items-center justify-between px-1">
              {sendHint}
              <div className="text-[11px] text-ink-subtle" aria-hidden>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </form>
        </div>

        {/* Snug animated suggestion chips */}
        <Suggestions onSend={(t) => !busy && onSend(t)} />
      </div>
    );
  }

  // ----- ACTIVE CHAT VIEW -----
  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 mx-4 mb-1 mt-1 rounded-2xl px-3 py-2 text-sm text-ink-subtle backdrop-blur-md lg:mx-6">
        {chat?.title || "New chat"}
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 pb-[140px] pt-6 md:px-6"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((m) => <MessageBubble key={m.id} m={m} />)}
        <div ref={endRef} />
      </div>

      {/* Bottom composer appears after first message */}
      <form
        onSubmit={handleSubmit}
        className="pointer-events-auto sticky inset-x-0 bottom-0 mx-4 pb-2 pt-1 md:mx-6"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        aria-label="Message composer (bottom)"
      >
        <div className="glass ring-1 ring-black/10 dark:ring-white/10 rounded-2xl p-2 shadow-soft focus-within:ring-2 focus-within:ring-black/20 dark:focus-within:ring-white/20 transition">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              className="max-h-40 min-h-[52px] w-full resize-y rounded-xl bg-transparent px-3 py-3 text-[15px] leading-relaxed placeholder:text-ink-subtle focus:outline-none disabled:opacity-60"
              placeholder="Message CareIQ"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={busy}
              aria-label="Message input"
            />
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition
                         ring-1 ring-black/10 dark:ring-white/10
                         bg-white/70 hover:bg-white/90 active:bg-white
                         dark:bg-white/10 dark:hover:bg-white/15
                         shadow-soft hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!input.trim() || busy}
              aria-disabled={!input.trim() || busy}
              title="Send"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <div className="mt-1 flex items-center justify-between px-1">
            {sendHint}
            <div className="text-[11px] text-ink-subtle" aria-hidden>
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ---------- Suggestions (snug gradient + hover ripple) ---------- */

function Suggestions({ onSend }: { onSend: (t: string) => void }) {
  const choices = [
    "Summarize this article",
    "Draft an email",
    "Explain something",
    "Create a plan",
  ];

  const palettes = useMemo(() => {
    const seeds: [string, string][] = [
      ["#8bb0ff", "#a0e3ff"],
      ["#b8f3d4", "#8fd8ff"],
      ["#ffd6a5", "#cdb4ff"],
      ["#ffcad4", "#cce6ff"],
      ["#c1ffd7", "#ffd1f7"],
    ];
    const shuffled = [...seeds].sort(() => Math.random() - 0.5).slice(0, choices.length);
    return shuffled;
  }, []);

  // randomize blur per chip for organic look
  const blurs = useMemo(() => choices.map(() => (12 + Math.floor(Math.random()*8))), []);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 pb-24 pt-4">
      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
        {choices.map((t, i) => (
          <div key={t} className="relative inline-block group">
            <span
              className="pointer-events-none absolute inset-0 -z-10 rounded-2xl opacity-90 animate-blob transition-transform duration-300 group-hover:scale-[1.03]"
              style={{ background: `linear-gradient(120deg, ${palettes[i][0]}, ${palettes[i][1]})`, filter: `blur(${blurs[i]}px)` }}
              aria-hidden
            />
            <button
              onClick={() => onSend(t)}
              className="relative z-[1] overflow-hidden rounded-2xl bg-white/60 px-3 py-2 text-left transition hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/15 ring-1 ring-black/10 dark:ring-white/10 shadow-soft"
            >
              {/* simple hover ripple */}
              <span
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-10 group-active:opacity-20"
                style={{ background: "radial-gradient(180px 180px at 50% 50%, rgba(0,0,0,.3), transparent 60%)" }}
                aria-hidden
              />
              {t}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Message bubble ---------- */

function MessageBubble({ m }: { m: Message }) {
  const isUser = m.role === "user";
  const bubbleClasses = isUser
    ? "bg-gradient-to-br from-[#3c5ebf] to-[#2d4aa0] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.15)]"
    : "bg-white/70 dark:bg-white/10 border border-border dark:border-border-dark";
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
