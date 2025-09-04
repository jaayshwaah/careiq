// src/components/Chat.tsx - ChatGPT-style chat interface
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/chat-tables.css";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Check, Send, Pencil, Bookmark, Paperclip, Download, Settings as SettingsIcon, FileText, Users, Search, Share2, Sparkles, Brain } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import Suggestions from "@/components/Suggestions";
import MessageList from "@/components/chat/MessageList";
import ChatTemplates from "@/components/ChatTemplates";
import ChatSearch from "@/components/chat/ChatSearch";
import BookmarksPanel from "@/components/chat/BookmarksPanel";
import SharePanel from "@/components/chat/SharePanel";
import ExportPanel from "@/components/chat/ExportPanel";
import KnowledgeExtractor from "@/components/chat/KnowledgeExtractor";
import ChatWorkspaces from "@/components/chat/ChatWorkspaces";

type Msg = {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  tableHtml?: string;
  fileOffer?: {
    fileId: string;
    fileType: string;
    template: string;
    filename: string;
    data: any;
  };
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

function MessageBubble({ message, isStreaming = false, onEdit, onBookmark, onExtractKnowledge }: { 
  message: Msg; 
  isStreaming?: boolean; 
  onEdit?: (id: string, content: string) => void;
  onBookmark?: (message: Msg) => void;
  onExtractKnowledge?: (message: Msg) => void;
}) {
  const isUser = message.role === "user";
  
  return (
    <div className="group w-full py-4 lg:py-8 px-3 lg:px-4">
      <div className={`max-w-3xl mx-auto flex gap-3 lg:gap-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {/* Avatar - only show for assistant */}
        {!isUser && (
          <div className="flex-shrink-0 w-6 h-6 lg:w-8 lg:h-8">
            <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-green-600 flex items-center justify-center">
              <span className="text-white text-xs lg:text-sm font-medium">C</span>
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className={`flex-1 max-w-2xl ${isUser ? 'text-right' : 'text-left'}`}>
          {/* Message content */}
          <div className={`inline-block max-w-full ${
            isUser 
              ? 'bg-blue-600 text-white rounded-2xl rounded-br-md px-3 py-2 lg:px-4 lg:py-3' 
              : 'text-gray-900 dark:text-gray-100'
          }`}>
            {message.content ? (
              <div className={`whitespace-pre-wrap leading-relaxed ${
                isUser ? 'text-white' : 'prose prose-base max-w-none dark:prose-invert'
              }`}>
                {message.content}
              </div>
            ) : isStreaming ? (
              <TypingIndicator />
            ) : null}
          </div>

          {/* Table content */}
          {message.tableHtml && !isUser && (
            <div className="mt-4 max-w-full overflow-hidden">
              <div 
                className="table-content"
                dangerouslySetInnerHTML={{ __html: message.tableHtml }}
              />
            </div>
          )}

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
                <button
                  onClick={() => downloadGeneratedFile(message.fileOffer!)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Download size={16} />
                  Download
                </button>
              </div>
            </div>
          )}
          
          {/* Timestamp */}
          <div className={`text-xs text-gray-500 dark:text-gray-400 mt-2 ${
            isUser ? 'text-right' : 'text-left'
          }`}>
            {new Date(message.created_at).toLocaleTimeString()}
          </div>
          
          {/* Actions */}
          {!isUser && message.content && (
            <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton content={message.content} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
              <button
                onClick={() => onBookmark?.(message)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Bookmark response"
              >
                <Bookmark className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onExtractKnowledge?.(message)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Extract knowledge"
              >
                <Brain className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {isUser && (
            <div className={`flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity ${
              isUser ? 'justify-end' : 'justify-start'
            }`}>
              <button
                onClick={() => onEdit?.(message.id, message.content)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Edit and regenerate"
              >
                <Pencil className="h-3.5 w-3.5" />
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
      <div className="max-w-4xl mx-auto px-3 lg:px-4 py-3 lg:py-4">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg focus-within:shadow-xl transition-all focus-within:border-blue-500/50">
            <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => onAttach?.(e.target.files)} />
            <div className="absolute left-2 lg:left-3 bottom-2 lg:bottom-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={disabled}
                className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Attach files"
              >
                <Paperclip size={16} className="lg:w-[18px] lg:h-[18px]" />
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
              className="w-full resize-none border-0 bg-transparent pl-12 pr-12 lg:pl-14 lg:pr-14 py-3 lg:py-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-sm lg:text-base leading-6"
              style={{ minHeight: '56px', maxHeight: '200px' }}
              rows={1}
            />
            <div className="absolute right-2 lg:right-3 bottom-2 lg:bottom-3 flex items-center gap-2">
              {disabled && (
                <div className="hidden lg:flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-xs">Generating...</span>
                </div>
              )}
              <button
                type="submit"
                disabled={!currentValue.trim() || disabled}
                className={`w-8 h-8 lg:w-9 lg:h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  currentValue.trim() && !disabled
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg hover:scale-105'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send size={14} className="lg:w-4 lg:h-4" />
              </button>
            </div>
          </div>
          
          {/* Shortcut hints - hidden on mobile */}
          <div className="hidden lg:flex items-center justify-center mt-3 text-xs text-gray-500 dark:text-gray-400 space-x-4">
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
  const { user } = useAuth();

  // Helper to get current session
  const getSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('getSession result:', session ? 'found' : 'null');
      return session;
    } catch (error) {
      console.error('getSession error:', error);
      return null;
    }
  };

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
  const [showSearch, setShowSearch] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [chatTitle, setChatTitle] = useState<string>('');
  const [suggestedTemplates, setSuggestedTemplates] = useState<any[]>([]);
  const [showTemplateSuggestions, setShowTemplateSuggestions] = useState(false);
  const [showKnowledgeExtractor, setShowKnowledgeExtractor] = useState(false);
  const [extractingMessage, setExtractingMessage] = useState<Msg | null>(null);
  const [showWorkspaces, setShowWorkspaces] = useState(false);
  const [temperature, setTemperature] = useState<number>(() => {
    try { return Number(JSON.parse(localStorage.getItem(`careiq-chat-settings-${chatId}`) || '{}').temperature ?? 0.3); } catch { return 0.3; }
  });
  
  const controllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<any>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Smart template suggestions based on context
  useEffect(() => {
    if (composerValue.length < 10) {
      setSuggestedTemplates([]);
      setShowTemplateSuggestions(false);
      return;
    }

    const suggestTemplates = async () => {
      try {
        const session = await getSession();
        const keywords = composerValue.toLowerCase();
        let category = 'general';
        
        // Detect category from keywords
        if (keywords.includes('survey') || keywords.includes('f-tag') || keywords.includes('deficiency')) {
          category = 'survey';
        } else if (keywords.includes('train') || keywords.includes('education') || keywords.includes('competency')) {
          category = 'training';
        } else if (keywords.includes('policy') || keywords.includes('procedure') || keywords.includes('protocol')) {
          category = 'policy';
        } else if (keywords.includes('incident') || keywords.includes('accident') || keywords.includes('fall')) {
          category = 'incident';
        }

        const response = await fetch(`/api/templates?category=${category}&public_only=true`, {
          headers: {
            'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const relevant = data.templates?.filter((t: any) => {
            const content = (t.content + ' ' + t.title + ' ' + t.description).toLowerCase();
            return keywords.split(' ').some((word: string) => word.length > 3 && content.includes(word));
          }).slice(0, 3) || [];
          
          setSuggestedTemplates(relevant);
          setShowTemplateSuggestions(relevant.length > 0);
        }
      } catch (error) {
        console.error('Failed to suggest templates:', error);
      }
    };

    // Debounce template suggestions
    const timeoutId = setTimeout(suggestTemplates, 500);
    return () => clearTimeout(timeoutId);
  }, [composerValue]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  // Save message as template handler
  const handleSaveTemplate = async (message: Msg) => {
    try {
      const session = await getSession();
      if (!session?.access_token) return;

      const title = `Template from ${new Date(message.created_at).toLocaleDateString()}`;
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          content: message.content,
          description: 'Generated from chat response',
          category: 'general',
          tags: ['chat', 'generated'],
          is_public: false
        })
      });

      if (response.ok) {
        // Show success feedback - you could add a toast here
        console.log('Template saved successfully!');
      } else {
        console.error('Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowBookmarks(false);
        setShowShare(false);
        setShowExport(false);
        setShowSettings(false);
        setShowTemplates(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
          
          // Load chat title
          const chatRes = await fetch(`/api/chats/${encodeURIComponent(chatId)}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });
          if (chatRes.ok) {
            const chatData = await chatRes.json();
            setChatTitle(chatData.chat?.title || '');
          }
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
            
            // Handle regular content
            const token = obj?.content;
            if (token) {
              assistantContent += token;
              
              setMsgs(prev => prev.map(msg => 
                msg.id === assistantId 
                  ? { ...msg, content: assistantContent }
                  : msg
              ));
            }

            // Handle table generation
            if (obj?.type === "table" && obj?.tableHtml) {
              setMsgs(prev => prev.map(msg => 
                msg.id === assistantId 
                  ? { ...msg, tableHtml: obj.tableHtml }
                  : msg
              ));
            }

            // Handle file offers
            if (obj?.type === "file_offer") {
              const fileOffer = {
                fileId: obj.fileId,
                fileType: obj.fileType,
                template: obj.template,
                filename: obj.filename,
                data: obj.data
              };
              
              setMsgs(prev => prev.map(msg => 
                msg.id === assistantId 
                  ? { ...msg, fileOffer }
                  : msg
              ));
              
              if (obj.content) {
                assistantContent += obj.content;
                setMsgs(prev => prev.map(msg => 
                  msg.id === assistantId 
                    ? { ...msg, content: assistantContent }
                    : msg
                ));
              }
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
        body: JSON.stringify({ 
          chat_id: chatId, 
          message_id: message.id,
          title: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
          content: message.content
        }),
      });
      // Show a brief success feedback
      // TODO: Add toast notification
    } catch (e) {
      console.warn('Bookmark failed', e);
    }
  };

  // Extract knowledge from message
  const handleExtractKnowledge = (message: Msg) => {
    setExtractingMessage(message);
    setShowKnowledgeExtractor(true);
  };

  // Handle knowledge extraction completion
  const handleKnowledgeSaved = (knowledgeItem: any) => {
    // Show success feedback
    console.log('Knowledge extracted and saved:', knowledgeItem);
    // TODO: Add toast notification
  };

  // Handle chat navigation from search/bookmarks
  const handleChatNavigation = (targetChatId: string, messageId?: string) => {
    if (targetChatId === chatId) {
      // Same chat, scroll to message if specified
      if (messageId) {
        // TODO: Implement scroll to specific message
      }
    } else {
      // Navigate to different chat
      router.push(`/chat/${targetChatId}${messageId ? `#${messageId}` : ''}`);
    }
  };

  // Download generated file
  const downloadGeneratedFile = async (fileOffer: NonNullable<Msg['fileOffer']>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/generate-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({
          type: fileOffer.fileType,
          template: fileOffer.template,
          data: fileOffer.data,
          filename: fileOffer.filename,
          chatId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate file');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileOffer.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
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
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header: actions */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-gray-900">
        <div className="font-semibold text-gray-900 dark:text-white text-lg">CareIQ Assistant</div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Search chat history"
          >
            <Search size={18} />
          </button>
          
          {/* Templates */}
          <button
            onClick={() => setShowTemplates(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Chat templates"
          >
            <Sparkles size={18} />
          </button>
          
          {/* Bookmarks */}
          <button
            onClick={() => setShowBookmarks(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="View bookmarks"
          >
            <Bookmark size={18} />
          </button>
          
          {/* Workspaces */}
          <button
            onClick={() => setShowWorkspaces(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Chat workspaces"
          >
            <Users size={18} />
          </button>
          
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
          
          {/* Share */}
          <button
            onClick={() => setShowShare(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Share chat"
          >
            <Share2 size={18} />
          </button>
          
          {/* Export */}
          <button
            onClick={() => setShowExport(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Export chat"
          >
            <Download size={18} />
          </button>
          
          {/* Settings */}
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
      <div className="flex-1 min-h-0 relative bg-gray-50/30 dark:bg-gray-900 scrollable">
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
            onSaveTemplate={handleSaveTemplate}
            onExtractKnowledge={handleExtractKnowledge}
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
        {/* Smart Template Suggestions */}
        {showTemplateSuggestions && suggestedTemplates.length > 0 && (
          <div className="border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Suggested Templates
                </span>
                <button
                  onClick={() => setShowTemplateSuggestions(false)}
                  className="ml-auto text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setComposerValue(template.content);
                      setShowTemplateSuggestions(false);
                      composerRef.current?.focus();
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-sm"
                  >
                    <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-900 dark:text-gray-100 truncate max-w-48">
                      {template.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

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

      {/* Search Modal */}
      <ChatSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelectChat={handleChatNavigation}
      />

      {/* Bookmarks Panel */}
      <BookmarksPanel
        isOpen={showBookmarks}
        onClose={() => setShowBookmarks(false)}
        onSelectChat={handleChatNavigation}
        currentChatId={chatId}
      />

      {/* Chat Workspaces */}
      <ChatWorkspaces
        isOpen={showWorkspaces}
        onClose={() => setShowWorkspaces(false)}
        onSelectChat={handleChatNavigation}
        currentUserId={user?.id}
      />

      {/* Share Panel */}
      <SharePanel
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        chatId={chatId}
      />

      {/* Export Panel */}
      <ExportPanel
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        chatId={chatId}
        chatTitle={chatTitle}
      />

      {/* Knowledge Extractor */}
      {showKnowledgeExtractor && extractingMessage && (
        <KnowledgeExtractor
          messageId={extractingMessage.id}
          messageContent={extractingMessage.content}
          chatId={chatId}
          onClose={() => {
            setShowKnowledgeExtractor(false);
            setExtractingMessage(null);
          }}
          onSaved={handleKnowledgeSaved}
        />
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