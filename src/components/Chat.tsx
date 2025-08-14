"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Composer from "@/components/Composer";

type Msg = {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70 animate-bounce [animation-delay:-0.2s]" />
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70 animate-bounce [animation-delay:-0.1s]" />
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70 animate-bounce" />
    </span>
  );
}

export default function Chat({ chatId }: { chatId: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingQueryRef = useRef<string | null>(null);
  const autoSentRef = useRef(false);

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
        const res = await fetch(`/api/messages/${encodeURIComponent(chatId)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          const got: Msg[] = Array.isArray(json)
            ? (json as Msg[])
            : (json?.messages as Msg[]) ?? [];
          if (mounted) {
            setMsgs(got);
            requestAnimationFrame(() => scrollToBottom("auto"));
          }
          return;
        }
      } catch {}
      try {
        const res2 = await fetch(`/api/chats?id=${encodeURIComponent(chatId)}`, {
          cache: "no-store",
        });
        if (!res2.ok) throw new Error("legacy messages endpoint not available");
        const json2 = await res2.json().catch(() => ({}));
        const dbMsgs: Msg[] = json2?.messages ?? [];
        if (mounted) {
          setMsgs(dbMsgs);
          requestAnimationFrame(() => scrollToBottom("auto"));
        }
      } catch {}
    }
    load();
    return () => {
      mounted = false;
    };
  }, [chatId]);

  // Pick up initial message from query (?q=...) and auto-send once
  useEffect(() => {
    const q = (searchParams?.get("q") || "").trim();
    if (!q || autoSentRef.current) return;
    pendingQueryRef.current = q;
    autoSentRef.current = true;

    // Remove the query param from URL so refreshes don't resend
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("q");
      router.replace(url.pathname + url.search);
    } catch {}

    // Send after a tick to let messages load
    setTimeout(() => {
      if (pendingQueryRef.current) {
        void handleSend(pendingQueryRef.current);
        pendingQueryRef.current = null;
      }
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Keep viewport pinned to bottom as messages append
  useEffect(() => {
    scrollToBottom("smooth");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs.length]);

  // STOP streaming handler
  const handleStop = () => {
    try {
      controllerRef.current?.abort();
    } catch {}
  };

  // Streaming send
  const handleSend = async (content: string) => {
    if (streaming) return; // prevent overlapping streams
    const trimmed = content.trim();
    if (!trimmed) return;

    // Optimistic user message
    const userMsg: Msg = {
      id: crypto.randomUUID(),
      chat_id: chatId,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMsgs((m) => [...m, userMsg]);
    setInput("");

    // Placeholder assistant message to stream into
    const placeholderId = `assist-${crypto.randomUUID()}`;
    setStreamingId(placeholderId);
    const placeholder: Msg = {
      id: placeholderId,
      chat_id: chatId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };
    setMsgs((m) => [...m, placeholder]);

    const controller = new AbortController();
    controllerRef.current = controller;
    setStreaming(true);

    try {
      const res = await fetch(`/api/messages/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, content: trimmed }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`stream failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // SSE events separated by \n\n
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const event = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);

          const dataLine = event.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          const data = dataLine.slice(5).trim();
          if (data === "[DONE]") continue;

          try {
            const obj = JSON.parse(data);
            const delta = obj?.choices?.[0]?.delta ?? obj?.choices?.[0]?.message ?? {};
            const token: string = delta?.content ?? "";
            if (token) {
              full += token;
              setMsgs((prev) =>
                prev.map((m) => (m.id === placeholderId ? { ...m, content: full } : m))
              );
              scrollToBottom("auto");
            }
          } catch {
            // ignore JSON parse errors on incomplete frames
          }
        }
      }

      // On normal end: server already persisted assistant message.

    } catch (err: any) {
      // If aborted, keep whatever text we had in the placeholder (server persists partial).
      if (err?.name !== "AbortError") {
        setMsgs((prev) =>
          prev.map((m) =>
            m.id === streamingId
              ? { ...m, content: (m.content || "") + "\n\n[Streaming failed]" }
              : m
          )
        );
      }
    } finally {
      setStreaming(false);
      controllerRef.current = null;
      setStreamingId(null);
    }
  };

  // Suggested prompts for empty state (with glow)
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
            {/* Larger composer for empty state */}
            <Composer
              value={input}
              onChange={setInput}
              onSend={handleSend}
              isStreaming={streaming}
              onStop={handleStop}
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
        ) : (
          msgs.map((m) => {
            const isAssistant = m.role === "assistant";
            const isStreamingBubble = streaming && isAssistant && m.id === streamingId;

            return (
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
                  {isAssistant ? (
                    <>
                      <div className="whitespace-pre-wrap">
                        {m.content || (isStreamingBubble ? <TypingDots /> : null)}
                      </div>
                      {isStreamingBubble && m.content && (
                        <div className="mt-1 opacity-80">
                          <TypingDots />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}

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
            );
          })
        )}
      </div>

      {/* Bottom composer once there are messages (larger) */}
      {msgs.length > 0 && (
        <div className="mx-auto w-full max-w-2xl sticky bottom-2 inset-x-4">
          <Composer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            isStreaming={streaming}
            onStop={handleStop}
            placeholder="Message CareIQ…"
            size="lg"
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
