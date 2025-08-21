// src/components/NewChatClient.tsx
"use client";

import React from "react";
import HeaderBanner from "@/components/HeaderBanner";
import Suggestions from "@/components/Suggestions";
import Composer from "@/components/Composer";

type Role = "user" | "assistant";
type Message = { id: string; role: Role; content: string; pending?: boolean; error?: boolean };

export default function NewChatClient() {
  const [draft, setDraft] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const endRef = React.useRef<HTMLDivElement | null>(null);

  const hasMessages = messages.length > 0;

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const handleSend = async (text: string) => {
    const user: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const pending: Message = { id: crypto.randomUUID(), role: "assistant", content: "", pending: true };
    setMessages((m) => [...m, user, pending]);
    setDraft("");

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = await r.json();
      const assistant = (data?.content as string) || "";
      setMessages((m) => m.map((x) => (x.id === pending.id ? { ...x, content: assistant, pending: false } : x)));
    } catch (e) {
      setMessages((m) =>
        m.map((x) =>
          x.id === pending.id
            ? { ...x, content: "Something went wrong. Please try again.", pending: false, error: true }
            : x
        )
      );
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col">
      {!hasMessages ? (
        <>
          <HeaderBanner />
          <div className="mx-auto w-full max-w-3xl px-4 mt-4 mb-3">
            <Composer id="composer-input" value={draft} onChange={setDraft} onSend={handleSend} positioning="flow" />
          </div>
          <div className="mx-auto w-full max-w-3xl px-4 mb-16">
            {/* Prefill only */}
            <Suggestions onPick={setDraft} targetId="composer-input" />
          </div>
        </>
      ) : (
        <>
          <div className="mx-auto w-full max-w-3xl px-4 flex-1">
            <div className="flex flex-col gap-4">
              {messages.map((m) => (
                <div key={m.id} className="rounded-xl border border-black/10 dark:border-white/10 p-4">
                  <div className="text-xs mb-1 opacity-60">{m.role}</div>
                  <div className={m.pending ? "opacity-60 italic" : ""}>{m.content || (m.pending ? "Thinking…" : "")}</div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          </div>
          <div className="sticky bottom-0 left-0 right-0">
            <div className="mx-auto w-full max-w-3xl px-4 py-3 bg-gradient-to-t from-background to-background/50 backdrop-blur">
              <Composer id="composer-input" value={draft} onChange={setDraft} onSend={handleSend} />
              <div className="mt-3">
                {/* You can keep or remove these footer suggestions; they only prefill now */}
                <Suggestions onPick={setDraft} targetId="composer-input" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
