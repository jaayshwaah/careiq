"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Composer from "@/components/Composer";

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

  // Scroll helpers
  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    if (!listRef.current) return;
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior,
    });
  }

  // Initial load (supports either /api/messages/[chatId] or legacy /api/chats?id=)
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        // Prefer the dedicated messages route if available
        const res = await fetch(`/api/messages/${encodeURIComponent(chatId)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          // Support both { ok, messages: [...] } and raw array returns
          const got: Msg[] = Array.isArray(json)
            ? (json as Msg[])
            : (json?.messages as Msg[]) ?? [];
          if (mounted) {
            setMsgs(got);
            // Jump immediately on first paint
            requestAnimationFrame(() => scrollToBottom("auto"));
          }
          return;
        }
      } catch {
        // fall through to legacy path
      }

      // Legacy fallback: /api/chats?id=...
      try {
        const res2 = await fetch(`/api/chats?id=${encodeURIComponent(chatId)}`, {
          cache: "no-store",
        });
        if (!res2.ok) throw new Error("messages list via /api/chats not available");
        const json2 = await res2.json().catch(() => ({}));
        const dbMsgs: Msg[] = json2?.messages ?? [];
        if (mounted) {
          setMsgs(dbMsgs);
          requestAnimationFrame(() => scrollToBottom("auto"));
        }
      } catch {
        // ignore for now (empty chat)
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [chatId]);

  // Keep the viewport pinned to the bottom as messages append
  useEffect(() => {
    // Smooth scroll on subsequent updates
    scrollToBottom("smooth");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs.length]);

  // Sending logic with optimistic insert
  const handleSend = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    // Optimistic local user message
    const optimistic: Msg = {
      id: crypto.randomUUID(),
      chat_id: chatId,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMsgs((m) => [...m, optimistic]);
    setInput("");

    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(chatId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) throw new Error("send failed");
      const assistantMsg: Msg = await res.json();

      // Append assistant response returned by the server
      setMsgs((m) => [...m, assistantMsg]);
    } catch {
      // Optionally: append a local error bubble or toast
      // setMsgs((m) => [...m, { ...optimistic, role: "assistant", content: "Sorry, I couldn’t send that." } as Msg]);
    }
  };

  // Suggested prompts for empty state (unchanged)
  const suggestions = useMemo(
    () => ["Summarize this", "Draft an email", "Explain a topic", "Create a plan"],
    []
  );

  return (
    <div className="flex h-full flex-col">
      {/* Messages list */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 pb-24 pt-6 md:px-6">
        {msgs.length === 0 ? (
          <div className="grid place-content-center mx-auto w-full max-w-2xl px-6">
            {/* Center composer when the chat is empty */}
            <Composer
              value={input}
              onChange={setInput}
              onSend={handleSend}
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

      {/* Bottom composer once there are messages */}
      {msgs.length > 0 && (
        <div className="mx-auto w-full max-w-2xl sticky bottom-2 inset-x-4">
          <Composer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            placeholder="Message CareIQ…"
            className="focus-within:ring-2 focus-within:ring-black/20 dark:focus-within:ring-white/20 transition"
          />
          <div className="mt-2 text-center text-xs text-ink-subtle">
            Press <kbd className="px-1 py-0.5 rounded border border-black/20 dark:border-white/20">Enter</kbd> to send •{" "}
            <kbd className="px-1 py-0.5 rounded border border-black/20 dark:border-white/20">Shift</kbd>+
            <kbd className="px-1 py-0.5 rounded border border-black/20 dark:border-white/20">Enter</kbd> for newline
          </div>
        </div>
      )}
    </div>
  );
}
