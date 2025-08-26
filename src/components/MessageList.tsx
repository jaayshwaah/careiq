/* 
   FILE: src/components/MessageList.tsx
   Replace entire file with this enhanced version
*/

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Paperclip, RefreshCcw, Copy, Check } from "lucide-react";
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
  followNowSignal?: number;
  isAssistantStreaming?: boolean;
  className?: string;
};

// Enhanced thinking dots with liquid animation
function ThinkingDots() {
  return (
    <div className="flex items-center space-x-2">
      <div className="thinking-dots">
        <div className="thinking-dot"></div>
        <div className="thinking-dot"></div>
        <div className="thinking-dot"></div>
      </div>
      <span className="text-[var(--text-secondary)] text-sm ml-2">Thinking...</span>
    </div>
  );
}

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

  // If parent bumps followNowSignal, resume auto-follow
  useEffect(() => {
    if (typeof followNowSignal === "number") {
      resumeAutoFollow();
    }
  }, [followNowSignal, resumeAutoFollow]);

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
      {/* Scroll container with enhanced styling */}
      <div
        ref={containerRef}
        className="scroll-area relative h-full w-full overflow-y-auto px-4 py-6 sm:px-6"
        aria-label="Conversation"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          {messages.map((m, i) => (
            <MessageRow
              key={m.id}
              message={m}
              showRegenerate={Boolean(onRegenerate) && i === messages.length - 1 && m.role === "assistant"}
              onRegenerate={onRegenerate}
            />
          ))}
          
          {/* Enhanced thinking indicator */}
          {isAssistantStreaming && (
            (() => {
              const lastMessage = messages[messages.length - 1];
              const shouldShowThinking = !lastMessage || 
                (lastMessage.role === "assistant" && (!lastMessage.content || lastMessage.content.trim() === ""));
              
              return shouldShowThinking ? (
                <div className="flex w-full justify-start">
                  <div className="message-assistant animate-scaleIn">
                    <ThinkingDots />
                  </div>
                </div>
              ) : null;
            })()
          )}
          
          <div ref={bottomSentinelRef} className="h-1 w-full" />
        </div>
      </div>

      {/* Enhanced jump to latest FAB */}
      <button
        type="button"
        onClick={() => resumeAutoFollow()}
        aria-label="Jump to latest"
        className={`
          fab z-50 transition-all duration-300
          ${isAtBottom ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}
        `}
      >
        <ArrowDown className="h-5 w-5" />
        <span className="sr-only">Jump to latest message</span>
      </button>

      {/* Enhanced new reply toast */}
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
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  };

  const formatTime = (timestamp?: number | string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex w-full group ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`
          max-w-[85%] rounded-2xl px-5 py-4 text-[15px] leading-6 shadow-sm relative
          transition-all duration-200 hover:scale-[1.01]
          ${isUser
            ? "message-user"
            : "message-assistant"
          }
        `}
      >
        {/* Timestamp */}
        {message.createdAt && (
          <div className={`text-xs opacity-60 mb-2 ${isUser ? 'text-white/70' : 'text-[var(--text-tertiary)]'}`}>
            {formatTime(message.createdAt)}
          </div>
        )}

        {/* Message content */}
        <div className="whitespace-pre-wrap">
          {message.content}
        </div>

        {/* Enhanced attachment chips */}
        {Array.isArray(message.attachments) && message.attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {message.attachments.map((a, idx) => (
              <div
                key={a.id || `${message.id}-att-${idx}`}
                className={`
                  inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs
                  transition-all duration-200 hover:scale-105 cursor-pointer
                  ${isUser 
                    ? 'bg-white/20 text-white/90 hover:bg-white/30' 
                    : 'glass text-[var(--text-primary)] hover:glass-heavy'
                  }
                `}
                title={a.name}
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span className="truncate max-w-[12rem]">{a.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Message actions */}
        <div className="absolute -bottom-2 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-1">
            {/* Copy button */}
            <button
              type="button"
              onClick={copyToClipboard}
              title="Copy message"
              className={`
                inline-flex items-center justify-center w-8 h-8 rounded-full
                transition-all duration-200 hover:scale-110 focus-ring
                ${isUser 
                  ? 'bg-white/20 text-white/80 hover:bg-white/30' 
                  : 'glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }
              `}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-[var(--accent-green)]" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Regenerate button for assistant messages */}
            {showRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                title="Regenerate response"
                className="
                  inline-flex items-center justify-center w-8 h-8 rounded-full
                  glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                  transition-all duration-200 hover:scale-110 focus-ring
                "
              >
                <RefreshCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}