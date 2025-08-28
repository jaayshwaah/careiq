// src/components/Chat.tsx - ChatGPT-style chat interface
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Check, Menu, Plus, Send, Pencil, Trash2, RotateCw, Bookmark, Paperclip, Download, Settings as SettingsIcon, Share2, Star, FolderPlus, FileText, Users } from "lucide-react";
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
    <div className="flex items-center gap-1 py-2">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
      </div>
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
      className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
      title="Copy response"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4 text-gray-500" />
      )}
    </button>
  );
}

function MessageBubble({ message, isStreaming = false, onEdit }: { message: Msg; isStreaming?: boolean; onEdit?: (id: string, content: string) => void }) {
  const isUser = message.role === "user";
  
  return (
    <div className={`group w-full ${isUser ? '' : 'bg-gray-50 dark:bg-gray-800'}`}>
      <div className="max-w-3xl mx-auto px-4 py-4 flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser 
              ? 'bg-blue-600 text-white' 
              : 'bg-green-600 text-white'
          }`}>
            <span className="text-sm font-medium">
              {isUser ? 'U' : 'C'}
            </span>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {isUser ? 'You' : 'CareIQ'}
            </span>
          </div>
          
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {message.content ? <span className="block" /> : isStreaming ? <TypingIndicator /> : null}
          </div>
          
          {/* Actions */}
          {!isUser && message.content && (
            <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton content={message.content} />
            </div>
          )}
          {isUser && (
            <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit?.(message.id, message.content)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
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
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => onAttach?.(e.target.files)} />
            <div className="absolute left-2 top-1/2 -translate-y-1/2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-8 h-8 rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 flex items-center justify-center"
                title="Attach files"
              >
                <Paperclip size={16} />
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
              className="w-full resize-none border-0 bg-transparent pl-10 pr-12 py-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none"
              style={{ minHeight: '56px', maxHeight: '200px' }}
              rows={1}
            />
            <button
              type="submit"
              disabled={!currentValue.trim() || disabled}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center justify-center transition-colors"
            >
              <Send size={14} className={currentValue.trim() && !disabled ? 'text-gray-900 dark:text-white' : 'text-gray-500'} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type ChatRow = { id: string; title: string; created_at?: string; updated_at?: string };

export default function Chat({ chatId }: { chatId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getBrowserSupabase();

  // State
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProcessedInitialMessage, setHasProcessedInitialMessage] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [composerValue, setComposerValue] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [chatSearch, setChatSearch] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [pinned, setPinned] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('careiq-pins') || '[]')); } catch { return new Set(); }
  });
  const [folders, setFolders] = useState<Record<string,string>>(() => {
    try { return JSON.parse(localStorage.getItem('careiq-folders') || '{}'); } catch { return {}; }
  });
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

  // Load user profile (for role-aware suggestions later)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          setUserProfile(data.profile || null);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // Global keyboard shortcut: Ctrl/Cmd+K focuses sidebar search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        (document.getElementById('sidebar-search-input') as HTMLInputElement | null)?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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

  // Load chat list for sidebar
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch('/api/chats', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          cache: 'no-store'
        });
        if (!mounted) return;
        if (res.ok) {
          const json = await res.json();
          setChats(json?.chats || []);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [chatId, supabase]);

  // Handle initial message from URL parameter
  useEffect(() => {
    if (!loading && !hasProcessedInitialMessage && msgs.length === 0) {
      const initialMessage = searchParams.get('message');
      if (initialMessage) {
        setHasProcessedInitialMessage(true);
        // Auto-send the initial message passed from the home page
        // so the user lands directly into a streaming response.
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

      // Auto-title after first exchange completes
      if (wasFirstTurn) {
        const userWordCount = content.trim().split(/\s+/).filter(Boolean).length;
        if (userWordCount > 3 && assistantContent.trim()) {
          setTimeout(() => {
            fetch('/api/title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chatId, userText: content.trim(), assistantText: assistantContent.trim() })
            })
              .then(r => r.json().catch(() => ({})))
              .then((j) => {
                if (j?.title) {
                  setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: j.title } : c));
                }
              })
              .catch(() => {});
          }, 1500);
        }
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

  const createNewChat = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({ title: 'New chat' }),
      });

      if (response.ok) {
        const { chat } = await response.json();
        if (chat?.id) {
          router.push(`/chat/${chat.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
      const chatId = crypto.randomUUID();
      router.push(`/chat/${chatId}`);
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

  // Rename and delete chats (quick inline actions)
  const renameChat = async (id: string) => {
    const title = prompt('Rename chat');
    if (!title) return;
    await fetch(`/api/chats/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
    setChats(prev => prev.map(c => c.id === id ? { ...c, title } : c));
  };

  const togglePin = (id: string) => {
    setPinned(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('careiq-pins', JSON.stringify(Array.from(next)));
      return next;
    });
  };
  const assignFolder = (id: string) => {
    const name = prompt('Assign to folder (create or type existing name)');
    if (name === null) return;
    setFolders(prev => {
      const next = { ...prev, [id]: name.trim() };
      localStorage.setItem('careiq-folders', JSON.stringify(next));
      return next;
    });
  };
  const deleteChat = async (id: string) => {
    if (!confirm('Delete this chat?')) return;
    await fetch(`/api/chats/${encodeURIComponent(id)}`, { method: 'DELETE' });
    setChats(prev => prev.filter(c => c.id !== id));
    if (id === chatId && chats[0]) {
      router.push(`/chat/${chats[0].id}`);
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
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative h-full w-64 bg-white text-gray-900 dark:bg-gray-900 dark:text-white transform transition-transform z-50 border-r border-gray-200 dark:border-gray-700
        ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4">
          <button
            onClick={createNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 transition-colors"
          >
            <Plus size={16} />
            <span>New chat</span>
          </button>
          <div className="mt-3 relative">
            <input
              type="text"
              placeholder="Search chats..."
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md py-2 pl-3 pr-3 text-sm placeholder-gray-500 dark:bg-gray-800/60 dark:border-gray-700 dark:placeholder-gray-400"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Pinned</div>
          <div className="space-y-1 mb-4">
            {chats.filter(c => pinned.has(c.id) && (!chatSearch || (c.title||'').toLowerCase().includes(chatSearch.toLowerCase()))).length === 0 ? (
              <div className="text-xs text-gray-500 dark:text-gray-400">No pinned chats</div>
            ) : (
              chats.filter(c => pinned.has(c.id) && (!chatSearch || (c.title||'').toLowerCase().includes(chatSearch.toLowerCase()))).map(c => (
                <div key={c.id} className={`group flex items-center justify-between gap-2 rounded-md px-2 py-2 cursor-pointer ${c.id === chatId ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800/60'}`}
                     onClick={() => router.push(`/chat/${c.id}`)}>
                  <div className="truncate text-sm text-gray-900 dark:text-white">{c.title || 'Untitled chat'}</div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={(e) => { e.stopPropagation(); togglePin(c.id); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Unpin"><Star size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); renameChat(c.id); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><Pencil size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">All</div>
          <div className="space-y-1">
            {chats.filter(c => !pinned.has(c.id) && (!chatSearch || (c.title||'').toLowerCase().includes(chatSearch.toLowerCase()))).length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No conversations yet</div>
            ) : (
              chats.filter(c => !pinned.has(c.id) && (!chatSearch || (c.title||'').toLowerCase().includes(chatSearch.toLowerCase()))).map((c) => (
                <div key={c.id} className={`group flex items-center justify-between gap-2 rounded-md px-2 py-2 cursor-pointer ${c.id === chatId ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800/60'}`}
                     onClick={() => router.push(`/chat/${c.id}`)}>
                  <div className="truncate text-sm text-gray-900 dark:text-white">{c.title || 'Untitled chat'}</div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={(e) => { e.stopPropagation(); togglePin(c.id); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Pin"><Star size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); assignFolder(c.id); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Assign folder"><FolderPlus size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); renameChat(c.id); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><Pencil size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Signed in as User
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header: search + export (sticky) */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
          <button onClick={() => setShowSidebar(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
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
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            title="Export PDF"
          >
            <Download size={18} />
          </button>
          <button
            onClick={async () => {
              try {
                const data = { messages: msgs };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `careiq-chat-${new Date().toISOString().slice(0,10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (e) {}
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            title="Export JSON"
          >
            <Share2 size={18} />
          </button>
          <button
            onClick={() => setShowTemplates(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            title="Chat templates"
          >
            <FileText size={18} />
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            title="Share chat"
          >
            <Users size={18} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            title="Chat settings"
          >
            <SettingsIcon size={18} />
          </button>
        </div>

        {/* Messages area (virtualized) */}
        <div className="flex-1 overflow-y-auto relative">
          {msgs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md mx-auto p-6">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">How can I help you today?</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Ask me anything about nursing home compliance and operations</p>
                
                <div className="flex gap-3 justify-center mb-6">
                  <button
                    onClick={() => setShowTemplates(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <FileText size={16} />
                    Use Template
                  </button>
                  <button
                    onClick={() => {
                      const composer = document.getElementById('composer-input');
                      if (composer) composer.focus();
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus size={16} />
                    Start Fresh
                  </button>
                </div>
                
                <div className="mt-6"><Suggestions onPick={setComposerValue} targetId="composer-input" /></div>
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
            <div className="absolute bottom-4 right-4">
              <button
                onClick={() => {
                  try { virtuosoRef.current?.scrollToIndex?.({ index: Math.max(0, msgs.length - 1), align: 'end', behavior: 'smooth' }); } catch {}
                }}
                className="px-3 py-2 text-xs rounded-full bg-blue-600 text-white shadow hover:bg-blue-700"
              >
                Jump to bottom
              </button>
            </div>
          )}
        </div>

        {/* Attachments preview */}
        {attachedFiles.length > 0 && (
          <div className="max-w-3xl mx-auto w-full px-4 mt-2">
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-full">
                  <Paperclip size={14} />
                  <span className="text-xs truncate max-w-[220px]">{f.name}</span>
                  <button className="text-blue-700 hover:text-blue-900" onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                </div>
              ))}
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
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-2">
            <div className="max-w-3xl mx-auto px-4">
              <button
                onClick={handleStop}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Stop generating
              </button>
            </div>
          </div>
        )}
      </div>

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
                    // TODO: Implement sharing logic
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
                    // TODO: Show toast notification
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
