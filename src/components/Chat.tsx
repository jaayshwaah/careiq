// src/components/Chat.tsx - Fixed with logo and copy functionality
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabaseClient";

type Msg = {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
      <span className="ml-2 text-sm text-gray-500">CareIQ is thinking...</span>
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
      className={`p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${className}`}
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

function CareIQLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-blue-600 rounded-full text-white font-bold ${className}`}>
      <span className="text-sm">CIQ</span>
    </div>
  );
}

// Simple Composer Component (inline to avoid import issues)
function Composer({
  onSend,
  placeholder = "Message CareIQ...",
  disabled = false,
}: {
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled || sending) return;

    setSending(true);
    try {
      await onSend(trimmed);
      setValue("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Send failed:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-xl bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex items-end p-3 gap-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || sending}
          className="flex-1 resize-none border-0 bg-transparent outline-none max-h-[200px] min-h-[44px] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          rows={1}
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled || sending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? "..." : "Send"}
        </button>
      </div>
    </form>
  );
}

export default function Chat({ chatId }: { chatId: string }) {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  // State
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const controllerRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const suggestions = useMemo(
    () => [
      "What should I prep for the next survey?",
      "Create a quick policy checklist",
      "Summarize today's top compliance risks",
      "Draft a CNA training outline",
    ],
    []
  );

  // Load messages
  useEffect(() => {
    let mounted = true;
    
    async function loadMessages() {
      try {
        setLoading(true);
        setError(null);
        
        // Get auth session
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

  // Auto-scroll to bottom
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [msgs.length]);

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

  // Empty state suggestions
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="mb-6">
        <CareIQLogo className="w-16 h-16 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Welcome to CareIQ
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Ask me anything about nursing home compliance and operations
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
        {suggestions.map((text) => (
          <button
            key={text}
            onClick={() => handleSend(text)}
            disabled={streaming}
            className="p-4 text-left rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-600 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
          >
            <span className="text-sm font-medium">{text}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
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
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {msgs.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {msgs.map((m) => (
              <div key={m.id} className="flex items-start gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {m.role === "user" ? (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">You</span>
                    </div>
                  ) : (
                    <CareIQLogo className="w-8 h-8" />
                  )}
                </div>

                {/* Message content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {m.role === "user" ? "You" : "CareIQ"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(m.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 relative group">
                    <div className="whitespace-pre-wrap text-gray-900 dark:text-white">
                      {m.content}
                    </div>
                    
                    {/* Copy button for assistant messages */}
                    {m.role === "assistant" && m.content.trim() && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <CopyButton content={m.content} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Streaming indicator */}
            {streaming && (
              <div className="flex items-start gap-3">
                <CareIQLogo className="w-8 h-8" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">CareIQ</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <TypingDots />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t p-4 bg-white dark:bg-gray-900">
        <Composer
          placeholder="Ask CareIQ about compliance, regulations, or operations..."
          disabled={streaming}
          onSend={handleSend}
        />
        
        {/* Stop button when streaming */}
        {streaming && (
          <div className="flex justify-center mt-3">
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Stop generating
            </button>
          </div>
        )}
      </div>
    </div>
  );
}