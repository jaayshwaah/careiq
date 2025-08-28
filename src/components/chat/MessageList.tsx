"use client";

import React, { useMemo, forwardRef } from "react";
import { Virtuoso } from "react-virtuoso";
import ContentRenderer from "@/components/chat/ContentRenderer";
import { Copy, Check, RotateCw, Bookmark, Pencil } from "lucide-react";

export type Msg = {
  id: string;
  chat_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string;
};

type Props = {
  messages: Msg[];
  streaming: boolean;
  onRegenerate: (assistantIndex: number) => void;
  onBookmark: (m: Msg) => void;
  onEdit: (id: string, content: string) => void;
  filter?: string;
  onAtBottomChange?: (atBottom: boolean) => void;
};

const MessageList = forwardRef<any, Props>(function MessageList(
  {
  messages,
  streaming,
  onRegenerate,
  onBookmark,
  onEdit,
  filter,
  onAtBottomChange,
},
  ref
) {
  const filtered = useMemo(() => {
    const q = (filter || "").toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => m.content.toLowerCase().includes(q));
  }, [messages, filter]);

  return (
    <Virtuoso
      ref={ref as any}
      data={filtered}
      className="h-full"
      followOutput="smooth"
      atBottomStateChange={onAtBottomChange}
      itemContent={(index, message) => {
        const isUser = message.role === "user";
        return (
          <div className={`group w-full ${isUser ? '' : 'bg-gray-50 dark:bg-gray-800'}`}>
            <div className="max-w-3xl mx-auto px-4 py-4 flex gap-4">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isUser ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                }`}>
                  <span className="text-sm font-medium">{isUser ? 'U' : 'C'}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{isUser ? 'You' : 'CareIQ'}</span>
                </div>
                <ContentRenderer content={message.content || (streaming && !isUser ? "" : "")} />
                {/* Toolbar */}
                {message.role === 'assistant' && message.content && (
                  <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onRegenerate(index)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1">
                      <RotateCw size={12}/> Regenerate
                    </button>
                    <button onClick={() => onBookmark(message)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1">
                      <Bookmark size={12}/> Bookmark
                    </button>
                  </div>
                )}
                {message.role === 'user' && (
                  <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(message.id, message.content)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1">
                      <Pencil size={12}/> Edit & Resend
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }}
    />
  );
});

export default MessageList;
