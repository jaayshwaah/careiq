"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizonal } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { MessageRow } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function Chat({ chatId }: { chatId: string }) {
  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Load messages and subscribe realtime
  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (!mounted) return;
      if (error) console.error(error);
      setMsgs(data || []);
      scrollToBottom();
    }
    load();

    const channel = supabase
      .channel(`realtime:messages:${chatId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        load
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");

    // Optimistic UI: add user msg
    const optimistic: MessageRow = {
      id: crypto.randomUUID(),
      chat_id: chatId,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMsgs((m) => [...m, optimistic]);
    scrollToBottom();

    // Persist + request assistant streaming
    await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ chatId, content: text }),
    });
    // The API handles inserting the assistant message chunks and a final row.
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col gap-4">
      <div className="glass flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-4 sm:p-6">
          <div ref={listRef} className="mx-auto flex max-w-2xl flex-col gap-3">
            {msgs.map((m) => (
              <div key={m.id} className={`message ${m.role}`}>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
