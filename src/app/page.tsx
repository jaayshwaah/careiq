/* 
   FILE: src/app/page.tsx
   Replace entire file with this enhanced version
*/

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

    // Start with empty assistant message - thinking indicator will show
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
                  "\n\nPlease check your connection and try again.",
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
    
    // Remove the last assistant message before regenerating
    setMessages((prev) => {
      const lastAssistantIndex = prev.findLastIndex(m => m.role === "assistant");
      if (lastAssistantIndex !== -1) {
        return prev.slice(0, lastAssistantIndex);
      }
      return prev;
    });
    
    onSend(last.content, []);
  }

  const showEmpty = messages.length === 0;

  return (
    <RequireAuth>
      <div className="flex h-dvh w-full flex-col">
        {/* Header-like hero shown before first message */}
        {showEmpty ? (
          <div className="relative mx-auto mt-16 w-full max-w-3xl px-4 text-center">
            <div className="glass rounded-3xl p-8 mb-8 animate-scaleIn">
              <h1 className="mb-6 text-4xl font-semibold tracking-tight text-gradient">
                How can I help with your nursing home today?
              </h1>
              <p className="text-[var(--text-secondary)] mb-6 text-lg">
                I'm your expert assistant for CMS regulations, survey prep, and nursing home operations.
              </p>
              
              {/* Enhanced suggestion buttons */}
              <div className="flex flex-wrap justify-center gap-3 text-sm">
                <SuggestionButton 
                  onClick={() => onSend("What are the latest CMS medication administration requirements?", [])}
                  icon="💊"
                  primary
                >
                  CMS Medication Requirements
                </SuggestionButton>
                <SuggestionButton 
                  onClick={() => onSend("Help me prepare for an upcoming state survey", [])}
                  icon="📋"
                >
                  Survey Preparation
                </SuggestionButton>
                <SuggestionButton 
                  onClick={() => onSend("What infection control protocols should I review?", [])}
                  icon="🦠"
                >
                  Infection Control
                </SuggestionButton>
                <SuggestionButton 
                  onClick={() => onSend("Create a staff training checklist for CNAs", [])}
                  icon="👩‍⚕️"
                >
                  Staff Training
                </SuggestionButton>
              </div>
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

        {/* Enhanced composer with glass styling */}
        <div className="sticky bottom-0 z-10 w-full composer-container px-4 pb-5 pt-3">
          <Composer
            onSend={onSend}
            placeholder="Ask about regulations, survey prep, compliance..."
            disabled={sending}
            showAttach={true}
            showVoice={false}
            className="glass-heavy"
          />
          {sending ? (
            <div className="mx-auto mt-3 flex max-w-3xl justify-end">
              <button
                onClick={stop}
                className="btn-liquid-secondary text-sm"
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

// Enhanced suggestion button component
function SuggestionButton({ 
  children, 
  onClick, 
  icon, 
  primary = false 
}: { 
  children: React.ReactNode; 
  onClick: () => void; 
  icon: string;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-medium transition-all duration-300
        transform hover:scale-105 active:scale-95 focus-ring
        ${primary 
          ? 'bg-gradient-to-r from-[var(--accent-blue)] to-blue-600 text-white shadow-lg hover:shadow-xl' 
          : 'glass hover:glass-heavy'
        }
      `}
    >
      <span className="text-lg">{icon}</span>
      <span>{children}</span>
    </button>
  );
}

function toWire(arr: Msg[]) {
  return arr.map(({ role, content }) => ({ role, content }));
}