"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Composer from "@/components/Composer";

/** One-time headline (random per visit/refresh). */
function StaticHeading({
  phrases,
}: {
  phrases: string[];
}) {
  const [idx, setIdx] = useState<number | null>(null);

  useEffect(() => {
    // Choose a stable random index per visit after mount (avoids SSR window/crypto issues)
    try {
      // Prefer cryptographic randomness when available
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
        {/* Render a non-breaking space until we pick a phrase on the client to avoid SSR mismatch */}
        {idx === null ? "\u00A0" : phrases[idx]}
      </h1>
    </div>
  );
}

/**
 * Home page chat:
 * - Creates a new chat on first send
 * - Redirects to /chat/[id]?q=<initial message> so Chat.tsx auto-sends it
 * - Big static (per-visit) headline + glowing suggestion area + large composer
 */
export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [creating, setCreating] = useState(false);

  const suggestions = useMemo(
    () => ["Summarize this", "Draft an email", "Explain a topic", "Create a plan"],
    []
  );

  const headlinePhrases = useMemo(
    () => [
      "Ask me anything",
      "Summarize this",
      "Draft an email",
      "Brainstorm ideas",
      "Explain a topic",
      "Create a plan",
    ],
    []
  );

  const handleSend = async (text: string) => {
    const content = text.trim();
    if (!content || creating) return;
    try {
      setCreating(true);
      // Create a chat
      const res = await fetch("/api/chats", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create chat");
      const created = await res.json();
      const id = created?.id;
      if (!id) throw new Error("No chat id returned");

      // Redirect and pass the initial message as ?q= so Chat.tsx will auto-send it
      const url = `/chat/${encodeURIComponent(id)}?q=${encodeURIComponent(content)}`;
      router.push(url);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col">
      <main className="flex-1 grid place-content-center px-6 py-10">
        <div className="mx-auto w-full max-w-2xl">
          {/* Static per-visit headline (raised and above composer) */}
          <StaticHeading phrases={headlinePhrases} />

          {/* Large composer */}
          <Composer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            disabled={creating}
            placeholder="Message CareIQ…"
            size="lg"
            className="shadow-soft"
          />

          {/* Suggestions with soft gradient glow */}
          <div className="relative mt-6">
            <span
              className="pointer-events-none absolute inset-x-8 -top-3 bottom-0 -z-10 rounded-[28px] blur-2xl opacity-60"
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
                  onClick={() => setInput(t)}
                  className="rounded-2xl bg-white/60 px-3 py-2 ring-1 ring-black/10 dark:ring-white/10 dark:bg-white/10 shadow-soft hover:bg-white/80 dark:hover:bg-white/15"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
