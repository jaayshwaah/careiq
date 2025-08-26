// src/app/page.tsx
"use client";

import { useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import MessageList from "@/components/MessageList";
import Composer from "@/components/Composer";

type Role = "user" | "assistant" | "system";
type Attachment = { name: string; type: string; size: number; text?: string };
type Msg = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  attachments?: Attachment[];
};

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const [aborter, setAborter] = useState<AbortController | null>(null);
  const [followTick, setFollowTick] = useState(0);

  const lastUser = useMemo(
    () => messages.filter((m) => m.role === "user").at(-1),
    [messages]
  );

  async function onSend(text: string, files: File[]) {
    // Resume auto-follow once user sends (pairs with your MessageList behavior)
    setFollowTick((t) => t + 1);

    // Build attachment metadata
    const atts: Attachment[] = (files || []).map((f) => ({
      name: f.name,
      type: f.type || "application/octet-stream",
      size: (f as any).size ?? 0,
    }));

    // Push user message
    const userMsg: Msg = {
      id: uid(),
      role: "user",
      content: text,
      createdAt: Date.now(),
      attachments: atts,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Create a pending assistant message (we'll fill content)
    const asstId = uid();
    const assistantMsg: Msg = {
      id: asstId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      // Mirror user's attachments so chips appear under the assistant bubble too
      attachments: atts.length ? [...atts] : [],
    };
    setMessages((prev) => [...prev, assistantMsg]);

    setSending(true);
    const controller = new AbortController();
    setAborter(controller);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: toWire(messages).concat(toWire([userMsg])),
          attachments: atts,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        // Surface the server's helpful message if provided
        let errText = "Unknown error";
        try {
          const j = await res.json();
          errText = j?.error || j?.message || JSON.stringify(j);
        } catch {
          errText = `${res.status} ${res.statusText}`;
        }
        throw new Error(errText);
      }

      const ctype = res.headers.get("content-type") || "";

      // --- Path A: JSON (non-stream) ----------------------------------------
      if (ctype.includes("application/json")) {
        const data = await res.json();
        const content =
          data?.choices?.[0]?.message?.content ??
          data?.choices?.[0]?.delta?.content ??
          "";

        setMessages((prev) =>
          prev.map((m) => (m.id === asstId ? { ...m, content: String(content || "") } : m))
        );

      // --- Path B: SSE stream ------------------------------------------------
      } else if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });

          // Parse Server-Sent Events lines: look for "data: {json}"
          for (const line of chunk.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.replace(/^data:\s*/, "");
            if (payload === "[DONE]") continue;

            try {
              const j = JSON.parse(payload);
              const delta: string | undefined = j?.choices?.[0]?.delta?.content;
              if (delta) {
                full += delta;
                setMessages((prev) =>
                  prev.map((m) => (m.id === asstId ? { ...m, content: full } : m))
                );
              }
            } catch {
              // ignore keepalive/bad lines
            }
          }
        }
      } else {
        // Unexpected content-type and no stream; treat as generic failure
        throw new Error("Empty response from /api/chat.");
      }

      // Auto-title only for the very first exchange
      if (messages.length === 0) {
        const currentAsst = getById(asstId);
        if (currentAsst?.content) {
          void fetch("/api/title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: `${text}\n\n${currentAsst.content}` }),
          })
            .then((r) => r.json())
            .then((j) => {
              const title = j?.title?.trim();
              if (title) {
                window.dispatchEvent(
                  new CustomEvent("chat:title", { detail: { title } })
                );
              }
            })
            .catch(() => {});
        }
      }
    } catch (err: any) {
      const message =
        (err && (err.message as string)) ||
        "I had trouble reaching the model.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstId
            ? {
                ...m,
                content:
                  "⚠️ Model error:\n\n" +
                  message +
                  "\n\n• Check that OPENROUTER_API_KEY is set for this Vercel environment.\n• If you just set it, redeploy.\n• Retries may help if it was a transient 429/5xx.",
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

  function getById(id: string) {
    return messages.find((m) => m.id === id);
  }

  const showEmpty = messages.length === 0;

  return (
    <RequireAuth>
      <div className="flex h-dvh w-full flex-col">
        {/* Header shown before first message */}
        {showEmpty ? (
          <div className="relative mx-auto mt-14 w-full max-w-3xl px-4 text-center">
            <h1 className="mb-6 text-4xl font-semibold tracking-tight">
              How can I help today?
            </h1>
          </div>
        ) : null}

        {/* Messages */}
        <div className="relative flex min-h-0 flex-1">
          <MessageList
            messages={messages}
            onRegenerate={regenerate}
            followNowSignal={followTick}
            // If you pasted my MessageList with toast support, this powers the toast
            isAssistantStreaming={sending}
            className="flex-1"
          />
        </div>

        {/* Sticky composer + Stop button */}
        <div className="sticky bottom-0 z-10 w-full bg-gradient-to-b from-transparent to-[var(--bg)] px-4 pb-5 pt-3">
          <Composer
            onSend={onSend}
            placeholder="How can I help today?"
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
