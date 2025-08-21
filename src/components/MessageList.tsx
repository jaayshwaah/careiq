// src/components/MessageList.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useAutoScroll } from "@/lib/useAutoScroll";
import { cn } from "@/lib/utils";
import { Bookmark, RotateCcw } from "lucide-react";

/** Types */
type ChatRole = "system" | "user" | "assistant";

type AttachmentPayload = {
  name: string;
  type: string;
  size: number;
  text: string;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string; // ISO
  attachments?: AttachmentPayload[];
};

export default function MessageList({
  messages,
  isStreaming = false,
  streamingId = null,
  followNowSignal = 0,
  newAssistantTokenTick = 0,
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

  // Follow on new send
  useEffect(() => {
    if (followNowSignal > 0) {
      resumeAutoFollow("auto");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followNowSignal]);

  // Toast logic for streaming while scrolled up
  useEffect(() => {
    if (newAssistantTokenTick > 0) {
      notifyNewContent("assistant");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newAssistantTokenTick]);

  const rendered = useMemo(() => {
    return messages.map((msg) => {
      const mine = msg.role === "user";
      const isAssistant = msg.role === "assistant";

      const bubble = (
        <div
          className={cn(
            "max-w-full rounded-2xl px-4 py-2 shadow-sm ring-1",
            mine ? "ml-auto bg-white ring-zinc-200" : "mr-auto bg-zinc-50 ring-zinc-200"
          )}
        >
          <div className="prose prose-zinc dark:prose-invert max-w-none whitespace-pre-wrap">
            {msg.content || (isStreaming && msg.id === streamingId ? "…" : "")}
          </div>

          {/* Inline tiny regenerate icon under EACH assistant message */}
          {isAssistant && onRegenerate && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => onRegenerate(msg.id)}
                title="Regenerate this response"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Attachments bubble for user messages */}
          {!!msg.attachments?.length && mine && (
            <details className="group mt-2">
              <summary className="list-none">
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 shadow-sm hover:bg-zinc-50 cursor-pointer">
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
              <div className="mt-2 space-y-1 text-xs text-zinc-600">
                {msg.attachments.map((a, i) => (
                  <div key={i} className="rounded border border-zinc-200 bg-white px-2 py-1">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-[11px] opacity-70">
                      {formatSize(a.size)} • {a.type}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      );

      return (
        <div key={msg.id} className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
          {/* Meta row */}
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span>{mine ? "You" : "CareIQ"}</span>
            {msg.createdAt && <span>• {timeAgo(msg.createdAt)}</span>}

            {/* Bookmark action */}
            <button
              className="ml-2 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-50"
              title="Bookmark"
              onClick={async () => {
                try {
                  await fetch("/api/bookmarks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: msg.content }),
                  });
                } catch {
                  /* ignore */
                }
              }}
            >
              <Bookmark className="h-3 w-3" />
              Save
            </button>
          </div>

          {bubble}
        </div>
      );
    });
  }, [messages, isStreaming, streamingId, onRegenerate]);

  return (
    <div className="relative flex-1 min-h-0">
      {/* Single scroll container */}
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
            onClick={() => {
              resumeAutoFollow("button");
              clearUnseen();
            }}
            className={cn(
              "absolute bottom-16 right-4 z-20 rounded-full border border-zinc-200 bg-white/90 px-3 py-1.5 text-xs shadow-md backdrop-blur",
              "hover:bg-white"
            )}
          >
            Jump to latest
          </button>

          {/* "New reply" toast */}
          {hasUnseen && (
            <div className="pointer-events-none absolute bottom-28 right-4 z-10 rounded-full bg-black/80 px-3 py-1.5 text-xs text-white shadow">
              New reply
            </div>
          )}
        </>
      )}
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

function timeAgo(iso?: string) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  const wk = Math.floor(day / 7);
  if (wk < 4) return `${wk}w`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo`;
  const yr = Math.floor(day / 365);
  return `${yr}y`;
}
