"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Composer from "@/components/Composer";
import MessageList from "@/components/MessageList";

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
 * Chat on the home page:
 * - No redirects; stays on `/`
 * - Hero (headline + suggestions) before first message
 * - After first message: ChatGPT-style thread with sticky composer
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
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

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
          "I hit an error generating the reply. If you’re using OpenRouter, check your API key/credits. (There’s a mock reply when the key is missing.)",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setSending(false);
      setInput("");
    }
  }

  const showHero = messages.length === 0;

  return (
    <div className="h-[100dvh] w-full flex flex-col">
      {/* HERO: before first message */}
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
        // CHAT VIEW: after first message
        <>
          {/* Make the center column a flex container with min-h-0 so the list can scroll */}
          <main className="flex-1 flex flex-col">
            <div className="mx-auto w-full max-w-3xl flex-1 flex flex-col min-h-0 px-4">
              {/* Scroll container */}
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto pt-6 pb-28"
                aria-live="polite"
                aria-busy={sending ? "true" : "false"}
              >
                <MessageList messages={messages} />
              </div>
            </div>
          </main>

          {/* Sticky composer (like ChatGPT) */}
          <div className="sticky bottom-0 w-full border-t border-neutral-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="mx-auto max-w-3xl px-4 py-3">
              <Composer
                value={input}
                onChange={setInput}
                onSend={() => handleSend()}
                disabled={sending}
                placeholder="Message CareIQ..."
              />
              <p className="mt-2 text-[11px] text-neutral-400 text-center">
                CareIQ can make mistakes. Check important info.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
