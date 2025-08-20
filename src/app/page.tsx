// src/app/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
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
  text?: string;
  status: "pending" | "ready" | "error";
  error?: string;
};

type SseEvent =
  | { type: "status"; message: string }
  | { type: "token"; text: string }
  | { type: "usage"; input?: number; output?: number }
  | { type: "error"; message: string }
  | { type: "done" };

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
          {a.status === "error" && <span className="text-red-500">error</span>}
          <button
            type="button"
            className="rounded px-1 hover:bg-neutral-100"
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

export default function HomePage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<{ input?: number; output?: number } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Signals for MessageList behavior
  const [followNowSignal, setFollowNowSignal] = useState(0);      // bump when user sends
  const [assistantTick, setAssistantTick] = useState(0);          // bump per assistant token

  // TODO: wire to auth user later
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

  /** Stop streaming mid-reply */
  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setStreamingId(null);
  };

  /** Attachment handling */
  const handleFilesChosen = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const staged: Attachment[] = Array.from(files).map((f) => ({
      id: uid("att"),
      name: f.name,
      type: f.type || "application/octet-stream",
      size: f.size,
      status: "pending",
    }));
    setAttachments((prev) => [...prev, ...staged]);

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
          return { ...a, status: "ready", text: (match.text || "").slice(0, 150_000) };
        })
      );
    } catch {
      setAttachments((prev) =>
        prev.map((a) =>
          a.status === "pending" ? { ...a, status: "error", error: "Failed to extract" } : a
        )
      );
    }
  };

  const removeAttachment = (id: string) => setAttachments((prev) => prev.filter((a) => a.id !== id));

  /** Send a message and stream SSE reply (tokens/status/usage/errors) */
  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || isStreaming) return;

    // Build attachments payload to send
    const ready = attachments.filter((a) => a.status === "ready" && a.text?.trim());
    const attsPayload = ready.map((a) => ({
      name: a.name,
      type: a.type,
      size: a.size,
      text: (a.text || "").slice(0, 60_000),
    }));

    // Append user message + placeholder assistant
    const userMsg: ChatMessage = {
      id: uid("user"),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
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
    setLastUsage(null);

    // Signal MessageList to auto-resume and pin to bottom on send
    setFollowNowSignal((n) => n + 1);

    // Open SSE stream (via fetch; we'll parse "data: {...}\n\n" frames)
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
        setMessages((prev) =>
          prev.map((m) => (m.id === asstId ? { ...m, content: "Error starting stream. Check server logs." } : m))
        );
        setIsStreaming(false);
        setStreamingId(null);
        abortRef.current = null;
        return;
      }

      // Parse SSE frames
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handleEvent = (evt: SseEvent) => {
        switch (evt.type) {
          case "token":
            setMessages((prev) =>
              prev.map((m) => (m.id === asstId ? { ...m, content: (m.content || "") + evt.text } : m))
            );
            // bump assistant token tick for toast/auto-follow logic
            setAssistantTick((t) => t + 1);
            break;
          case "status":
            // optional: surface in UI
            break;
          case "usage":
            setLastUsage({ input: evt.input, output: evt.output });
            break;
          case "error":
            setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, content: evt.message } : m)));
            break;
          case "done":
            setIsStreaming(false);
            setStreamingId(null);
            abortRef.current = null;
            break;
        }
      };

      // Stream loop
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (!data) continue;

          try {
            const json = JSON.parse(data) as SseEvent;
            handleEvent(json);
          } catch {
            // ignore keep-alives
          }
        }
      }
    } catch (err) {
      if ((err as any)?.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) => (m.id === asstId ? { ...m, content: "Network error while streaming reply." } : m))
        );
      }
    } finally {
      setIsStreaming(false);
      setStreamingId(null);
      abortRef.current = null;
      // Clear attachments after send
      setAttachments([]);
    }
  }

  const showHero = messages.length === 0;

  return (
    <RequireAuth>
      <div className="h-[100dvh] w-full flex flex-col">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFilesChosen(e.target.files)}
          className="hidden"
          accept=".txt,.md,.csv,.json,.pdf,.docx"
        />

        {/* HERO: before first message */}
        {showHero ? (
          <main className="flex-1 px-6 py-10">
            <div className="mx-auto w-full max-w-2xl min-h-[60vh] grid place-content-center">
              <div className="w-full">
                <StaticHeading phrases={[`Good to see you, ${userName}.`, "Ask me anything", "Summarize this", "Draft an email", "Brainstorm ideas", "Explain a topic", "Create a plan"]} />

                <Composer
                  value={input}
                  onChange={setInput}
                  onSend={() => handleSend()}
                  disabled={isStreaming}
                  isStreaming={isStreaming}
                  onStop={handleStop}
                  onAttachClick={() => fileInputRef.current?.click()}
                  placeholder="Message CareIQ..."
                  size="lg"
                  className="shadow-soft"
                />

                {/* Attached files preview */}
                {attachments.length > 0 && <AttachmentBar atts={attachments} onRemove={removeAttachment} />}

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
                  <div className="relative flex flex-wrap items-center justify-center gap-2 md:gap-3">
                    {["Summarize this", "Draft an email", "Explain a topic", "Create a plan"].map((t) => (
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
            </div>
          </main>
        ) : (
          // CHAT VIEW: after first message
          <>
            <main className="flex-1 flex flex-col">
              {/* IMPORTANT: min-h-0 ensures the inner flex child can measure and scroll */}
              <div className="mx-auto w-full max-w-3xl flex-1 min-h-0 px-4">
                {/* MessageList owns scrolling; no other vertical overflow containers */}
                <div className="flex h-full flex-col">
                  <MessageList
                    messages={messages}
                    isStreaming={isStreaming}
                    followNowSignal={followNowSignal}
                    newAssistantTokenTick={assistantTick}
                  />
                </div>
              </div>
            </main>

            {/* Sticky composer */}
            <div className="sticky bottom-0 w-full border-t border-neutral-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
              <div className="mx-auto max-w-3xl px-4 py-3">
                <Composer
                  value={input}
                  onChange={setInput}
                  onSend={() => handleSend()}
                  disabled={isStreaming}
                  isStreaming={isStreaming}
                  onStop={handleStop}
                  onAttachClick={() => fileInputRef.current?.click()}
                  placeholder="Message CareIQ..."
                />
                {/* Attached files preview */}
                {attachments.length > 0 && <AttachmentBar atts={attachments} onRemove={removeAttachment} />}

                {/* Optional: show usage if provided by SSE */}
                {lastUsage && (lastUsage.input || lastUsage.output) ? (
                  <p className="mt-2 text-[11px] text-neutral-400 text-center">
                    tokens — in: {lastUsage.input ?? "?"} • out: {lastUsage.output ?? "?"}
                  </p>
                ) : (
                  <p className="mt-2 text-[11px] text-neutral-400 text-center">
                    CareIQ can make mistakes. Check important info.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </RequireAuth>
  );
}
