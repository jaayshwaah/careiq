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
  const autoSentRef = useRef(false);

  // Scroll helpers
  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    if (!listRef.current) return;
    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior,
    });
  }

  // Initial load of messages
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
            requestAnimationFrame(() => scrollToBottom("auto"));
          }
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
    }
    loadMessages();
    return () => {
      mounted = false;
    };
  }, [chatId]);

  // Handle initial query parameter (auto-send first message)
  useEffect(() => {
    const q = (searchParams?.get("q") || "").trim();
    if (!q || autoSentRef.current) return;
    
    autoSentRef.current = true;
    
    // Remove query param
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("q");
      router.replace(url.pathname + url.search);
    } catch {}

    // Auto-send after messages load
    setTimeout(() => {
      handleSend(q);
    }, 100);
  }, [searchParams, router]);

  // Keep viewport at bottom
  useEffect(() => {
    scrollToBottom("smooth");
  }, [msgs.length]);

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
    setInput("");

    // Add placeholder assistant message
    const assistantId = `streaming-${Date.now()}`;
    const assistantMsg: Msg = {
      id: assistantId,
      chat_id: chatId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };
    setMsgs((prev) => [...prev, assistantMsg]);
    setStreamingId(assistantId);

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
        throw new Error(`Stream failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process SSE events
        let eventEnd;
        while ((eventEnd = buffer.indexOf("\n\n")) !== -1) {
          const event = buffer.slice(0, eventEnd).trim();
          buffer = buffer.slice(eventEnd + 2);

          const dataLine = event.split("\n").find((line) => line.startsWith("data:"));
          if (!dataLine) continue;

          const data = dataLine.slice(5).trim();
          if (data === "[DONE]") continue;
          if (!data) continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed?.content || parsed?.choices?.[0]?.delta?.content || "";
            
            if (delta) {
              fullContent += delta;
              setMsgs((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId ? { ...msg, content: fullContent } : msg
                )
              );
              scrollToBottom("auto");
            }
          } catch {
            // Ignore JSON parse errors
          }
        }
      }
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        setMsgs((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: msg.content + "\n\n[Error: Streaming failed]" }
              : msg
          )
        );
      }
    } finally {
      setStreaming(false);
      setStreamingId(null);
      controllerRef.current = null;
    }
  };

  // Suggested prompts for empty state
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
            {/* Empty state with large composer */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-semibold mb-2">Ready when you are.</h1>
            </div>
            
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

            {/* Suggestions with gradient glow */}
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
                {suggestions.map((text) => (
                  <button
                    key={text}
                    onClick={() => setInput(text)}
                    className="rounded-2xl bg-white/60 px-3 py-2 ring-1 ring-black/10 dark:ring-white/10 dark:bg-white/10 shadow-soft hover:bg-white/80 dark:hover:bg-white/15 transition-colors"
                    disabled={streaming}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Message bubbles
          msgs.map((msg) => {
            const isAssistant = msg.role === "assistant";
            const isStreamingThis = streaming && msg.id === streamingId;

            return (
              <div
                key={msg.id}
                className={`mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2 text-[15px] leading-relaxed shadow-soft ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-[#3c5ebf] to-[#2d4aa0] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.15)]"
                      : "bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/10"
                  }`}
                >
                  {isAssistant ? (
                    <>
                      <div className="whitespace-pre-wrap">
                        {msg.content || (isStreamingThis ? <TypingDots /> : null)}
                      </div>
                      {isStreamingThis && msg.content && (
                        <div className="mt-1 opacity-80">
                          <TypingDots />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}

                  <div
                    className={`mt-1 text-[11px] ${
                      msg.role === "user"
                        ? "text-white/70"
                        : "text-gray-600 dark:text-white/50"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], {
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

      {/* Sticky bottom composer (when there are messages) */}
      {msgs.length > 0 && (
        <div className="mx-auto w-full max-w-2xl sticky bottom-2 px-4">
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