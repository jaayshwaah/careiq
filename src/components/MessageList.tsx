// src/components/MessageList.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useAutoScroll } from "@/lib/useAutoScroll";
import { cn } from "@/lib/utils";
import { ArrowDown, File, Repeat } from "lucide-react";

type Role = "system" | "user" | "assistant";
export type AttachmentPayload = { name: string; type: string; size: number; text?: string };

export type ChatMsg = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  attachments?: AttachmentPayload[];
  pending?: boolean;
};

export default function MessageList({
  messages,
  onRegenerate,
  followNowSignal = 0,
}: {
  messages: ChatMsg[];
  onRegenerate?: () => void;
  /** bump this to force resume follow (e.g., after you send a new user msg) */
  followNowSignal?: number;
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

  // resume follow when sender says so (after a user message)
  useEffect(() => {
    if (followNowSignal > 0) {
      resumeAutoFollow("auto");
    }
  }, [followNowSignal, resumeAutoFollow]);

  // notify on every message change (streams will append to last assistant)
  const last = messages[messages.length - 1];
  useEffect(() => {
    if (!last) return;
    notifyNewContent(last.role);
  }, [last?.content, last?.id, last?.role, notifyNewContent]);

  const normalized = useMemo(() => {
    return messages.filter((m) => m.role !== "system");
  }, [messages]);

  return (
    <div className="relative h-full w-full">
      {/* toast */}
      {!isAtBottom && hasUnseen && (
        <button
          onClick={() => resumeAutoFollow("smooth")}
          className="pointer-events-auto fixed bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black text-white shadow-lg ring-1 ring-black/10 transition hover:opacity-95 dark:bg-white dark:text-black dark:ring-white/10"
        >
          <span className="flex items-center gap-2 px-3 py-2 text-sm">
            <ArrowDown size={16} />
            New reply
          </span>
        </button>
      )}

      {/* list */}
      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-auto px-4 pb-28 pt-8 sm:px-6"
      >
        <div className="mx-auto w-full max-w-3xl">
          {normalized.map((m) => (
            <Bubble key={m.id} msg={m} />
          ))}
        </div>
      </div>

      {/* jump fab */}
      {!isAtBottom && (
        <button
          onClick={() => {
            clearUnseen();
            resumeAutoFollow("smooth");
          }}
          title="Jump to latest"
          className="fixed bottom-5 right-5 z-20 rounded-full bg-white/90 p-3 shadow-lg backdrop-blur-md ring-1 ring-black/10 hover:bg-white dark:bg-neutral-900/80 dark:ring-white/10"
        >
          <ArrowDown size={18} />
        </button>
      )}

      {/* regenerate inline (mirrors ChatGPT) */}
      {!!onRegenerate && last?.role === "assistant" && (
        <div className="pointer-events-auto fixed bottom-5 left-1/2 z-20 -translate-x-1/2">
          <button
            onClick={onRegenerate}
            className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm shadow-lg backdrop-blur-md ring-1 ring-black/10 hover:bg-white dark:bg-neutral-900/80 dark:ring-white/10"
          >
            <Repeat size={16} />
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("mb-6 flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-full whitespace-pre-wrap rounded-3xl px-4 py-3 leading-6 shadow-sm ring-1",
          isUser
            ? "bg-gradient-to-br from-white/80 to-white/60 ring-black/5 dark:from-neutral-800/70 dark:to-neutral-800/50 dark:ring-white/10"
            : "bg-white/80 ring-black/5 dark:bg-neutral-900/70 dark:ring-white/10"
        )}
      >
        {/* attachment bubble for user messages */}
        {isUser && msg.attachments && msg.attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {msg.attachments.map((a, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-1 text-xs text-neutral-700 backdrop-blur-md ring-1 ring-black/5 dark:bg-neutral-800/70 dark:text-neutral-200 dark:ring-white/10"
              >
                <File size={12} />
                <span className="truncate">{a.name}</span>
              </span>
            ))}
          </div>
        )}
        <div className={cn("prose prose-p:my-2 prose-ul:my-2 max-w-none text-[15px] dark:prose-invert")}>
          {msg.content || (msg.pending ? "…" : "")}
        </div>
      </div>
    </div>
  );
}
