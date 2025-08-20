// src/components/MessageList.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useAutoScroll } from "@/lib/useAutoScroll";
import { cn } from "@/lib/utils";

/** Types (align with your app) */
type ChatRole = "system" | "user" | "assistant";
export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string; // ISO
};

export default function MessageList({
  messages,
  isStreaming = false,
  /** Increment this every time you send a new user message to auto-resume follow. */
  followNowSignal = 0,
  /** Increment this for each assistant token chunk to power the "New reply" toast when scrolled up. */
  newAssistantTokenTick = 0,
}: {
  messages: ChatMessage[];
  isStreaming?: boolean;
  followNowSignal?: number;
  newAssistantTokenTick?: number;
}) {
  const {
    ref,
    isAtBottom,
    paused,
    hasUnseen,
    handleScroll,
    notifyNewContent,
    resumeAutoFollow,
    clearUnseen,
  } = useAutoScroll<HTMLDivElement>(72);

  // Follow now when parent signals (user sent a message).
  useEffect(() => {
    if (followNowSignal > 0) {
      resumeAutoFollow("auto"); // snap to bottom on send
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followNowSignal]);

  // Notify hook when assistant tokens arrive (to show toast if scrolled up & paused).
  useEffect(() => {
    if (newAssistantTokenTick > 0) {
      notifyNewContent("assistant");
    }
  }, [newAssistantTokenTick, notifyNewContent]);

  // Also notify on message length changes (covers non-stream inserts, edits, etc.)
  useEffect(() => {
    notifyNewContent("assistant");
  }, [messages.length, notifyNewContent]);

  const rendered = useMemo(
    () => messages.map((m) => <Bubble key={m.id} role={m.role} content={m.content} />),
    [messages]
  );

  return (
    <div className="relative flex-1 min-h-0">
      {/* Scrollable region (single vertical scroller in the app) */}
      <div
        ref={ref}
        onScroll={handleScroll}
        className="flex h-full w-full flex-col gap-3 overflow-y-auto pr-1"
        aria-live="polite"
        aria-busy={isStreaming ? "true" : "false"}
      >
        <div className="flex flex-col gap-3 pt-2 pb-20">{rendered}</div>
      </div>

      {/* Floating controls when scrolled up */}
      {!isAtBottom && (
        <>
          {/* Jump to latest FAB */}
          <button
            onClick={() => resumeAutoFollow("smooth")}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-zinc-200 bg-white/90 px-4 py-1.5 text-sm shadow-md hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
          >
            Jump to latest ↓
          </button>

          {/* New reply toast (appears slightly above the FAB) */}
          {hasUnseen && (
            <div
              className="absolute bottom-14 left-1/2 -translate-x-1/2 rounded-md border border-zinc-200 bg-white/95 px-3 py-1.5 text-xs shadow-sm"
              role="status"
            >
              New reply
              <button
                onClick={() => {
                  clearUnseen();
                  resumeAutoFollow("smooth");
                }}
                className="ml-2 underline underline-offset-2 hover:opacity-80"
              >
                View
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Bubble({ role, content }: { role: ChatRole; content: string }) {
  const isUser = role === "user";
  const isAssistant = role === "assistant";
  const isSystem = role === "system";

  return (
    <div
      className={cn(
        "w-full",
        isUser && "flex justify-end",
        (isAssistant || isSystem) && "flex justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-[15px] leading-relaxed shadow-sm",
          isUser && "bg-zinc-900 text-white",
          isAssistant && "bg-white text-zinc-900 border border-zinc-200",
          isSystem && "bg-amber-50 text-amber-900 border border-amber-200"
        )}
      >
        {content}
      </div>
    </div>
  );
}
