"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Composer from "@/components/Composer";

/** Types */
type ChatRole = "system" | "user" | "assistant";
type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string; // ISO
};

function uid(prefix = "msg") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** One-time headline (random per visit/refresh). */
function StaticHeading({ phrases }: { phrases: string[] }) {
  const [idx, setIdx] = useState<number | null>(null);

  useEffect(() => {
    try {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      setIdx(arr[0] % phrases.length);
    } catch {
      setIdx(Math.floor(Math.random() * phrases.length));
    }
  }, [phrases.length]);

  return (
    <div className="relative z-10 -mt-2 mb-6 text-center">
      <h1
        className="text-4xl md:text-5xl font-semibold tracking-tight"
        aria-live="polite"
        aria-atomic="true"
        suppressHydrationWarning
      >
        {idx === null ? "\u0000" : phrases[idx]}
      </h1>
    </div>
  );
}

/**
 * Home page chat:
 * - Stays on the same page (no redirect)
 * - Hero header + suggestions before the first message
 * - After first message: standard chat view with sticky composer (ChatGPT style)
 */
export default function HomePage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  // TODO: wire this to your auth user later
  const userName = "Jay";

  const suggestions = useMemo(
    () => ["Summarize this", "Draft an email", "Explain a topic", "Create a plan"],
    []
  );

  const headlinePhrases = useMemo(
    () => [
      `Good to see you, ${userName}.`,
      "Ask me anything",
      "Summarize this",
      "Draft an email",
      "Brainstorm ideas",
      "Explain a topic",
      "Create a plan",
    ],
    [userName]
  );

  const listRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom when new messages append
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  /** Send a message and append assistant reply (no redirect) */
  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    const userMsg: ChatMessage = {
      id: uid("user"),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    setSending(true);
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} ${text}`);
      }

      const data = (await res.json()) as {
        message: { id: string; role: ChatRole; content: string; createdAt: string };
      };

      const assistantMsg: ChatMessage = {
        id: data.message.id || uid("asst"),
        role: "assistant",
        content: data.message.content || "Sorry — the model returned no text.",
        createdAt: data.message.createdAt || new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const fallback: ChatMessage = {
        id: uid("asst"),
        role: "assistant",
        content:
          "I hit an error generating the reply. If you’re using OpenRouter, check your API key/credits. (You’ll still get a mock reply if there’s no key.)",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallback]);
      // console.error("[complete]", err);
    } finally {
      setSending(false);
      setInput("");
    }
  }

  const showHero = messages.length === 0;

  return (
    <div className="flex min-h-svh flex-col">
      {/* Before first message: centered hero */}
      {showHero ? (
        <main className="flex-1 grid place-content-center px-6 py-10">
          <div className="mx-auto w-full max-w-2xl">
            <StaticHeading phrases={headlinePhrases} />

            {/* Large composer */}
            <Composer
              value={input}
              onChange={setInput}
              onSend={() => handleSend()}
              disabled={sending}
              placeholder="Message CareIQ..."
              size="lg"
              className="shadow-soft"
            />

            {/* Suggestions with soft gradient glow */}
            <div className="relative mt-6">
              <span
                className="pointer-events-none absolute inset-x-8 -top-3 bottom-0 z-10 rounded-[28px] blur-2xl opacity-60"
                style={{
                  background:
                    "linear-gradient(120deg, rgba(139,176,255,.8), rgba(255,214,165,.7), rgba(193,255,215,.8))",
                }}
                aria-hidden
              />
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
                {suggestions.map((t) => (
                  <button
                    key={t}
                    onClick={() => handleSend(t)}
                    className="rounded-2xl bg-white/60 px-3 py-1.5 text-sm hover:bg-white/80 transition-colors"
                    disabled={sending}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>
      ) : (
        // After first message: chat view + sticky composer at bottom
        <>
          <main className="flex-1">
            <div className="mx-auto w-full max-w-3xl px-4">
              <div ref={listRef} className="pt-6 pb-28 overflow-y-auto min-h-[60vh]">
                <MessageList messages={messages} />
              </div>
            </div>
          </main>
          <div className="sticky bottom-0 w-full border-t border-neutral-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="mx-auto max-w-3xl px-4 py-3">
              <Composer
                value={input}
                onChange={setInput}
                onSend={() => handleSend()}
                disabled={sending}
                placeholder="Message CareIQ..."
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Simple message list (inline for convenience; you can move to a separate file if you prefer) */
function MessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="flex flex-col gap-4">
      {messages.map((m) => (
        <div key={m.id} className="flex">
          <div className="max-w-full rounded-2xl px-4 py-3 border border-neutral-200 bg-white">
            <div className="text-xs font-medium text-neutral-500 mb-1">
              {m.role === "user" ? "You" : m.role === "assistant" ? "CareIQ" : "System"}
            </div>
            <div className="prose prose-neutral">
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
            <div className="mt-1 text-[11px] text-neutral-400">
              {new Date(m.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
