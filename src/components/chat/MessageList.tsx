"use client";

import React, { useMemo, forwardRef } from "react";
import { Virtuoso } from "react-virtuoso";
import ContentRenderer from "@/components/chat/ContentRenderer";
import ChatBranching from "@/components/chat/ChatBranching";
import { RotateCw, Bookmark, Pencil, FileText, Brain, Download } from "lucide-react";

export type Msg = {
  id: string;
  chat_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string;
  fileOffer?: {
    fileId: string;
    fileType: string;
    template: string;
    filename: string;
    data: any;
  };
};

type Props = {
  messages: Msg[];
  streaming: boolean;
  onRegenerate: (assistantIndex: number) => void;
  onBookmark: (m: Msg) => void;
  onEdit: (id: string, content: string) => void;
  onSaveTemplate?: (m: Msg) => void;
  onExtractKnowledge?: (m: Msg) => void;
  onCreateBranch?: (messageId: string, content: string) => void;
  onSwitchBranch?: (branchId: string) => void;
  onDeleteBranch?: (branchId: string) => void;
  onStop?: () => void;
  onDownloadFile?: (fileOffer: NonNullable<Msg['fileOffer']>) => void;
  branches?: any[];
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
  onSaveTemplate,
  onExtractKnowledge,
  onCreateBranch,
  onSwitchBranch,
  onDeleteBranch,
  onStop,
  onDownloadFile,
  branches = [],
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
              {/* Content */}
              <div className={`flex-1 max-w-2xl ${isUser ? 'text-right' : 'text-left'}`}>
                {/* Message content */}
                <div className={`inline-block max-w-full ${
                  isUser 
                    ? 'user-message-bubble text-white px-4 py-3' 
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  <div className={`whitespace-pre-wrap leading-relaxed ${
                    isUser ? 'text-white' : 'prose prose-base max-w-none dark:prose-invert'
                  }`}>
                    <ContentRenderer content={message.content || (isStreaming ? "" : "")} />
                    {isStreaming && !message.content && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 py-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">CareIQ is thinking...</span>
                        </div>
                        {onStop && (
                          <div className="flex justify-center">
                            <button
                              onClick={onStop}
                              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 shadow-md"
                            >
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                              Stop generating
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* File download offer */}
                {message.fileOffer && !isUser && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                        {message.fileOffer.fileType === 'excel' ? (
                          <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z"/>
                            <path d="M6 8h8v1H6V8zm0 2h8v1H6v-1zm0 2h5v1H6v-1z"/>
                          </svg>
                        ) : message.fileOffer.fileType === 'pdf' ? (
                          <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm6 2a1 1 0 011 1v6a1 1 0 01-2 0V5a1 1 0 011-1z"/>
                          </svg>
                        ) : (
                          <FileText className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {message.fileOffer.filename}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {message.fileOffer.fileType.toUpperCase()} • Ready for download
                        </p>
                      </div>
                      {onDownloadFile && (
                        <button
                          onClick={() => onDownloadFile(message.fileOffer!)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <Download size={16} />
                          Download
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Timestamp */}
                <div className={`text-xs text-gray-500 dark:text-gray-400 mt-2 ${
                  isUser ? 'text-right' : 'text-left'
                }`}>
                  {new Date(message.created_at).toLocaleTimeString()}
                </div>
                
                {/* Chat Branching */}
                {message.role === 'assistant' && message.content && onCreateBranch && (
                  <div className="mt-4">
                    <ChatBranching
                      messageId={message.id}
                      branches={branches.filter(b => b.messageId === message.id)}
                      onCreateBranch={onCreateBranch}
                      onSwitchBranch={onSwitchBranch}
                      onDeleteBranch={onDeleteBranch}
                    />
                  </div>
                )}

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
                    {onSaveTemplate && (
                      <button 
                        onClick={() => onSaveTemplate(message)} 
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        title="Save as template"
                      >
                        <FileText className="h-3.5 w-3.5"/>
                      </button>
                    )}
                    {onExtractKnowledge && (
                      <button 
                        onClick={() => onExtractKnowledge(message)} 
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        title="Extract knowledge"
                      >
                        <Brain className="h-3.5 w-3.5"/>
                      </button>
                    )}
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
