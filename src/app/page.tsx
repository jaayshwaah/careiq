// src/app/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
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
  const lastUserRef = useRef<string>("");

  // Export MD
  const exportMarkdown = () => {
    const md = messages
      .map((m) => (m.role === "user" ? `**You:** ${m.content}` : `**CareIQ:** ${m.content}`))
      .join("\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `careiq-chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export JSON (audit-style)
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ messages }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `careiq-chat-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF (server-generated)
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

  const regenerate = async () => {
    if (!lastUserRef.current) return;
    const priorUser = lastUserRef.current;
    setMessages((prev) => {
      const copy = [...prev];
      if (copy.at(-1)?.role === "assistant") copy.pop();
      return copy;
    });
    await onSend(priorUser, []);
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
      // If you have a chats DB row, PATCH it here.
    } catch {
      // ignore
    }
  };

  const onSend = async (text: string, files: File[]) => {
    const now = new Date().toISOString();
    const idBase = uid();
    lastUserRef.current = text;

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

    // Auto-title on first prompt
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
      const lines = chunk.split(/\r?\n/).filter(Boolean);
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
        {/* Top actions */}
        <div className="flex items-center justify-end gap-2 print:hidden">
          <button
            onClick={exportMarkdown}
            className="px-3 py-1.5 text-sm rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black hover:opacity-90"
            title="Export as Markdown"
          >
            Export MD
          </button>
          <button
            onClick={exportJSON}
            className="px-3 py-1.5 text-sm rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black hover:opacity-90"
            title="Export JSON (audit trail)"
          >
            Export JSON
          </button>
          <button
            onClick={exportPDF}
            className="px-3 py-1.5 text-sm rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black hover:opacity-90"
            title="Export PDF"
          >
            Export PDF
          </button>
          <button
            onClick={regenerate}
            className="px-3 py-1.5 text-sm rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black hover:opacity-90 disabled:opacity-50"
            disabled={!messages.some((m) => m.role === "assistant")}
            title="Regenerate last reply"
          >
            Regenerate
          </button>
        </div>

        {/* Conversation / Hero */}
        <div className="relative flex min-h-[60svh] flex-1">
          {showHero ? (
            <div className="mx-auto my-12 flex w-full max-w-3xl flex-col items-center gap-6 text-center">
              <QuickAccess onPick={(t) => onSend(t, [])} />
              <div className="w-full">
                <Composer onSend={onSend} placeholder="How can I help today?" autoFocus />
              </div>
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
                  onRegenerate={() => regenerate()}
                />
              </div>

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
