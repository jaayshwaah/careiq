"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Composer from "@/components/Composer";

/**
 * Home page chat:
 * - Creates a new chat on first send
 * - Redirects to /chat/[id]?q=<initial message> so Chat.tsx auto-sends it
 */
export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [creating, setCreating] = useState(false);

  const suggestions = useMemo(
    () => ["Summarize this", "Draft an email", "Explain a topic", "Create a plan"],
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
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold">CareIQ</h1>
            <p className="text-ink-subtle mt-1">How can I help today?</p>
          </div>

          <Composer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            disabled={creating}
            placeholder="Message CareIQ…"
            className="shadow-soft"
          />

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:gap-3">
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
      </main>
    </div>
  );
}
