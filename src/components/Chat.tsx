"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Msg = { id: string; chat_id: string; role: "user" | "assistant"; content: string; created_at: string };

const HEADLINES = [
  "How can I help today?",
  "What are we building?",
  "Ask me anything.",
  "Ready when you are.",
];

const SUGGESTIONS = [
  "Summarize this article",
  "Brainstorm feature ideas",
  "Draft an email reply",
  "Explain a concept simply",
];

export default function Chat({ chatId }: { chatId: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [headlineIdx, setHeadlineIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Rotate headline every 2.5s
  useEffect(() => {
    const t = setInterval(() => setHeadlineIdx((i) => (i + 1) % HEADLINES.length), 2500);
    return () => clearInterval(t);
  }, []);

  // Load messages via API (server pulls from Supabase)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/chats?id=${chatId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load messages");
        const json = await res.json();
        const dbMsgs: Msg[] = json?.messages ?? [];
        if (mounted) {
          setMsgs(dbMsgs);
          scrollToBottom();
        }
      } catch {
        // soft-fail; empty state will render
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setInput("");
    const optimistic: Msg = {
      id: crypto.randomUUID(),
      chat_id: chatId,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMsgs((m) => [...m, optimistic]);
    scrollToBottom();

    await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ chatId, content: text }),
    });
  };

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }

  function useSuggestion(text: string) {
    setInput(text);
  }

  const showEmptyState = msgs.length === 0;

  return (
    <div className="flex h-[calc(100vh-32px)] flex-col gap-4">
      {/* Transcript / Empty state */}
      <div className="glass flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 sm:p-6">
          <div ref={listRef} className="mx-auto flex max-w-2xl flex-col gap-3">
            {showEmptyState ? (
              <div className="mb-2 mt-2 text-center">
                <div className="text-2xl font-semibold tracking-tight animate-fadeUp">{HEADLINES[headlineIdx]}</div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => useSuggestion(s)}
                      className="suggestion-tile"
                      type="button"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              msgs.map((m) => (
                <div key={m.id} className={`message ${m.role}`}>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Composer with stronger outline */}
      <form onSubmit={onSend} className="composer mx-auto w-full max-w-2xl">
        <div className="flex items-end gap-2 p-2 sm:p-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message CareIQ…"
            className="min-h-[56px] max-h-[40vh] resize-y rounded-xl bg-transparent focus-visible:ring-0"
          />
          <Button type="submit" className="rounded-xl px-3" disabled={!input.trim()}>
            <SendHorizonal className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
