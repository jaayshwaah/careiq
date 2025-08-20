// src/components/NewChatClient.tsx
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

/* ---------- Layout helpers (unchanged) ---------- */

function useSidebarOffset() {
  const [left, setLeft] = React.useState<number>(0);

  React.useEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-sidebar="root"]');
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setLeft(Math.max(0, rect.width));
    });
    ro.observe(el);

    const onResize = () => {
      const rect = el.getBoundingClientRect();
      setLeft(Math.max(0, rect.width));
    };
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
  const [chatId, setChatId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<string>(""); // <— NEW
  const endRef = React.useRef<HTMLDivElement | null>(null);
  const leftOffset = useSidebarOffset();

  const scrollToEnd = React.useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  React.useEffect(() => {
    scrollToEnd();
  }, [messages, scrollToEnd]);

  async function ensureConversationId() {
    if (chatId) return chatId;

    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "New chat" }),
    });

    if (!res.ok) {
      const err = await tryJson(res);
      throw new Error(err?.error || `Failed to create conversation (${res.status})`);
    }

    const data = await res.json();
    const id =
      (data?.conversation?.id as string | undefined) ??
      (data?.id as string | undefined);

    if (!id) throw new Error("No conversation id returned");
    setChatId(id);
    return id;
  }

  async function handleSend(text: string) {
    const id = await ensureConversationId();

    // Optimistic user -> assistant shells
    const user: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const pendingAssist: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      pending: true,
    };
    setMessages((m) => [...m, user, pendingAssist]);
    setDraft(""); // clear composer

    try {
      const res = await fetch(`/api/chat/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok) {
        const err = await tryJson(res);
        throw new Error(err?.error || `Chat failed (${res.status})`);
      }

      const data = await res.json();
      const assistantText = (data?.content as string) ?? "";

      setMessages((m) =>
        m.map((msg) =>
          msg.id === pendingAssist.id
            ? { ...msg, content: assistantText, pending: false }
            : msg
        )
      );
    } catch (e) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === pendingAssist.id
            ? {
                ...msg,
                content:
                  e instanceof Error
                    ? e.message
                    : "Something went wrong. Please try again.",
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
      {!hasMessages ? (
        <>
          <HeaderBanner />

          {/* Centered composer (empty state) */}
          <div className="mx-auto w-full max-w-3xl px-4 mt-4 mb-3">
            <Composer
              id="composer-input"
              value={draft}
              onChange={setDraft}
              onSend={handleSend}
              positioning="flow"
              placeholder="Message CareIQ"
            />
          </div>

          {/* Move suggestions BELOW composer & only prefill (not send) */}
          <div className="mx-auto w-full max-w-3xl px-4 mb-16">
            <Suggestions
              onPick={(t) => setDraft(t)}
              targetId="composer-input"
            />
          </div>
        </>
      ) : (
        <>
          {/* Thread */}
          <div className="mx-auto w-full max-w-3xl px-4 flex-1">
            <div className="flex flex-col gap-4">
              {messages.map((m) => (
                <div key={m.id} className="rounded-xl border border-black/10 dark:border-white/10 p-4">
                  <div className="text-xs mb-1 opacity-60">{m.role}</div>
                  <div className={m.pending ? "opacity-60 italic" : ""}>
                    {m.content || (m.pending ? "Thinking…" : "")}
                  </div>
                  {m.error && (
                    <div className="mt-2 text-xs text-red-600">
                      Error generating reply. Try again.
                    </div>
                  )}
                </div>
              ))}
              <div ref={endRef} />
            </div>
          </div>

          {/* Footer composer */}
          <div
            className="sticky bottom-0 left-0 right-0"
            style={{ marginLeft: leftOffset }}
          >
            <div className="mx-auto w-full max-w-3xl px-4 py-3 bg-gradient-to-t from-background to-background/50 backdrop-blur">
              <Composer
                id="composer-input"
                value={draft}
                onChange={setDraft}
                onSend={handleSend}
                placeholder="Message CareIQ"
              />
              {/* Suggestions below footer composer as well (optional). 
                  If you only want them on empty state, remove this block. */}
              <div className="mt-3">
                <Suggestions onPick={setDraft} targetId="composer-input" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Utils ---------- */

async function tryJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}
