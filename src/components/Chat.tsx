"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Msg = { id: string; chat_id: string; role: "user" | "assistant"; content: string; created_at: string };

export default function Chat({ chatId }: { chatId: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Load messages from your API instead of instantiating Supabase directly
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // simple fetcher that reads the DB through your server routes if you have one
        // If you don’t have an API for listing messages, we’ll call Supabase directly in the browser:
        const res = await fetch(`/api/chats?id=${chatId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("messages list via /api/chats not available");

        const json = await res.json();
        const dbMsgs: Msg[] = json?.messages ?? []; // Your /api/chats GET can include messages for convenience
        if (mounted) {
          setMsgs(dbMsgs);
          scrollToBottom();
        }
      } catch {
        // Fallback: query messages directly if you prefer (uncomment if you have supabaseClient wired)
        // const { supabase } = await import("@/lib/supabaseClient");
        // const { data } = await supabase.from("messages").select("*").eq("chat_id", chatId).order("created_at", { ascending: true });
        // if (mounted) setMsgs((data as Msg[]) || []);
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

    // Kick off server streaming (your /api/chat handles persistence)
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

  return (
    <div className="flex h-[calc(100vh-132px)] flex-col gap-4">
      {/* Transcript */}
      <div className="glass flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 sm:p-6">
          <div ref={listRef} className="mx-auto flex max-w-2xl flex-col gap-3">
            {msgs.length === 0 ? (
              <div className="text-center text-sm text-ink-subtle">
                Start a conversation — I’ll respond in the same thread.
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

      {/* Composer */}
      <form onSubmit={onSend} className="glass mx-auto w-full max-w-2xl p-2 sm:p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message CareIQ…"
            className="min-h-[52px] max-h-[40vh] resize-y rounded-xl border-0 bg-transparent focus-visible:ring-0"
          />
          <Button type="submit" className="rounded-xl px-3" disabled={!input.trim()}>
            <SendHorizonal className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
        <div className="mt-2 text-center text-xs text-ink-subtle">
          CareIQ can make mistakes. Consider checking important info.
        </div>
      </form>
    </div>
  );
}
