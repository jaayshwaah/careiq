/* 
   FILE: src/components/MessageList.tsx
   Enhanced message list with auto-follow, regeneration, and advanced features
*/

"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ArrowDown, Paperclip, RefreshCcw, Copy, Check, ThumbsUp, ThumbsDown, MoreHorizontal, Bookmark } from "lucide-react";

export type ChatRole = "system" | "user" | "assistant";

export type Attachment = {
  id?: string;
  name: string;
  type?: string;
  url?: string;
  size?: number;
  text?: string;
  preview?: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: number | string;
  attachments?: Attachment[];
  isStreaming?: boolean;
  error?: string;
};

type MessageListProps = {
  messages: ChatMessage[];
  onRegenerate?: () => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onBookmark?: (message: ChatMessage) => void;
  onFeedback?: (messageId: string, type: 'up' | 'down') => void;
  isAssistantStreaming?: boolean;
  className?: string;
};

// Auto-follow hook for smooth scrolling behavior
function useAutoFollow() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isAutoFollow, setIsAutoFollow] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = useCallback((smooth = true) => {
    const container = containerRef.current;
    if (!container) return;
    
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? "smooth" : "auto"
    });
  }, []);

  const resumeAutoFollow = useCallback(() => {
    setIsAutoFollow(true);
    scrollToBottom(true);
  }, [scrollToBottom]);

  // Check if user is at bottom
  const checkScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom);
    
    if (!atBottom) {
      setIsAutoFollow(false);
    }
  }, []);

  // Auto-follow when messages change and we're in auto-follow mode
  useEffect(() => {
    if (isAutoFollow) {
      const timer = setTimeout(() => scrollToBottom(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isAutoFollow, scrollToBottom]);

  // Listen for scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkScrollPosition, { passive: true });
    return () => container.removeEventListener('scroll', checkScrollPosition);
  }, [checkScrollPosition]);

  // Resume auto-follow on external signals
  useEffect(() => {
    const handleResumeAutoFollow = () => resumeAutoFollow();
    window.addEventListener('careiq:resume-autofollow', handleResumeAutoFollow);
    return () => window.removeEventListener('careiq:resume-autofollow', handleResumeAutoFollow);
  }, [resumeAutoFollow]);

  return {
    containerRef,
    bottomRef,
    isAtBottom,
    isAutoFollow,
    showScrollButton,
    scrollToBottom,
    resumeAutoFollow,
  };
}

// Enhanced thinking indicator
function ThinkingIndicator() {
  return (
    <div className="flex items-center space-x-1">
      <div className="flex space-x-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
            style={{ animationDelay: `${i * 0.1}s`, animationDuration: '0.6s' }}
          />
        ))}
      </div>
      <span className="text-sm text-gray-500 ml-2">Thinking...</span>
    </div>
  );
}

