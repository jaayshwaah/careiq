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

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const ok = res.ok;
      const data = ok ? await res.json() : null;

      const assistant: Message =
        ok && data?.message
          ? data.message
          : {
              id: crypto.randomUUID(),
              role: "assistant",
              content: "I had trouble generating a reply just now. Try again?",
            };

      setMessages((m) =>
        m.map((msg) => (msg.id === pendingAssist.id ? assistant : msg))
      );
    } catch {
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
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="w-full min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* ======= PRE-CHAT LAYOUT (centered composer) ======= */}
      {!hasMessages ? (
        <>
          <HeaderBanner />
          <div className="mx-auto w-full max-w-3xl px-4">
            <Suggestions targetId="composer-input" />
          </div>

          {/* Center the composer vertically in the remaining space */}
          <div className="mx-auto w-full max-w-3xl px-4 flex-1 flex items-center">
            <div className="w-full">
              <Composer id="composer-input" onSend={handleSend} positioning="flow" />
            </div>
          </div>
        </>
      ) : (
        /* ======= ACTIVE CHAT LAYOUT ======= */
        <>
          {/* Messages area (adds bottom padding so fixed composer doesn't cover content) */}
          <div className="mx-auto w-full max-w-3xl flex-1 px-4">
            <div className="pt-2 pb-36 space-y-4">
              <div className="space-y-4">
                {messages.map((m) => {
                  if (m.role === "user") {
                    // Right-aligned, green bubble, size to content
                    return (
                      <div key={m.id} className="flex justify-end">
                        <div
                          className="inline-block rounded-2xl px-3 py-2"
                          style={{
                            maxWidth: "80%",
                            background: "rgba(16,163,127,0.12)", // soft green tint
                            border: "1px solid rgba(16,163,127,0.35)",
                            color: "var(--text)",
                          }}
                        >
                          <div className="text-sm whitespace-pre-wrap leading-6">
                            {m.content}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Assistant: not a bubble — clean block like ChatGPT
                  return (
                    <div key={m.id} className="flex justify-start">
                      <div className="w-full" style={{ maxWidth: "90%" }}>
                        <div
                          className="text-sm whitespace-pre-wrap leading-7"
                          style={{ color: "var(--text)", opacity: m.pending ? 0.85 : 1 }}
                        >
                          {m.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
            </div>
          </div>

          {/* Fixed bottom composer */}
          <div
            className="fixed bottom-0 left-0 right-0"
            style={{
              background: "var(--bg)",
              borderTop: "1px solid var(--border)",
            }}
          >
            <div className="mx-auto max-w-3xl px-4 py-4">
              <Composer id="composer-input" onSend={handleSend} positioning="static" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
