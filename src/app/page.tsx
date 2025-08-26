// src/app/page.tsx
"use client";

import { useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import MessageList from "@/components/MessageList";
import Composer from "@/components/Composer";

type Role = "user" | "assistant" | "system";
type Attachment = { name: string; type: string; size: number; text?: string };
type Msg = { id: string; role: Role; content: string; createdAt: number; attachments?: Attachment[] };

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const [aborter, setAborter] = useState<AbortController | null>(null);
  const [followTick, setFollowTick] = useState(0);

  const lastUser = useMemo(() => messages.filter((m) => m.role === "user").at(-1), [messages]);

  async function onSend(text: string, files: File[]) {
    // auto-follow once user sends
    setFollowTick((t) => t + 1);

    // attachments metadata
    const atts: Attachment[] = (files || []).map((f) => ({
      name: f.name,
      type: f.type || "application/octet-stream",
      size: (f as any).size ?? 0,
    }));

    const userMsg: Msg = { 
      id: uid(), 
      role: "user", 
      content: text, 
      createdAt: Date.now(), 
      attachments: atts 
    };
    setMessages((prev) => [...prev, userMsg]);

    // create pending assistant msg for response
    const asstId = uid();
    const assistantMsg: Msg = {
      id: asstId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      attachments: [],
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setSending(true);

    const controller = new AbortController();
    setAborter(controller);

    try {
      // Use the simple /api/chat endpoint (non-streaming)
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: toWire(messages).concat(toWire([userMsg]))
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        // Try to surface the real error text if available
        let errText = "Unknown error";
        try {
          const j = await res.json();
          errText = j?.error || JSON.stringify(j);
        } catch {
          errText = `${res.status} ${res.statusText}`;
        }
        throw new Error(errText);
      }

      const data = await res.json();
      
      // Extract content from the response
      const responseContent = data?.content || data?.choices?.[0]?.message?.content || "No response received.";

      // Update the assistant message with the full response
      setMessages((prev) =>
        prev.map((m) => (m.id === asstId ? { ...m, content: responseContent } : m))
      );

      // auto-title only for very first exchange
      if (messages.length === 0 && responseContent) {
        void fetch("/api/title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: `${text}\n\n${responseContent}` }),
        })
          .then((r) => r.json())
          .then((j) => {
            const title = j?.title?.trim();
            if (title) {
              window.dispatchEvent(new CustomEvent("chat:title", { detail: { title } }));
            }
          })
          .catch(() => {});
      }
    } catch (err: any) {
      const message = (err && (err.message as string)) || "I had trouble reaching the model.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstId
            ? {
                ...m,
                content:
                  "⚠️ Error:\n\n" +
                  message +
                  "\n\n• Check that OPENROUTER_API_KEY is set correctly.\n• Try again in a moment if it was a temporary issue.",
              }
            : m
        )
      );
    } finally {
      setSending(false);
      setAborter(null);
    }
  }

  function stop() {
    aborter?.abort();
    setAborter(null);
    setSending(false);
  }

  function regenerate() {
    const last = lastUser;
    if (!last) return;
    onSend(last.content, []);
  }

  const showEmpty = messages.length === 0;

  return (
    <RequireAuth>
      <div className="flex h-dvh w-full flex-col">
        {/* Header-like hero shown before first message */}
        {showEmpty ? (
          <div className="relative mx-auto mt-14 w-full max-w-3xl px-4 text-center">
            <h1 className="mb-6 text-4xl font-semibold tracking-tight">
              How can I help with your nursing home today?
            </h1>
            <p className="text-gray-600 mb-4">
              I'm your expert assistant for CMS regulations, survey prep, and nursing home operations.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              <button 
                onClick={() => onSend("What are the latest CMS medication administration requirements?", [])}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
              >
                CMS Medication Requirements
              </button>
              <button 
                onClick={() => onSend("Help me prepare for an upcoming state survey", [])}
                className="px-4 py-2 bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition-colors"
              >
                Survey Preparation
              </button>
              <button 
                onClick={() => onSend("What infection control protocols should I review?", [])}
                className="px-4 py-2 bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors"
              >
                Infection Control
              </button>
            </div>
          </div>
        ) : null}

        {/* Messages */}
        <div className="relative flex min-h-0 flex-1">
          <MessageList 
            messages={messages} 
            onRegenerate={regenerate} 
            followNowSignal={followTick}
            isAssistantStreaming={sending}
          />
        </div>

        {/* Sticky composer w/ gradient scrim */}
        <div className="sticky bottom-0 z-10 w-full bg-gradient-to-b from-transparent to-[var(--bg)] px-4 pb-5 pt-3">
          <Composer
            onSend={onSend}
            placeholder="Ask about regulations, survey prep, compliance..."
            disabled={sending}
          />
          {sending ? (
            <div className="mx-auto mt-2 flex max-w-3xl justify-end">
              <button
                onClick={stop}
                className="rounded-full bg-white/80 px-3 py-1 text-sm shadow ring-1 ring-black/10 hover:bg-white dark:bg-neutral-900/70 dark:ring-white/10"
              >
                Stop generating
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </RequireAuth>
  );
}

function toWire(arr: Msg[]) {
  return arr.map(({ role, content }) => ({ role, content }));
}