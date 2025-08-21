// src/app/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import Composer from "@/components/Composer";

/** Chat message types */
type Role = "user" | "assistant";
type Msg = { id: string; role: Role; content: string };

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom helper (works with whichever ancestor is scrollable)
  const scrollToBottom = () => {
    try {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    } catch {
      // noop
    }
  };

  useEffect(() => {
    // Auto-follow after each message change
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const onSend = async (text: string, _files: File[]) => {
    const baseId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`) as string;

    // Append user + placeholder assistant
    const userMsg: Msg = { id: `${baseId}:u`, role: "user", content: text };
    const asstMsg: Msg = { id: `${baseId}:a`, role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, asstMsg]);

    // Build history for the API
    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: text },
    ];

    // Kick off streaming request
    const res = await fetch("/api/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, attachments: [] }),
    });

    if (!res.body) {
      // No body returned — finalize with a simple error note
      setMessages((prev) =>
        prev.map((m) => (m.id === asstMsg.id ? { ...m, content: "(no response)" } : m))
      );
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // Read SSE frames
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Each SSE event frame is separated by a blank line
      const frames = buffer.split("\n\n");
      buffer = frames.pop() || "";

      for (const frame of frames) {
        const line = frame.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;

        try {
          const evt = JSON.parse(data);
          if (evt.type === "token" && typeof evt.text === "string") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === asstMsg.id ? { ...m, content: m.content + evt.text } : m
              )
            );
          }
        } catch {
          // ignore partial parse issues
        }
      }
    }
  };

  return (
    <RequireAuth>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Messages area (no extra overflow here; parent AppShell handles scrolling) */}
        <div className="px-4 pt-6 pb-4">
          <div className="mx-auto w-full max-w-3xl space-y-4">
            {messages.length === 0 && (
              <div className="mb-6 text-center text-sm text-neutral-500">
                Start by asking a question.
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={[
                    "inline-block max-w-[85%] rounded-2xl px-4 py-2 align-top",
                    m.role === "user"
                      ? "bg-black text-white"
                      : "border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
                  ].join(" ")}
                >
                  {m.content || "…"}
                </div>
              </div>
            ))}

            <div ref={endRef} />
          </div>
        </div>

        {/* Composer footer (sticky inside the scrollable parent) */}
        <div className="sticky bottom-0 z-10 w-full bg-gradient-to-t from-[var(--bg)] via-[color-mix(in_oklab,var(--bg),transparent_20%)] to-transparent px-4 pb-5 pt-3">
          <div className="mx-auto w-full max-w-3xl">
            <Composer onSend={onSend} placeholder="How can I help today?" />
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
