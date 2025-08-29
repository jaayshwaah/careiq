// src/components/Chat.tsx - ChatGPT-style chat interface
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Check, Send, Pencil, Bookmark, Paperclip, Download, Settings as SettingsIcon, FileText, Users } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import Suggestions from "@/components/Suggestions";
import MessageList from "@/components/chat/MessageList";
import ChatTemplates from "@/components/ChatTemplates";

type Msg = {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 py-3">
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400">CareIQ is thinking...</span>
    </div>
  );
}

function CopyButton({ content, className = "" }: { content: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <button
      onClick={copyToClipboard}
      className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
      title="Copy response"
    >
      {copied ? (
        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
          <Check className="h-4 w-4" />
          <span className="text-xs font-medium">Copied!</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <Copy className="h-4 w-4" />
          <span className="text-xs font-medium">Copy</span>
        </div>
      )}
    </button>
  );
}

function MessageBubble({ message, isStreaming = false, onEdit, onBookmark }: { 
  message: Msg; 
  isStreaming?: boolean; 
  onEdit?: (id: string, content: string) => void;
  onBookmark?: (message: Msg) => void;
}) {
  const isUser = message.role === "user";
  
  return (
    <div className={`group w-full ${isUser ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/50'} border-b border-gray-100/50 dark:border-gray-800/50`}>
      <div className="max-w-4xl mx-auto px-4 py-6 flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm ${
            isUser 
              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white' 
              : 'bg-gradient-to-br from-green-600 to-green-700 text-white'
          }`}>
            <span className="text-sm font-bold">
              {isUser ? 'You' : 'CIQ'}
            </span>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {isUser ? 'You' : 'CareIQ Assistant'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(message.created_at).toLocaleTimeString()}
            </span>
          </div>
          
          <div className="prose prose-base max-w-none dark:prose-invert text-gray-900 dark:text-gray-100 leading-relaxed">
            {message.content ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : isStreaming ? (
              <TypingIndicator />
            ) : null}
          </div>
          
          {/* Actions */}
          {!isUser && message.content && (
            <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton content={message.content} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
              <button
                onClick={() => onBookmark?.(message)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Bookmark response"
              >
                <Bookmark className="h-4 w-4" />
              </button>
            </div>
          )}
          {isUser && (
            <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit?.(message.id, message.content)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Edit and regenerate"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageInput({
  onSend,
  disabled = false,
  value,
  onChangeValue,
  onAttach,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  value?: string;
  onChangeValue?: (v: string) => void;
  onAttach?: (files: FileList | null) => void;
}) {
  const [internalValue, setInternalValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentValue = value !== undefined ? value : internalValue;
  const setValue = (v: string) => (onChangeValue ? onChangeValue(v) : setInternalValue(v));

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = currentValue.trim();
    if (!trimmed || disabled) return;
    
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    // Support Ctrl/Cmd + Enter to send
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg focus-within:shadow-xl transition-all focus-within:border-blue-500/50">
            <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => onAttach?.(e.target.files)} />
            <div className="absolute left-3 bottom-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={disabled}
                className="w-9 h-9 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Attach files"
              >
                <Paperclip size={18} />
              </button>
            </div>
            <textarea
              id="composer-input"
              ref={textareaRef}
              value={currentValue}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message CareIQ..."
              disabled={disabled}
              className="w-full resize-none border-0 bg-transparent pl-14 pr-14 py-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-base leading-6"
              style={{ minHeight: '64px', maxHeight: '200px' }}
              rows={1}
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              {disabled && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-xs">Generating...</span>
                </div>
              )}
              <button
                type="submit"
                disabled={!currentValue.trim() || disabled}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  currentValue.trim() && !disabled
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg hover:scale-105'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
          
          {/* Shortcut hints */}
          <div className="flex items-center justify-center mt-3 text-xs text-gray-500 dark:text-gray-400 space-x-4">
            <span>⌘/Ctrl+K to search</span>
            <span>•</span>
            <span>⌘/Ctrl+Enter to send</span>
            <span>•</span>
            <span>Shift+Enter for newline</span>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Chat({ chatId }: { chatId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getBrowserSupabase();

  // State
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProcessedInitialMessage, setHasProcessedInitialMessage] = useState(false);
  const [composerValue, setComposerValue] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [temperature, setTemperature] = useState<number>(() => {
    try { return Number(JSON.parse(localStorage.getItem(`careiq-chat-settings-${chatId}`) || '{}').temperature ?? 0.3); } catch { return 0.3; }
  });
  
  const controllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<any>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  // Load messages
  useEffect(() => {
    let mounted = true;
    
    async function loadMessages() {
      try {
        setLoading(true);
        setError(null);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          router.push('/login');
          return;
        }

        const res = await fetch(`/api/messages/${encodeURIComponent(chatId)}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          cache: "no-store",
        });
        
        if (!mounted) return;

        if (res.ok) {
          const json = await res.json();
          const messages: Msg[] = json?.messages || [];
          setMsgs(messages);
        } else if (res.status === 401) {
          router.push('/login');
          return;
        } else {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          setError(errorData.error || `Error ${res.status}`);
          setMsgs([]);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
        if (mounted) {
          setError('Failed to load messages');
          setMsgs([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    
    loadMessages();
    return () => {
      mounted = false;
    };
  }, [chatId, router, supabase]);

  // Handle initial message from URL parameter
  useEffect(() => {
    if (!loading && !hasProcessedInitialMessage && msgs.length === 0) {
      const initialMessage = searchParams.get('message');
      if (initialMessage) {
        setHasProcessedInitialMessage(true);
        void handleSend(initialMessage);
      }
    }
  }, [loading, msgs.length, hasProcessedInitialMessage, searchParams]);

  // Stop streaming
  const handleStop = () => {
    try {
      controllerRef.current?.abort();
    } catch (e) {
      console.error('Failed to abort request:', e);
    }
    setStreaming(false);
    controllerRef.current = null;
  };

  // Send message with streaming
  const handleSend = async (content: string) => {
    if (streaming || !content.trim()) return;

    try {
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/login');
        return;
      }

      // Persist edit to server when editing
      if (editingMessageId) {
        try {
          await fetch('/api/messages/edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ id: editingMessageId, content })
          });
        } catch {}
      }

      // If attachments present, upload first
      let note = "";
      if (attachedFiles.length > 0) {
        setUploading(true);
        try {
          const form = new FormData();
          for (const f of attachedFiles) form.append('files', f);
          form.append('documentType', 'Facility Policy');
          form.append('description', 'Uploaded from chat');
          const res = await fetch('/api/upload-facility-docs', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: form,
          });
          const json = await res.json().catch(() => null);
          if (res.ok && json?.summary?.successful > 0) {
            const names = attachedFiles.map(f => f.name).join(', ');
            note = `\n\n[Attached documents ingested: ${names}]`;
          }
        } catch (e) {
          console.warn('Attachment upload failed', e);
        } finally {
          setUploading(false);
          setAttachedFiles([]);
        }
      }

      // Add or update user message immediately
      const newContent = (content.trim() + note).trim();
      if (editingMessageId) {
        setMsgs(prev => prev.map(m => m.id === editingMessageId ? { ...m, content: newContent } : m));
      } else {
        const userMsg: Msg = {
          id: `user-${Date.now()}`,
          chat_id: chatId,
          role: "user",
          content: newContent,
          created_at: new Date().toISOString(),
        };
        setMsgs(prev => [...prev, userMsg]);
      }
      setComposerValue("");
      setEditingMessageId(null);

      const wasFirstTurn = msgs.length === 0;

      // Start streaming
      const controller = new AbortController();
      controllerRef.current = controller;
      setStreaming(true);

      const assistantId = `assistant-${Date.now()}`;
      let assistantContent = "";

      const response = await fetch("/api/messages/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          chatId, 
          content: content.trim(),
          temperature
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response stream available');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Add initial assistant message
      const initialAssistantMsg: Msg = {
        id: assistantId,
        chat_id: chatId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
      };
      setMsgs(prev => [...prev, initialAssistantMsg]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data:")) continue;
          
          const payload = trimmedLine.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;

          try {
            const obj = JSON.parse(payload);
            const token = obj?.content;
            if (token) {
              assistantContent += token;
              
              setMsgs(prev => prev.map(msg => 
                msg.id === assistantId 
                  ? { ...msg, content: assistantContent }
                  : msg
              ));
            }
          } catch (err) {
            console.debug('Skipping malformed SSE frame:', err);
          }
        }
      }

      // Ensure we have some content
      if (!assistantContent.trim()) {
        setMsgs(prev => prev.map(msg => 
          msg.id === assistantId 
            ? { ...msg, content: "I apologize, but I couldn't generate a response. Please try again." }
            : msg
        ));
      }

    } catch (error: any) {
      console.error("Streaming error:", error);
      
      const errorMessage = error.name === 'AbortError' 
        ? "Response cancelled." 
        : "Sorry, I encountered an error. Please check your connection and try again.";
        
      const errorMsg: Msg = {
        id: `error-${Date.now()}`,
        chat_id: chatId,
        role: "assistant",
        content: errorMessage,
        created_at: new Date().toISOString(),
      };
      
      setMsgs(prev => [...prev, errorMsg]);
    } finally {
      setStreaming(false);
      controllerRef.current = null;
    }
  };

  // Regenerate assistant response based on preceding user message
  const handleRegenerate = async (assistantIndex: number) => {
    const prevUser = [...msgs].slice(0, assistantIndex).reverse().find(m => m.role === 'user');
    if (prevUser?.content) await handleSend(prevUser.content);
  };

  // Bookmark assistant message
  const handleBookmark = async (message: Msg) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ message: message.content, chat_id: chatId }),
      });
    } catch (e) {
      console.warn('Bookmark failed', e);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen bg-white dark:bg-gray-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading messages...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen bg-white dark:bg-gray-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Header: actions */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg">
        <div className="font-semibold text-gray-900 dark:text-white text-lg">CareIQ Assistant</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Chat templates"
          >
            <FileText size={18} />
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Share chat"
          >
            <Users size={18} />
          </button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/export/pdf', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: 'CareIQ Chat Export',
                    messages: msgs.map(m => ({ role: m.role, content: m.content, createdAt: m.created_at }))
                  })
                });
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `careiq-chat-${new Date().toISOString().slice(0,10)}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (e) { console.error('Export failed', e); }
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Export PDF"
          >
            <Download size={18} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Chat settings"
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto relative bg-gray-50/30 dark:bg-gray-900">
        {msgs.length === 0 ? (
          <div className="flex items-center justify-center h-full py-12">
            <div className="text-center max-w-2xl mx-auto px-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-white font-bold text-xl">CIQ</span>
              </div>
              <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-3">How can I help you today?</h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 leading-relaxed">
                I'm your AI nursing home compliance assistant. Ask me anything about regulations, 
                staff training, survey preparation, or daily operations.
              </p>
              
              <div className="flex gap-3 justify-center mb-8">
                <button
                  onClick={() => setShowTemplates(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all hover:scale-105 shadow-lg"
                >
                  <FileText size={16} />
                  Use Template
                </button>
                <button
                  onClick={() => {
                    const composer = document.getElementById('composer-input');
                    if (composer) composer.focus();
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-all hover:scale-105"
                >
                  Start Fresh
                </button>
              </div>
              
              <div className="mt-8">
                <Suggestions onPick={setComposerValue} targetId="composer-input" />
              </div>
            </div>
          </div>
        ) : (
          <MessageList
            ref={virtuosoRef}
            messages={msgs}
            streaming={streaming}
            onRegenerate={handleRegenerate}
            onBookmark={handleBookmark}
            onEdit={(id, content) => { setEditingMessageId(id); setComposerValue(content); }}
            onAtBottomChange={setAtBottom}
          />
        )}
        {!atBottom && (
          <div className="absolute bottom-6 right-6">
            <button
              onClick={() => {
                try { virtuosoRef.current?.scrollToIndex?.({ index: Math.max(0, msgs.length - 1), align: 'end', behavior: 'smooth' }); } catch {}
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors backdrop-blur-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              Jump to bottom
            </button>
          </div>
        )}
      </div>

      {/* Attachments preview */}
      {attachedFiles.length > 0 && (
        <div className="max-w-4xl mx-auto w-full px-4 pb-2">
          <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Paperclip size={16} className="text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {attachedFiles.length} file{attachedFiles.length !== 1 ? 's' : ''} attached
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg shadow-sm">
                  <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                    <FileText size={10} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm text-gray-900 dark:text-white truncate max-w-[200px]">{f.name}</span>
                  <button 
                    className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 flex items-center justify-center text-xs font-bold transition-colors" 
                    onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Drag and drop target */}
      <div
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={(e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files || []);
          if (files.length) setAttachedFiles(prev => [...prev, ...files]);
        }}
      >
        {/* Input area */}
        <MessageInput
          onSend={handleSend}
          disabled={streaming || uploading}
          value={composerValue}
          onChangeValue={setComposerValue}
          onAttach={(files) => {
            if (!files) return;
            setAttachedFiles(prev => [...prev, ...Array.from(files)]);
          }}
        />
      </div>
      
      {/* Stop button when streaming */}
      {streaming && (
        <div className="border-t border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-gray-900 py-3">
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center justify-center">
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-all hover:scale-105 shadow-lg"
              >
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                Stop generating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates modal */}
      {showTemplates && (
        <ChatTemplates
          onSelectTemplate={(prompt) => {
            setComposerValue(prompt);
            setShowTemplates(false);
            // Focus the composer
            setTimeout(() => {
              const composer = document.getElementById('composer-input');
              if (composer) composer.focus();
            }, 100);
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Share modal */}
      {showShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Share Chat</h3>
              <button onClick={() => setShowShare(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <span className="sr-only">Close</span>
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Share with team members
                </label>
                <input
                  type="email"
                  placeholder="Enter email addresses..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="allow-edit" className="rounded" />
                <label htmlFor="allow-edit" className="text-sm text-gray-700 dark:text-gray-300">
                  Allow editing
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowShare(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowShare(false);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Share
                </button>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">Or share via link:</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/chat/${chatId}?shared=true`}
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/chat/${chatId}?shared=true`);
                  }}
                  className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Chat Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Temperature: {temperature.toFixed(2)}
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={temperature} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setTemperature(val);
                    localStorage.setItem(`careiq-chat-settings-${chatId}`, JSON.stringify({ temperature: val }));
                  }} 
                  className="w-full" 
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Focused</span>
                  <span>Creative</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Settings are stored locally per chat.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}