export default function MessageList({
  messages,
  onRegenerate,
  onEdit,
  onDelete,
  onBookmark,
  onFeedback,
  isAssistantStreaming = false,
  className = "",
}: MessageListProps) {
  const {
    containerRef,
    bottomRef,
    showScrollButton,
    resumeAutoFollow,
  } = useAutoFollow();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Copy to clipboard with feedback
  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // Start editing message
  const startEdit = (messageId: string, currentContent: string) => {
    setEditingId(messageId);
    setEditContent(currentContent);
  };

  // Save edit
  const saveEdit = () => {
    if (editingId && onEdit) {
      onEdit(editingId, editContent);
    }
    setEditingId(null);
    setEditContent("");
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  // Format timestamp
  const formatTime = (timestamp?: number | string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Render file attachment
  const renderAttachment = (attachment: Attachment) => {
    const isImage = attachment.type?.startsWith('image/') || attachment.preview;
    
    return (
      <div key={attachment.id || attachment.name} className="mt-2">
        {isImage && attachment.preview ? (
          <img
            src={attachment.preview}
            alt={attachment.name}
            className="max-w-sm rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => window.open(attachment.preview, '_blank')}
          />
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
            <Paperclip className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{attachment.name}</span>
            {attachment.size && (
              <span className="text-gray-500">
                ({(attachment.size / 1024 / 1024).toFixed(1)} MB)
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // Message component
  const MessageRow = ({ message, index }: { message: ChatMessage; index: number }) => {
    const isUser = message.role === "user";
    const isLast = index === messages.length - 1;
    const isEditing = editingId === message.id;
    const showRegenerate = !isUser && isLast && onRegenerate && !isAssistantStreaming;

    return (
      <div className={`group flex w-full ${isUser ? "justify-end" : "justify-start"} mb-6`}>
        <div
          className={`
            relative max-w-[85%] rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 hover:shadow-md
            ${isUser
              ? "bg-blue-500 text-white rounded-br-md"
              : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-md"
            }
            ${message.error ? "border-red-300 dark:border-red-600" : ""}
          `}
        >
          {/* Timestamp */}
          {message.createdAt && (
            <div className={`text-xs mb-2 opacity-70 ${
              isUser ? "text-white/70" : "text-gray-500 dark:text-gray-400"
            }`}>
              {formatTime(message.createdAt)}
            </div>
          )}

          {/* Message content */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Error state */}
              {message.error && (
                <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
                  ⚠️ {message.error}
                </div>
              )}

              {/* Text content */}
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {message.content || (message.isStreaming ? <ThinkingIndicator /> : "")}
              </div>

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.attachments.map(renderAttachment)}
                </div>
              )}
            </>
          )}

          {/* Action buttons */}
          {!isEditing && (
            <div className="absolute -bottom-2 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200">
              <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 px-2 py-1">
                {/* Copy button */}
                <button
                  onClick={() => copyToClipboard(message.content, message.id)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  title="Copy message"
                >
                  {copiedId === message.id ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-gray-500" />
                  )}
                </button>

                {/* Bookmark button */}
                {onBookmark && (
                  <button
                    onClick={() => onBookmark(message)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="Bookmark message"
                  >
                    <Bookmark className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                )}

                {/* Edit button (user messages only) */}
                {isUser && onEdit && (
                  <button
                    onClick={() => startEdit(message.id, message.content)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="Edit message"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                )}

                {/* Regenerate button (assistant messages only) */}
                {showRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="Regenerate response"
                  >
                    <RefreshCcw className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                )}

                {/* Feedback buttons (assistant messages only) */}
                {!isUser && onFeedback && (
                  <>
                    <button
                      onClick={() => onFeedback(message.id, 'up')}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                      title="Good response"
                    >
                      <ThumbsUp className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => onFeedback(message.id, 'down')}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                      title="Poor response"
                    >
                      <ThumbsDown className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative flex h-full w-full flex-col ${className}`}>
      {/* Messages container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        style={{
          scrollBehavior: "smooth",
          scrollbarWidth: "thin",
          scrollbarColor: "rgb(156 163 175) transparent",
        }}
      >
        <div className="mx-auto max-w-4xl">
          {messages.map((message, index) => (
            <MessageRow key={message.id} message={message} index={index} />
          ))}
          
          {/* Streaming indicator */}
          {isAssistantStreaming && (
            (() => {
              const lastMessage = messages[messages.length - 1];
              const shouldShowThinking = !lastMessage || 
                (lastMessage.role === "assistant" && (!lastMessage.content || lastMessage.content.trim() === ""));
              
              return shouldShowThinking ? (
                <div className="flex w-full justify-start mb-6">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <ThinkingIndicator />
                  </div>
                </div>
              ) : null;
            })()
          )}
          
          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={() => resumeAutoFollow()}
          className="fixed bottom-24 right-6 w-12 h-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40 hover:scale-105"
          title="Jump to latest message"
        >
          <ArrowDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      )}
    </div>
  );
}