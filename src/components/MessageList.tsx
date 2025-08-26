// src/components/MessageList.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Paperclip, RefreshCcw } from "lucide-react";
import { useAutoFollow } from "@/hooks/useAutoFollow";
import Toast from "./Toast";

export type ChatRole = "system" | "user" | "assistant";

export type Attachment = {
  id?: string;
  name: string;
  type?: string;
  url?: string;
  size?: number;
  text?: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: number | string;
  attachments?: Attachment[];
};

type MessageListProps = {
  messages: ChatMessage[];
  onRegenerate?: () => void;
  followNowSignal?: number; // when incremented, we auto-follow now
  isAssistantStreaming?: boolean;
  className?: string;
};

export default function MessageList({
  messages,
  onRegenerate,
  followNowSignal,
  isAssistantStreaming = false,
  className = "",
}: MessageListProps) {
  const {
    containerRef,
    bottomSentinelRef,
    isAtBottom,
    isAutoFollow,
    scrollToBottom,
    resumeAutoFollow,
  } = useAutoFollow();

  const [showNewReplyToast, setShowNewReplyToast] = useState(false);
  const lastAssistantTextLenRef = useRef<number>(0);

  // If parent bumps followNowSignal (e.g., user sent a message), resume auto-follow
  useEffect(() => {
    if (typeof followNowSignal === "number") {
      resumeAutoFollow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followNowSignal]);

  // Derived length of last assistant content to detect token growth
  const assistantTextLen = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    return lastAssistant ? (lastAssistant.content || "").length : 0;
  }, [messages]);

  // Show toast when assistant tokens grow while scrolled up
  useEffect(() => {
    if (!isAssistantStreaming) {
      setShowNewReplyToast(false);
      lastAssistantTextLenRef.current = assistantTextLen;
      return;
    }
    const grew = assistantTextLen > lastAssistantTextLenRef.current;
    if (grew && !isAtBottom) {
      setShowNewReplyToast(true);
    }
    lastAssistantTextLenRef.current = assistantTextLen;
  }, [assistantTextLen, isAssistantStreaming, isAtBottom]);

  // Keep auto-follow when enabled
  useEffect(() => {
    if (isAutoFollow) {
      const raf = requestAnimationFrame(() => scrollToBottom(false));
      return () => cancelAnimationFrame(raf);
    }
  }, [messages.length, isAutoFollow, scrollToBottom]);

  return (
    <div className={["relative flex h-full w-full flex-col", className].join(" ")}>
      {/* Scroll container */}
      <div
        ref={containerRef}
        className="scroll-area relative h-full w-full overflow-y-auto px-4 py-6 sm:px-6"
        aria-label="Conversation"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          {messages.map((m, i) => (
            <MessageRow
              key={m.id}
              message={m}
              showRegenerate={Boolean(onRegenerate) && i === messages.length - 1 && m.role === "assistant"}
              onRegenerate={onRegenerate}
            />
          ))}
          <div ref={bottomSentinelRef} className="h-1 w-full" />
        </div>
      </div>

      {/* Jump to latest FAB */}
      <button
        type="button"
        onClick={() => resumeAutoFollow()}
        aria-label="Jump to latest"
        className={[
          "fixed bottom-6 right-6 z-50 inline-flex h-11 items-center gap-2 rounded-full px-4 shadow-lg transition",
          isAtBottom ? "pointer-events-none scale-95 opacity-0" : "pointer-events-auto opacity-100",
          "border border-black/10 bg-white/80 text-black/80 backdrop-blur-xl hover:bg-white dark:border-white/10 dark:bg-zinc-900/60 dark:text-white/80",
        ].join(" ")}
      >
        <ArrowDown className="h-4 w-4" />
        <span className="text-sm font-medium">Jump to latest</span>
      </button>

      {/* New reply toast (when scrolled up and assistant is streaming) */}
      <Toast
        open={showNewReplyToast && !isAtBottom}
        label="New reply"
        onClick={() => {
          setShowNewReplyToast(false);
          resumeAutoFollow();
        }}
      />
    </div>
  );
}

function MessageRow({
  message,
  showRegenerate,
  onRegenerate,
}: {
  message: ChatMessage;
  showRegenerate?: boolean;
  onRegenerate?: () => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={["flex w-full", isUser ? "justify-end" : "justify-start"].join(" ")}>
      <div
        className={[
          "max-w-[85%] rounded-2xl px-4 py-2 text-[15px] leading-6 shadow-sm",
          isUser
            ? "rounded-br-md bg-blue-600 text-white"
            : "rounded-bl-md border border-black/10 bg-white/70 text-black/90 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/50 dark:text-white/90",
        ].join(" ")}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>

        {/* Attachment chips */}
        {Array.isArray(message.attachments) && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {message.attachments.map((a, idx) => (
              <span
                key={a.id || `${message.id}-att-${idx}`}
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-2 py-1 text-xs text-black/80 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/40 dark:text-white/80"
                title={a.name}
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span className="truncate max-w-[12rem]">{a.name}</span>
              </span>
            ))}
          </div>
        )}

        {/* Regenerate button on the last assistant message */}
        {showRegenerate && (
          <div className="mt-2">
            <button
              type="button"
              onClick={onRegenerate}
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs text-black/70 shadow-sm backdrop-blur hover:bg-white dark:border-white/10 dark:bg-zinc-900/60 dark:text-white/70"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
