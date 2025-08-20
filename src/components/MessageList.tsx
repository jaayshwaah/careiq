// src/components/MessageList.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useAutoScroll } from "@/lib/useAutoScroll";
import { cn } from "@/lib/utils";

/** Types (align with your app) */
type ChatRole = "system" | "user" | "assistant";

type AttachmentPayload = {
  name: string;
  type: string;
  size: number;
  text: string; // stored on the user message; not displayed here
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string; // ISO
  /** Present on user messages when attachments were used on send (for regenerate). */
  attachments?: AttachmentPayload[];
};

export default function MessageList({
  messages,
  isStreaming = false,
  streamingId = null,
  /** Increment this every time you send a new user message to auto-resume follow. */
  followNowSignal = 0,
  /** Increment this for each assistant token chunk to power the "New reply" toast when scrolled up. */
  newAssistantTokenTick = 0,
  /** Regenerate handler provided by page.tsx */
  onRegenerate,
}: {
  messages: ChatMessage[];
  isStreaming?: boolean;
  streamingId?: string | null;
  followNowSignal?: number;
  newAssistantTokenTick?: number;
  onRegenerate?: (assistantMessageId: string) => void;
}) {
  const {
    ref,
    isAtBottom,
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
    () =>
      messages.map((m) => (
        <MessageRow
          key={m.id}
          msg={m}
          isStreaming={isStreaming && streamingId === m.id}
          showActions={m.role === "assistant"}
          onRegenerate={onRegenerate}
        />
      )),
    [messages, isStreaming, streamingId, onRegenerate]
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

function MessageRow({
  msg,
  isStreaming,
  showActions,
  onRegenerate,
}: {
  msg: ChatMessage;
  isStreaming: boolean;
  showActions: boolean;
  onRegenerate?: (assistantMessageId: string) => void;
}) {
  const isUser = msg.role === "user";

  return (
    <div className="w-full">
      <Bubble role={msg.role} content={msg.content} />

      {/* Attachments used pill (only for user messages with snapshots) */}
      {isUser && msg.attachments && msg.attachments.length > 0 && (
        <div className="mt-1 flex justify-end pr-1">
          <details className="group">
            <summary className="list-none">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-600 shadow-sm hover:bg-zinc-50 cursor-pointer">
                📎 Used {msg.attachments.length} file
                {msg.attachments.length > 1 ? "s" : ""}
                <svg
                  className="h-3 w-3 transition-transform group-open:rotate-180"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </summary>
            <div className="mt-1 rounded-lg border border-zinc-200 bg-white p-2 shadow-sm">
              <ul className="max-h-48 w-[min(80vw,28rem)] overflow-y-auto text-xs text-zinc-700">
                {msg.attachments.map((a, i) => (
                  <li key={`${a.name}-${i}`} className="flex items-center justify-between gap-3 py-1">
                    <span className="truncate" title={a.name}>
                      {a.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-zinc-400">{formatSize(a.size)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </div>
      )}

      {/* Row actions for assistant messages */}
      {showActions && (
        <div className="mt-1 flex items-center gap-2 pl-1">
          <button
            className={cn(
              "rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs hover:bg-zinc-50 shadow-sm",
              isStreaming && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => onRegenerate?.(msg.id)}
            disabled={isStreaming}
            title="Try again / regenerate this reply"
          >
            ↻ Regenerate
          </button>
        </div>
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
        {content || (isAssistant ? "…" : "")}
      </div>
    </div>
  );
}

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
