"use client";

import React, { useMemo, forwardRef } from "react";
import { Virtuoso } from "react-virtuoso";
import ContentRenderer from "@/components/chat/ContentRenderer";
import { RotateCw, Bookmark, Pencil } from "lucide-react";

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
        const isStreaming = streaming && index === filtered.length - 1 && !isUser;
        
        return (
          <div className="group w-full py-6 px-4">
            <div className={`max-w-3xl mx-auto flex gap-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {/* Avatar - only show for assistant */}
              {!isUser && (
                <div className="flex-shrink-0 w-8 h-8">
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">C</span>
                  </div>
                </div>
              )}
              
              {/* Content */}
              <div className={`flex-1 max-w-2xl ${isUser ? 'text-right' : 'text-left'}`}>
                {/* Message content */}
                <div className={`inline-block max-w-full ${
                  isUser 
                    ? 'bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3' 
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  <div className={`whitespace-pre-wrap leading-relaxed ${
                    isUser ? 'text-white' : 'prose prose-base max-w-none dark:prose-invert'
                  }`}>
                    <ContentRenderer content={message.content || (isStreaming ? "" : "")} />
                    {isStreaming && !message.content && (
                      <div className="flex items-center gap-2 py-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">CareIQ is thinking...</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Timestamp */}
                <div className={`text-xs text-gray-500 dark:text-gray-400 mt-2 ${
                  isUser ? 'text-right' : 'text-left'
                }`}>
                  {new Date(message.created_at).toLocaleTimeString()}
                </div>
                
                {/* Actions */}
                {message.role === 'assistant' && message.content && (
                  <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onRegenerate(index)} 
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      title="Regenerate response"
                    >
                      <RotateCw className="h-3.5 w-3.5"/>
                    </button>
                    <button 
                      onClick={() => onBookmark(message)} 
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      title="Bookmark response"
                    >
                      <Bookmark className="h-3.5 w-3.5"/>
                    </button>
                  </div>
                )}
                {message.role === 'user' && (
                  <div className={`flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isUser ? 'justify-end' : 'justify-start'
                  }`}>
                    <button 
                      onClick={() => onEdit(message.id, message.content)} 
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      title="Edit and regenerate"
                    >
                      <Pencil className="h-3.5 w-3.5"/>
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
