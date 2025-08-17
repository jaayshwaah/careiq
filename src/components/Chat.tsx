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
  const router = useRouter();
  const searchParams = useSearchParams();

  // Messages
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);

  // Composer
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const suggestions = useMemo(
    () => [
      "Draft a hiring email for CNAs",
      "Summarize this policy PDF I’ll upload",
      "Create a CNA in-service outline",
      "Build an onboarding checklist",
    ],
    []
  );

  // Load messages
  useEffect(() => {
    let mounted = true;
    async function loadMessages() {
      try {
        const res = await fetch(`/api/messages/${encodeURIComponent(chatId)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          const messages: Msg[] = json?.messages || [];
          if (mounted) {
            setMsgs(messages);
            setLoading(false);
            scrollToBottom("auto");
          }
        } else {
          if (mounted) {
            setMsgs([]);
            setLoading(false);
          }
        }
      } catch {
        if (mounted) {
          setMsgs([]);
          setLoading(false);
        }
      }
    }
    loadMessages();
    return () => {
      mounted = false;
    };
  }, [chatId]);

  // Keep viewport at bottom
  useEffect(() => {
    scrollToBottom("smooth");
  }, [msgs.length]);

  function scrollToBottom(behavior: ScrollBehavior) {
    const el = listRef.current;
    if (!el) return;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior });
    } catch {}
  }

  // Stop streaming
  const handleStop = () => {
    try {
      controllerRef.current?.abort();
    } catch {}
    setStreaming(false);
    setStreamingId(null);
    controllerRef.current = null;
  };

  // Send message with streaming
  const handleSend = async (content: string) => {
    if (streaming) return;
    const trimmed = content.trim();
    if (!trimmed) return;

    // Add optimistic user message
    const userMsg: Msg = {
      id: crypto.randomUUID(),
      chat_id: chatId,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMsgs((prev) => [...prev, userMsg]);

    // >>> NEW: derive & persist a title from the first user message (server only sets if still default)
    try {
      await fetch(`/api/chats/${encodeURIComponent(chatId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstMessage: trimmed }),
      });
    } catch {}
    // <<< NEW

    setInput("");

    // Begin streaming assistant response
    const controller = new AbortController();
    controllerRef.current = controller;
    setStreaming(true);

    try {
      const response = await fetch("/api/messages/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, content: trimmed }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("No stream body");
      }
      setStreamingId(crypto.randomUUID());

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process SSE event
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data:")) continue;
          const payload = trimmedLine.slice(5).trim();
          if (!payload) continue;
          if (payload === "[DONE]") continue;

          try {
            const obj = JSON.parse(payload);
            const token = obj?.content;
            if (token) {
              fullContent += token;
              setMsgs((prev) => {
                const clone = [...prev];
                const last = clone[clone.length - 1];
                if (last && last.role === "assistant") {
                  last.content += token;
                } else {
                  clone.push({
                    id: streamingId || crypto.randomUUID(),
                    chat_id: chatId,
                    role: "assistant",
                    content: token,
                    created_at: new Date().toISOString(),
                  });
                }
                return clone;
              });
            }
          } catch {
            // ignore partial frames
          }
        }
      }

      // Ensure one final assistant message exists (if stream ended without adding)
      if (!fullContent) {
        setMsgs((prev) => [
          ...prev,
          {
            id: streamingId || crypto.randomUUID(),
            chat_id: chatId,
            role: "assistant",
            content: "…",
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.error(e);
      setMsgs((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          chat_id: chatId,
          role: "assistant",
          content:
            "Sorry — the model call failed. Please check your OpenRouter key/credits.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setStreaming(false);
      setStreamingId(null);
      controllerRef.current = null;
    }
  };

  // Suggested prompts for empty state
  const EmptyState = () => {
    return (
      <div className="relative mb-4 rounded-[28px] bg-white/50 p-3 shadow-soft ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
        <div
          className="pointer-events-none absolute inset-x-8 -top-3 bottom-0 -z-10 rounded-[28px] blur-2xl opacity-60"
          style={{
            background:
              "linear-gradient(120deg, rgba(139,176,255,.8), rgba(255,214,165,.7), rgba(193,255,215,.8))",
          }}
          aria-hidden
        />
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {suggestions.map((text) => (
            <button
              key={text}
              onClick={() => setInput(text)}
              className="rounded-2xl bg-white/60 px-3 py-2 text-sm font-medium shadow-soft hover:bg-white/80 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 transition-colors"
              disabled={streaming}
            >
              {text}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div
        ref={listRef}
        className="flex-1 overflow-auto rounded-2xl bg-white/60 p-3 shadow-soft ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10"
      >
        {loading ? (
          <div className="p-6 text-center text-sm text-black/50 dark:text-white/60">
            Loading…
          </div>
        ) : msgs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {msgs.map((m) => (
              <div
                key={m.id}
                className={[
                  "rounded-2xl px-3 py-2 ring-1",
                  m.role === "user"
                    ? "bg-white text-black ring-black/10 dark:bg-white/90 dark:text-black"
                    : "bg-black text-white ring-black/0 dark:bg-black",
                ].join(" ")}
              >
                <div className="text-xs opacity-60">
                  {new Date(m.created_at).toLocaleString()}
                </div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}
            {streaming && (
              <div className="rounded-2xl bg-black px-3 py-2 text-white">
                <TypingDots />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3">
        <Composer
          placeholder="Message CareIQ…"
          disabled={streaming}
          onSend={handleSend}
          value={input}
          onChange={setInput}
          size="md"
        />
      </div>
    </div>
  );
}
