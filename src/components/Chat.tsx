"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Msg = {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export default function Chat({ chatId }: { chatId: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|Macintosh/.test(
      (navigator as any).userAgentData?.platform || navigator.platform || ""
    );

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`/api/chats?id=${chatId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("messages list via /api/chats not available");
        const json = await res.json();
        const dbMsgs: Msg[] = json?.messages ?? [];
        if (mounted) {
          setMsgs(dbMsgs);
          scrollToBottom();
        }
      } catch {
        // ignore
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [chatId]);

  function scrollToBottom() {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;

    setMsgs((m) => [
      ...m,
      {
        id: crypto.randomUUID(),
        chat_id: chatId,
        role: "user",
        content,
        created_at: new Date().toISOString(),
      },
    ]);
    setInput("");
    scrollToBottom();

    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(chatId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("send failed");
      const msg = await res.json();
      setMsgs((m) => [...m, msg]);
      scrollToBottom();
    } catch {
      // Optionally show a toast
    }
  }

  const sendHint = isMac ? (
    <span className="text-xs text-gray-600 dark:text-white/50">
      Press <kbd>Return</kbd> to send • <kbd>Shift</kbd>+<kbd>Return</kbd> for newline
    </span>
  ) : (
    <span className="text-xs text-gray-600 dark:text-white/50">
      Press <kbd>Enter</kbd> to send • <kbd>Shift</kbd>+<kbd>Enter</kbd> for newline
    </span>
  );

  const EmptyComposer = (
    <form
      onSubmit={onSend}
      className="glass ring-1 ring-black/10 dark:ring-white/10 rounded-2xl p-3 shadow-soft focus-within:ring-2 focus-within:ring-black/20 dark:focus-within:ring-white/20 transition"
    >
      <div className="flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message CareIQ…"
          className="min-h-[68px] max-h-[40vh] resize-y rounded-xl border-0 bg-transparent focus-visible:ring-0"
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.ctrlKey &&
              !e.metaKey &&
              !e.altKey
            ) {
              e.preventDefault();
              (e.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
            }
          }}
        />
        <Button
          type="submit"
          className="rounded-xl px-3 ring-1 ring-black/10 dark:ring-white/10 bg-white/70 hover:bg-white/90 active:bg-white dark:bg-white/10 dark:hover:bg-white/15 shadow-soft hover:shadow-md"
          disabled={!input.trim()}
          title="Send"
          aria-label="Send message"
        >
          <SendHorizonal className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </div>
      <div className="mt-1 flex items-center justify-between px-1">
        {sendHint}
        <div className="text-[11px] text-ink-subtle" aria-hidden>
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </form>
  );

  return (
    <div className="flex h-full flex-col">
      {/* List */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 pb-24 pt-6 md:px-6">
        {msgs.length === 0 ? (
          <div className="grid place-content-center mx-auto w-full max-w-2xl px-6">
            {EmptyComposer}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:gap-3">
              {["Summarize this", "Draft an email", "Explain a topic", "Create a plan"].map(
                (t) => (
                  <button
                    key={t}
                    onClick={() => setInput(t)}
                    className="rounded-2xl bg-white/60 px-3 py-2 ring-1 ring-black/10 dark:ring-white/10 dark:bg-white/10 shadow-soft hover:bg-white/80 dark:hover:bg-white/15"
                  >
                    {t}
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          msgs.map((m) => (
            <div
              key={m.id}
              className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2 text-[15px] leading-relaxed shadow-soft ${
                  m.role === "user"
                    ? "bg-gradient-to-br from-[#3c5ebf] to-[#2d4aa0] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.15)]"
                    : "bg-white/70 dark:bg-white/10 border border-border dark:border-border-dark"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
                <div
                  className={`mt-1 text-[11px] ${
                    m.role === "user"
                      ? "text-white/70 dark:text-black/60"
                      : "text-gray-600 dark:text-white/50"
                  }`}
                >
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom composer only after first message */}
      {msgs.length > 0 && (
        <form
          onSubmit={onSend}
          className="glass ring-1 ring-black/10 dark:ring-white/10 focus-within:ring-2 focus-within:ring-black/20 dark:focus-within:ring-white/20 transition mx-auto w-full max-w-2xl p-2 sm:p-3 rounded-2xl sticky bottom-2 inset-x-4"
        >
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message CareIQ…"
              className="min-h[52px] min-h-[52px] max-h-[40vh] resize-y rounded-xl border-0 bg-transparent focus-visible:ring-0"
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.ctrlKey &&
                  !e.metaKey &&
                  !e.altKey
                ) {
                  e.preventDefault();
                  (e.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
                }
              }}
            />
            <Button
              type="submit"
              className="rounded-xl px-3 ring-1 ring-black/10 dark:ring-white/10 bg-white/70 hover:bg-white/90 active:bg-white dark:bg-white/10 dark:hover:bg-white/15 shadow-soft hover:shadow-md"
              disabled={!input.trim()}
              title="Send"
              aria-label="Send message"
            >
              <SendHorizonal className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
          <div className="mt-2 text-center text-xs text-ink-subtle">{sendHint}</div>
        </form>
      )}
    </div>
  );
}
