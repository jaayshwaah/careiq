"use client";

import React from "react";
import HeaderBanner from "@/components/HeaderBanner";
import Suggestions from "@/components/Suggestions";
import Composer from "@/components/Composer";

type Role = "user" | "assistant";
type Message = { id: string; role: Role; content: string; pending?: boolean; error?: boolean };

function useSidebarOffset() {
  const [left, setLeft] = React.useState(0);
  React.useEffect(() => {
    const aside = document.querySelector("aside") as HTMLElement | null;
    if (!aside) return;
    const update = () => setLeft(aside.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(aside);
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
  const [chatId, setChatId] = React.useState<string | null>(null);
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
    const id = data?.conversation?.id as string | undefined;
    if (!id) throw new Error("Conversation was created but no id was returned");
    setChatId(id);
    return id;
  }

  async function handleSend(text: string) {
    const conversationId = await ensureConversationId();

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
        // Our /api/messages expects { conversation_id, role, content }
        body: JSON.stringify({ conversation_id: conversationId, role: "user", content: text }),
      });

      let assistant: Message;
      if (res.ok) {
        const data = await res.json();
        // API returns { ok, message } with fields like { id, role, content, ... }
        const apiMsg = data?.message;
        assistant = apiMsg
          ? { id: apiMsg.id, role: (apiMsg.role as Role) ?? "assistant", content: apiMsg.content ?? "" }
          : { id: crypto.randomUUID(), role: "assistant", content: "No reply returned." };
      } else {
        const err = await tryJson(res);
        assistant = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: err?.error || "I had trouble generating a reply just now. Try again?",
        };
      }

      setMessages((m) => m.map((msg) => (msg.id === pendingAssist.id ? assistant : msg)));
    } catch (e) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === pendingAssist.id
            ? {
                ...msg,
                content: e instanceof Error ? e.message : "Something went wrong. Please try again.",
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
          <div className="mx-auto w-full max-w-3xl px-4">
            <Suggestions targetId="composer-input" />
          </div>
          <div className="mx-auto w-full max-w-3xl px-4 mt-4 mb-16">
            <Composer id="composer-input" onSend={handleSend} positioning="flow" />
          </div>
        </>
      ) : (
        <>
          <div className="mx-auto w-full max-w-3xl flex-1 px-4">
            <div className="pt-2 pb-36 space-y-4">
              <div className="space-y-4">
                {messages.map((m) => {
                  if (m.role === "user") {
                    return (
                      <div key={m.id} className="flex justify-end">
                        <div
                          className="inline-block rounded-2xl px-3 py-2"
                          style={{
                            maxWidth: "80%",
                            background: "rgba(16,163,127,0.12)",
                            border: "1px solid rgba(16,163,127,0.35)",
                            color: "var(--text)",
                          }}
                        >
                          <div className="text-sm whitespace-pre-wrap leading-6">{m.content}</div>
                        </div>
                      </div>
                    );
                  }
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

          {/* Fixed, content-aligned composer (stays out from under the sidebar) */}
          <div
            className="fixed bottom-0"
            style={{ left: leftOffset, right: 0, background: "transparent", pointerEvents: "none" }}
          >
            <div className="mx-auto max-w-3xl px-4 py-4" style={{ pointerEvents: "auto" }}>
              <Composer id="composer-input" onSend={handleSend} positioning="static" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

async function tryJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}
