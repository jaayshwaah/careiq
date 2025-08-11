"use client";

import React from "react";
import HeaderBanner from "@/components/HeaderBanner";
import Suggestions from "@/components/Suggestions";
import Composer from "@/components/Composer";

type Role = "user" | "assistant";
type Message = {
  id: string;
  role: Role;
  content: string;
  pending?: boolean;
  error?: boolean;
};

export default function NewChatClient() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [sending, setSending] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement | null>(null);

  const scrollToEnd = React.useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  React.useEffect(() => {
    scrollToEnd();
  }, [messages, scrollToEnd]);

  async function handleSend(text: string) {
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const pendingAssist: Message = {
      id: `pending-${Date.now()}`,
      role: "assistant",
      content: "Thinking…",
      pending: true,
    };

    setMessages((m) => [...m, userMsg, pendingAssist]);
    setSending(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const assistant: Message = data?.message ?? {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I had trouble generating a reply just now. Try again?",
      };

      setMessages((m) =>
        m.map((msg) => (msg.id === pendingAssist.id ? assistant : msg))
      );
    } catch (e) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === pendingAssist.id
            ? {
                ...msg,
                content:
                  "Something went wrong sending that. Please try again in a moment.",
                pending: false,
                error: true,
              }
            : msg
        )
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="w-full h-full">
      {/* Big centered header */}
      <HeaderBanner />

      {/* Smaller 2×2 suggestion bubbles */}
      <Suggestions targetId="composer-input" />

      {/* Messages list + Composer */}
      <div className="mx-auto max-w-3xl px-4" style={{ background: "var(--bg)" }}>
        <div className="pt-2 pb-10 space-y-4">
          {/* Messages */}
          {messages.length > 0 && (
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className="w-full">
                  <div
                    className="rounded-2xl border p-4"
                    style={{
                      background:
                        m.role === "assistant" ? "var(--panel)" : "var(--panel-2)",
                      borderColor: m.error ? "#e57373" : "var(--border)",
                      opacity: m.pending ? 0.8 : 1,
                    }}
                  >
                    <div
                      className="text-xs mb-1"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {m.role}
                    </div>
                    <div className="text-sm" style={{ color: "var(--text)" }}>
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}

          {/* Slim → expanding composer */}
          <Composer id="composer-input" onSend={handleSend} />
        </div>
      </div>
    </div>
  );
}
