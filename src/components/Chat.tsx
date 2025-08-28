// src/components/Chat.tsx - ChatGPT-style chat interface
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Check, Menu, Plus, Send, Pencil, Trash2, RotateCw, Bookmark } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabaseClient";

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

function MessageBubble({ message, isStreaming = false }: { message: Msg; isStreaming?: boolean }) {
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
            {message.content ? (
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
            ) : isStreaming ? (
              <TypingIndicator />
            ) : null}
          </div>
          
          {/* Actions */}
          {!isUser && message.content && (
            <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton content={message.content} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageInput({ 
  onSend, 
  disabled = false 
}: { 
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
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
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message CareIQ..."
              disabled={disabled}
              className="w-full resize-none border-0 bg-transparent px-4 py-4 pr-12 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none"
              style={{ minHeight: '56px', maxHeight: '200px' }}
              rows={1}
            />
            <button
              type="submit"
              disabled={!value.trim() || disabled}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center justify-center transition-colors"
            >
              <Send size={14} className={value.trim() && !disabled ? 'text-gray-900 dark:text-white' : 'text-gray-500'} />
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
  
  const controllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        handleSend(initialMessage);
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

      // Add user message immediately
      const userMsg: Msg = {
        id: `user-${Date.now()}`,
        chat_id: chatId,
        role: "user",
        content: content.trim(),
        created_at: new Date().toISOString(),
      };
      setMsgs(prev => [...prev, userMsg]);

      // Generate title if this is the first message
      if (msgs.length === 0) {
        try {
          fetch(`/api/chats/${encodeURIComponent(chatId)}/title`, {
            method: "POST",
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
          }).catch(err => console.warn('Title generation failed:', err));
        } catch (e) {
          console.warn('Title generation failed:', e);
        }
      }

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
          content: content.trim()
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
        fixed md:relative h-full w-64 bg-gray-900 text-white transform transition-transform z-50
        ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4">
          <button
            onClick={createNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 border border-gray-600 rounded-md hover:bg-gray-800 transition-colors"
          >
            <Plus size={16} />
            <span>New chat</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Recent</div>
          <div className="space-y-1">
            {chats.length === 0 ? (
              <div className="text-sm text-gray-500 py-8 text-center">No conversations yet</div>
            ) : (
              chats.map((c) => (
                <div key={c.id} className={`group flex items-center justify-between gap-2 rounded-md px-2 py-2 cursor-pointer ${c.id === chatId ? 'bg-gray-800' : 'hover:bg-gray-800/60'}`}
                     onClick={() => router.push(`/chat/${c.id}`)}>
                  <div className="truncate text-sm">{c.title || 'Untitled chat'}</div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={(e) => { e.stopPropagation(); renameChat(c.id); }} className="p-1 hover:bg-gray-700 rounded"><Pencil size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); deleteChat(c.id); }} className="p-1 hover:bg-gray-700 rounded"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            Signed in as User
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowSidebar(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          >
            <Menu size={20} />
          </button>
          <h1 className="font-semibold">CareIQ</h1>
          <div className="w-8" />
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {msgs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md mx-auto p-6">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-lg">C</span>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  How can I help you today?
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Ask me anything about nursing home compliance and operations
                </p>
              </div>
            </div>
          ) : (
            <>
              {msgs.map((message, idx) => (
                <div key={message.id}>
                  <MessageBubble message={message} />
                  {message.role === 'assistant' && message.content && (
                    <div className="max-w-3xl mx-auto px-4 -mt-2 mb-4 flex gap-2">
                      <button onClick={() => handleRegenerate(idx)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1"><RotateCw size={12}/> Regenerate</button>
                      <button onClick={() => handleBookmark(message)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1"><Bookmark size={12}/> Bookmark</button>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Streaming indicator */}
              {streaming && (
                <MessageBubble 
                  message={{
                    id: 'streaming',
                    chat_id: chatId,
                    role: 'assistant',
                    content: '',
                    created_at: new Date().toISOString()
                  }}
                  isStreaming={true}
                />
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <MessageInput onSend={handleSend} disabled={streaming} />
        
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
    </div>
  );
}
