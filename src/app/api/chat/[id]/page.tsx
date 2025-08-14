"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Msg = { id?: string; role: "user" | "assistant"; content: string; created_at?: string };

export default function ChatPage({ params }: { params: { id: string } }) {
  const chatId = params.id;
  const q = useSearchParams();
  const seed = q.get("seed"); // first message from homepage, if any

  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);

  // Load existing messages for this chat (best-effort)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      if (mounted && data) {
        setMessages(
          data.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            created_at: m.created_at,
          }))
        );
      }
    })();
    return () => {
      mounted = false;
    };
  }, [chatId]);

  // If we arrive with a seed message, auto-send it once
  React.useEffect(() => {
    let sent = false;
    async function sendSeed() {
      if (!seed || sent) return;
      sent = true;
      await sendMessage(seed);
    }
    sendSeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, chatId]);

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content || streaming) return;

    setMessages((prev) => [...prev, { role: "user", content }]);
    setStreaming(true);

    const res = await fetch("/api/messages/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, content }),
    });

    if (!res.ok || !res.body) {
      setStreaming(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let assistant = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);

      for (const line of chunk.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;

        try {
          const obj = JSON.parse(payload);
          const token = obj?.content;
          if (token) {
            assistant += token;
            setMessages((prev) => {
              const clone = [...prev];
              const last = clone[clone.length - 1];
              // if last is assistant, append; else push new assistant
              if (last && last.role === "assistant") {
                last.content += token;
              } else {
                clone.push({ role: "assistant", content: token });
              }
              return clone;
            });
          }
        } catch {
          // ignore partial frames
        }
      }
    }

    setStreaming(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendMessage(text);
  }

  return (
    <main className="flex h-svh flex-col">
      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div
                className={[
                  "inline-block rounded-2xl px-3 py-2",
                  m.role === "user"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-white/70 ring-1 ring-black/10 dark:bg-white/10 dark:ring-white/10",
                ].join(" ")}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Composer */}
      <form onSubmit={onSubmit} className="border-t border-black/10 dark:border-white/10">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            className="w-full resize-none rounded-2xl bg-white/70 dark:bg-white/10 ring-1 ring-black/10 dark:ring-white/10 px-3 py-2 outline-none"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={streaming || input.trim().length === 0}
              className={[
                "rounded-xl px-4 py-2 text-sm font-medium text-white",
                streaming ? "bg-neutral-400" : "bg-neutral-900 hover:bg-neutral-800",
                "dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100",
              ].join(" ")}
            >
              {streaming ? "Waiting…" : "Send"}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
