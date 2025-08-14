"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Composer from "@/components/Composer";
import MessageList from "@/components/MessageList";

/** Types */
type ChatRole = "system" | "user" | "assistant";
type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string; // ISO
};

type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  text?: string;           // extracted text (server-returned)
  status: "pending" | "ready" | "error";
  error?: string;
};

function uid(prefix = "msg") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** One-time headline (random per visit/refresh). */
function StaticHeading({ phrases }: { phrases: string[] }) {
  const [idx, setIdx] = useState<number | null>(null);

  useEffect(() => {
    try {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      setIdx(arr[0] % phrases.length);
    } catch {
      setIdx(Math.floor(Math.random() * phrases.length));
    }
  }, [phrases.length]);

  return (
    <div className="relative z-10 -mt-2 mb-6 text-center">
      <h1
        className="text-4xl md:text-5xl font-semibold tracking-tight"
        aria-live="polite"
        aria-atomic="true"
        suppressHydrationWarning
      >
        {idx === null ? "\u0000" : phrases[idx]}
      </h1>
    </div>
  );
}

/**
 * Chat on the home page:
 * - No redirects; stays on `/`
 * - Hero before first message
 * - After first: ChatGPT-style thread with sticky composer + streaming + attachments
 */
export default function HomePage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // TODO: wire this to auth user later
  const userName = "Josh";

  const suggestions = useMemo(
    () => ["Summarize this", "Draft an email", "Explain a topic", "Create a plan"],
    []
  );

  const headlinePhrases = useMemo(
    () => [
      `Good to see you, ${userName}.`,
      "Ask me anything",
      "Summarize this",
      "Draft an email",
      "Brainstorm ideas",
      "Explain a topic",
      "Create a plan",
    ],
    [userName]
  );

  const listRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  /** Stop streaming mid-reply */
  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setStreamingId(null);
  };

  /** File attach flow */
  const handleAttachClick = () => fileInputRef.current?.click();

  const handleFilesChosen = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Stage attachments as pending
    const staged: Attachment[] = Array.from(files).map((f) => ({
      id: uid("att"),
      name: f.name,
      type: f.type || "application/octet-stream",
      size: f.size,
      status: "pending",
    }));
    setAttachments((prev) => [...prev, ...staged]);

    // Send to extractor API
    const form = new FormData();
    Array.from(files).forEach((f) => form.append("files", f));

    try {
      const r = await fetch("/api/extract", { method: "POST", body: form });
      const data = (await r.json()) as {
        ok: boolean;
        files: Array<{ name: string; text?: string; error?: string }>;
      };

      setAttachments((prev) =>
        prev.map((a) => {
          const match = data.files.find((f) => f.name === a.name);
          if (!match) return a;
          if (match.error) return { ...a, status: "error", error: match.error };
          return { ...a, status: "ready", text: (match.text || "").slice(0, 150_000) }; // clamp
        })
      );
    } catch (e: any) {
      setAttachments((prev) =>
        prev.map((a) =>
          a.status === "pending"
            ? { ...a, status: "error", error: "Failed to extract" }
            : a
        )
      );
    }
  };

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  /** Send a message and stream assistant reply (with attachments) */
  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || isStreaming) return;

    // Build attachments payload with extracted text only
    const ready = attachments.filter((a) => a.status === "ready" && a.text?.trim());
    const attsPayload = ready.map((a) => ({
      name: a.name,
      type: a.type,
      size: a.size,
      text: (a.text || "").slice(0, 60_000), // extra clamp per-file
    }));

    // User message
    const userMsg: ChatMessage = {
      id: uid("user"),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    // Placeholder assistant message (will stream into this)
    const asstId = uid("asst");
    const assistantMsg: ChatMessage = {
      id: asstId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setStreamingId(asstId);

    // Start streaming
    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    try {
      const res = await fetch("/api/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
          attachments: attsPayload,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const fallback =
          "I hit an error generating the reply. If you’re using OpenRouter, check your API key/credits.";
        setMessages((prev) =>
          prev.map((m) => (m.id === asstId ? { ...m, content: fallback } : m))
        );
        setIsStreaming(false);
        setStreamingId(null);
        abortRef.current = null;
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let acc = "";

      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) => (m.id === asstId ? { ...m, content: acc } : m))
          );
          scrollToBottom();
        }
      }
    } catch (err) {
      if ((err as any)?.name !== "AbortError") {
        const msg =
          "There was a network error while streaming the reply. Please try again.";
        setMessages((prev) =>
          prev.map((m) => (m.id === asstId ? { ...m, content: msg } : m))
        );
      }
    } finally {
      setIsStreaming(false);
      setStreamingId(null);
      abortRef.current = null;
      requestAnimationFrame(scrollToBottom);
      // Clear attachments after send
      setAttachments([]);
    }
  }

  const showHero = messages.length === 0;

  return (
    <div className="h-[100dvh] w-full flex flex-col">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => handleFilesChosen(e.target.files)}
        className="hidden"
        // Accept common doc types; expand as needed
        accept=".txt,.md,.csv,.json,.pdf,.docx"
      />

      {/* HERO: before first message */}
      {showHero ? (
        <main className="flex-1 grid place-content-center px-6 py-10">
          <div className="mx-auto w-full max-w-2xl">
            <StaticHeading phrases={headlinePhrases} />

            <Composer
              value={input}
              onChange={setInput}
              onSend={() => handleSend()}
              disabled={isStreaming}
              isStreaming={isStreaming}
              onStop={handleStop}
              onAttachClick={handleAttachClick}
              placeholder="Message CareIQ..."
              size="lg"
              className="shadow-soft"
            />

            {/* Attached files preview */}
            {attachments.length > 0 && (
              <AttachmentBar atts={attachments} onRemove={removeAttachment} />
            )}

            {/* Suggestions */}
            <div className="relative mt-6">
              <span
                className="pointer-events-none absolute inset-x-8 -top-3 bottom-0 z-10 rounded-[28px] blur-2xl opacity-60"
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
                    onClick={() => handleSend(t)}
                    className="rounded-2xl bg-white/60 px-3 py-1.5 text-sm hover:bg-white/80 transition-colors"
                    disabled={isStreaming}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>
      ) : (
        // CHAT VIEW: after first message
        <>
          <main className="flex-1 flex flex-col">
            <div className="mx-auto w-full max-w-3xl flex-1 flex flex-col min-h-0 px-4">
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto overscroll-contain pt-6 pb-32"
                aria-live="polite"
                aria-busy={isStreaming ? "true" : "false"}
              >
                <MessageList
                  messages={messages}
                  isStreaming={isStreaming}
                  streamingId={streamingId}
                  // Show attachment chips below the composer area, not in the list
                />
              </div>
            </div>
          </main>

          {/* Sticky composer (ChatGPT style) */}
          <div className="sticky bottom-0 w-full border-t border-neutral-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="mx-auto max-w-3xl px-4 py-3">
              <Composer
                value={input}
                onChange={setInput}
                onSend={() => handleSend()}
                disabled={isStreaming}
                isStreaming={isStreaming}
                onStop={handleStop}
                onAttachClick={handleAttachClick}
                placeholder="Message CareIQ..."
              />
              {/* Attached files preview */}
              {attachments.length > 0 && (
                <AttachmentBar atts={attachments} onRemove={removeAttachment} />
              )}
              <p className="mt-2 text-[11px] text-neutral-400 text-center">
                CareIQ can make mistakes. Check important info.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Small chips for attachments */
function AttachmentBar({
  atts,
  onRemove,
}: {
  atts: Attachment[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {atts.map((a) => (
        <span
          key={a.id}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-2 py-1 text-xs"
          title={a.name}
        >
          <span className="truncate max-w-[24ch]">{a.name}</span>
          {a.status === "pending" && (
            <span className="text-neutral-400">extracting…</span>
          )}
          {a.status === "error" && (
            <span className="text-red-500">error</span>
          )}
          <button
            type="button"
            className="rounded hover:bg-neutral-100 px-1"
            onClick={() => onRemove(a.id)}
            aria-label={`Remove ${a.name}`}
            title="Remove"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
