// src/app/page.tsx
"use client";

import { useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import Composer from "@/components/Composer";
import MessageList from "@/components/MessageList";
import QuickAccess from "@/components/QuickAccess";

type Role = "user" | "assistant";
type Msg = { id: string; role: Role; content: string; createdAt: string; attachments?: any[] };

function uid() {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
}

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [newTokenTick, setNewTokenTick] = useState(0);
  const [followNow, setFollowNow] = useState(0);

  // Export PDF only after a chat starts
  const exportPDF = async () => {
    const r = await fetch("/api/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "CareIQ Chat Export",
        messages,
      }),
    });
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `careiq-chat-${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const callAutoTitle = async (text: string) => {
    try {
      const r = await fetch("/api/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const j = await r.json();
      const title = j?.title || "New chat";
      document.title = `${title} • CareIQ`;
    } catch {}
  };

  // Per-message regenerate (icon lives in MessageList)
  const regenerateAt = async (assistantMessageId: string) => {
    const idx = messages.findIndex((m) => m.id === assistantMessageId);
    if (idx === -1) return;

    // Find the nearest previous user message and build history up to that point (inclusive)
    let priorUserIndex = -1;
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        priorUserIndex = i;
        break;
      }
    }
    if (priorUserIndex === -1) return;

    const history = messages
      .slice(0, priorUserIndex + 1)
      .map((m) => ({ role: m.role, content: m.content }));

    // Replace the assistant message with a fresh streaming placeholder
    const now = new Date().toISOString();
    const newId = `${uid()}:a`;

    setMessages((prev) => {
      const copy = [...prev];
      copy.splice(idx, 1, { id: newId, role: "assistant", content: "", createdAt: now });
      return copy;
    });
    setStreamingId(newId);
    setFollowNow((v) => v + 1);

    const res = await fetch("/api/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, attachments: [] }),
    });

    if (!res.body) {
      setStreamingId(null);
      setMessages((prev) => prev.map((m) => (m.id === newId ? { ...m, content: "(no response)" } : m)));
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantBuf = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split(/\r?\n/).filter(Boolean); // ✅ fixed: added the dot before split
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            const token =
              j?.choices?.[0]?.delta?.content ??
              j?.choices?.[0]?.message?.content ??
              "";
            if (token) {
              assistantBuf += token;
              setMessages((prev) => prev.map((m) => (m.id === newId ? { ...m, content: assistantBuf } : m)));
              setNewTokenTick((t) => t + 1);
            }
          } catch {
            // keep-alives
          }
        }
      }
    }

    setStreamingId(null);
  };

  const onSend = async (text: string, files: File[]) => {
    const now = new Date().toISOString();
    const idBase = uid();

    const userMsg: Msg = {
      id: `${idBase}:u`,
      role: "user",
      content: text,
      createdAt: now,
      attachments: [],
    };
    const asstMsg: Msg = {
      id: `${idBase}:a`,
      role: "assistant",
      content: "",
      createdAt: now,
    };

    const isFirst = messages.length === 0;

    setMessages((prev) => [...prev, userMsg, asstMsg]);
    setStreamingId(asstMsg.id);
    setFollowNow((v) => v + 1);

    if (isFirst) callAutoTitle(text);

    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: text },
    ];

    const res = await fetch("/api/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: history,
        attachments: [],
      }),
    });

    if (!res.body) {
      setStreamingId(null);
      setMessages((prev) =>
        prev.map((m) => (m.id === asstMsg.id ? { ...m, content: "(no response)" } : m))
      );
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantBuf = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split(/\r?\n/).filter(Boolean); // ✅ fixed here as well for consistency
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const payload = line.slice(6);
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            const token =
              j?.choices?.[0]?.delta?.content ??
              j?.choices?.[0]?.message?.content ??
              "";
            if (token) {
              assistantBuf += token;
              setMessages((prev) =>
                prev.map((m) => (m.id === asstMsg.id ? { ...m, content: assistantBuf } : m))
              );
              setNewTokenTick((t) => t + 1);
            }
          } catch {
            // ignore keepalives
          }
        }
      }
    }

    setStreamingId(null);
  };

  const showHero = messages.length === 0;

  return (
    <RequireAuth>
      <div className="flex w-full flex-col gap-4">
        {/* Top actions: show ONLY after chat has started */}
        {!showHero && (
          <div className="flex items-center justify-end gap-2 print:hidden">
            <button
              onClick={exportPDF}
              className="px-3 py-1.5 text-sm rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black hover:opacity-90"
              title="Export PDF"
            >
              Export PDF
            </button>
          </div>
        )}

        {/* Conversation / Hero */}
        <div className="relative flex min-h-[60svh] flex-1">
          {showHero ? (
            <div className="mx-auto my-16 flex w-full max-w-3xl flex-col items-stretch gap-5 text-center">
              {/* Welcome header above composer */}
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">Welcome to CareIQ</h1>
                <p className="text-sm text-zinc-600">
                  Ask anything about nursing‑home compliance and operations. Get clear, survey‑ready answers with citations and dates, tailored to your facility and state.
                </p>
              </div>

              {/* Centered composer */}
              <div className="mx-auto w-full max-w-3xl">
                <Composer onSend={onSend} placeholder="How can I help today?" autoFocus />
              </div>

              {/* Short role‑aware suggestions BELOW the composer (only on hero) */}
              <QuickAccess onPick={(t) => onSend(t, [])} max={4} compact />
            </div>
          ) : (
            <div className="flex h-full w-full flex-col">
              <div className="flex-1 min-h-0">
                <MessageList
                  messages={messages}
                  isStreaming={Boolean(streamingId)}
                  streamingId={streamingId}
                  followNowSignal={followNow}
                  newAssistantTokenTick={newTokenTick}
                  onRegenerate={regenerateAt}
                />
              </div>

              {/* Sticky composer; suggestions intentionally hidden after chat starts */}
              <div className="sticky bottom-0 z-10 w-full bg-gradient-to-b from-[color-mix(in_oklab,var(--bg),transparent_40%)] to-[var(--bg)] px-4 pb-5 pt-3 print:hidden">
                <div className="mx-auto w-full max-w-3xl">
                  <Composer onSend={onSend} placeholder="How can I help today?" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
