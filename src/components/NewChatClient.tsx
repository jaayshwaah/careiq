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

function useSidebarOffset() {
  const [left, setLeft] = React.useState(0);

  React.useEffect(() => {
    const aside = document.querySelector("aside");
    if (!aside) return;

    const el = aside as HTMLElement;
    const update = () => setLeft(el.getBoundingClientRect().width);

    update(); // initial
    const ro = new ResizeObserver(update);
    ro.observe(el);

    // Also update on window resize for safety
    const onResize = () => update();
    window.addEventListener("resize", onResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return left;
}

export default function NewChatClient() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const endRef = React.useRef<HTMLDivElement | null>(null);
  const leftOffset = useSidebarOffset();

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
      {/* ======= PRE-CHAT LAYOUT ======= */}
      {!hasMessages ? (
        <>
          <HeaderBanner />
          <div className="mx-auto w-full max-w-3xl px-4">
            <Suggestions targetId="composer-input" />
          </div>

          {/* Composer sits just below suggestions (normal flow, not bottom) */}
          <div className="mx-auto w-full max-w-3xl px-4 mt-4 mb-16">
            <Composer id="composer-input" onSend={handleSend} positioning="flow" />
          </div>
        </>
      ) : (
        /* ======= ACTIVE CHAT LAYOUT ======= */
        <>
          {/* Messages area with bottom padding so the fixed composer doesn’t overlap */}
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

          {/* Fixed bottom composer, aligned to content area (not under sidebar) */}
          <div
            className="fixed bottom-0"
            style={{
              left: leftOffset,           // offset by current sidebar width
              right: 0,                   // extend to the right edge
              background: "transparent",  // no footer stripe
              pointerEvents: "none",      // clicks only on inner content
            }}
          >
            <div
              className="mx-auto max-w-3xl px-4 py-4"
              style={{ pointerEvents: "auto" }}
            >
              <Composer id="composer-input" onSend={handleSend} positioning="static" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
