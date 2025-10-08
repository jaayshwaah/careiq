// src/components/Chat.tsx - Modern AI chat interface like ChatGPT/Claude/Grok
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Sparkles, RefreshCw, StopCircle, MoreVertical, Share2, Download, Paperclip, X, FileText, Loader2, ChevronDown } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";

type Msg = {
  id: string;
  chat_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
      title={copied ? "Copied!" : "Copy"}
    >
      {copied ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      )}
    </button>
  );
}

function MessageBubble({ message, isStreaming }: { message: Msg; isStreaming?: boolean }) {
  const isUser = message.role === "user";
  
  // ChatGPT-style: User messages as bubbles on the right
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="px-4 py-3 w-full group sm:px-6"
      >
        <div className="flex justify-end mx-auto max-w-3xl">
          <div className="max-w-[75%]">
            <div className="px-5 py-3 bg-gray-100 rounded-3xl shadow-sm dark:bg-gray-700">
              <div className="text-[15px] leading-7 text-gray-900 dark:text-gray-100 break-words whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ChatGPT-style: AI messages inline with avatar on left
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full border-b group bg-gray-50/50 dark:bg-gray-800/50 border-gray-100/50 dark:border-gray-800/50"
    >
      <div className="px-4 py-6 mx-auto max-w-3xl sm:px-6 sm:py-8">
        <div className="flex gap-4 sm:gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="flex justify-center items-center w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full shadow-sm sm:w-9 sm:h-9">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
        
          {/* Content */}
          <div className="flex-1 space-y-2 min-w-0">
            {/* Role label */}
            <div className="flex gap-2 items-center">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                CareIQ
              </span>
              {isStreaming && (
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                </div>
              )}
            </div>

            {/* Message content with typing cursor */}
            <div className="max-w-none prose prose-gray dark:prose-invert prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-p:text-[15px] prose-p:leading-7">
              {message.content ? (
                <div className="relative">
                  <span className="whitespace-pre-wrap">{message.content}</span>
                  {isStreaming && (
                    <span className="typing-cursor inline-block w-[2px] h-5 ml-1 bg-emerald-500 align-middle" />
                  )}
                </div>
              ) : (
                isStreaming && (
                  <div className="flex gap-2 items-center text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                )
              )}
            </div>
          
            {/* Actions */}
            {message.content && (
              <div className="flex gap-1 items-center pt-2 opacity-0 transition-opacity group-hover:opacity-100">
                <CopyButton content={message.content} />
                <button
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                  title="Regenerate"
                >
                  <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
                <button
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                  title="Share"
                >
                  <Share2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
                <button
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                  title="More"
                >
                  <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function WelcomeScreen({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getBrowserSupabase();

  useEffect(() => {
    // Load fresh suggestions every time the component mounts
    loadSuggestions();
  }, []); // Empty dependency array ensures it runs on every mount

  const loadSuggestions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Add cache-busting query parameter to ensure fresh data
      const timestamp = Date.now();
      const response = await fetch(`/api/chat-suggestions?t=${timestamp}`, {
        headers: {
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        cache: 'no-store', // Disable caching to always get fresh suggestions
      });

      if (response.ok) {
        const { suggestions: loadedSuggestions } = await response.json();
        setSuggestions(loadedSuggestions || []);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      // Use fallback suggestions
      setSuggestions([
        { id: 'f1', icon: "📋", title: "Survey Prep", text: "Help me prepare for an upcoming CMS survey" },
        { id: 'f2', icon: "👥", title: "Staffing", text: "Calculate PPD hours for our facility" },
        { id: 'f3', icon: "🏥", title: "Compliance", text: "Explain F-Tag 689 requirements" },
        { id: 'f4', icon: "📊", title: "Quality", text: "Improve our quality indicator scores" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion: any) => {
    // Track click
    if (suggestion.id && !suggestion.id.startsWith('f')) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch('/api/chat-suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
          },
          body: JSON.stringify({ suggestion_id: suggestion.id }),
        });
      } catch (error) {
        console.warn('Failed to track suggestion click:', error);
      }
    }
    onSuggestionClick(suggestion.text);
  };

  if (loading) {
    return (
      <div className="flex flex-1 justify-center items-center p-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading suggestions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 justify-center items-center p-6">
      <div className="space-y-8 w-full max-w-3xl">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 text-center"
        >
          <div className="inline-flex justify-center items-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white">
            How can I help you today?
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Ask me anything about nursing home compliance, operations, or resident care
          </p>
        </motion.div>

        {/* Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {suggestions.map((suggestion, i) => (
            <motion.button
              key={suggestion.id || i}
              onClick={() => handleSuggestionClick(suggestion)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 text-left bg-white rounded-2xl border border-gray-200 transition-all dark:border-gray-700 dark:bg-gray-800 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-md group"
            >
              <div className="flex gap-3 items-start">
                <span className="text-2xl">{suggestion.icon}</span>
                <div className="flex-1">
                  <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">
                    {suggestion.title}
                  </h3>
                  <p className="text-sm text-gray-600 transition-colors dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-300">
                    {suggestion.text}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function ComposerArea({
  value,
  onChange,
  onSend,
  onStop,
  disabled,
  streaming,
  attachedFiles,
  onFilesSelect,
  onFileRemove
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  disabled?: boolean;
  streaming?: boolean;
  attachedFiles: File[];
  onFilesSelect: (files: FileList) => void;
  onFileRemove: (index: number) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSend();
    }
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 dark:border-gray-700 dark:bg-gray-800">
      <div className="px-4 py-4 mx-auto max-w-3xl sm:px-6">
        {/* Attached files */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachedFiles.map((file, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-blue-900 dark:text-blue-200 max-w-[200px] truncate">
                  {file.name}
                </span>
              <button
                  onClick={() => onFileRemove(i)}
                  className="hover:bg-blue-100 dark:hover:bg-blue-800 rounded p-0.5"
                >
                  <X className="w-3 h-3 text-blue-600" />
              </button>
            </div>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex relative gap-2 items-end">
          {/* File attach button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt,.md,.csv,.xlsx,.xls"
            onChange={(e) => e.target.files && onFilesSelect(e.target.files)}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex-shrink-0 p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Textarea */}
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message CareIQ..."
              disabled={disabled}
              rows={1}
              className="w-full resize-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-2xl px-4 py-3 pr-12 text-[15px] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed max-h-[200px]"
            />
                </div>

          {/* Send/Stop button */}
          {streaming ? (
              <button
              onClick={onStop}
              className="flex-shrink-0 p-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
              title="Stop generating"
            >
              <StopCircle className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!value.trim() || disabled}
              className="flex-shrink-0 p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-all shadow-sm hover:shadow disabled:shadow-none"
              title="Send message"
            >
              <svg
                className={`w-5 h-5 ${value.trim() && !disabled ? 'text-white' : 'text-gray-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          )}
          </div>
          
        {/* Helper text */}
        <div className="mt-3 space-y-1">
          <div className="text-xs text-center text-gray-400 dark:text-gray-500">
            <span className="inline-block mr-3">⌘/Ctrl+K to search</span>
            <span className="inline-block mr-3">⌘/Ctrl+Enter to send</span>
            <span className="inline-block">Shift+Enter for newline</span>
          </div>
          <div className="text-xs text-center text-gray-500 dark:text-gray-400">
            CareIQ AI can make mistakes. Check important information and verify compliance requirements.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ModernChat({ chatId }: { chatId: string }) {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [composerValue, setComposerValue] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [shouldAutoSend, setShouldAutoSend] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  // Check for initial message from URL and prepare to auto-send (ChatGPT-style)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const initialMessage = searchParams.get('message');
    if (initialMessage && !loading && msgs.length === 0) {
      // Clean URL first
      window.history.replaceState({}, '', window.location.pathname);
      // Set message and mark for auto-send
      setComposerValue(initialMessage);
      setShouldAutoSend(true);
    }
  }, [loading, msgs.length]);

  // Load messages
  useEffect(() => {
    if (!chatId) return;
    loadMessages();
  }, [chatId]);

  // Auto-send message when flag is set (ChatGPT-style flow)
  useEffect(() => {
    if (shouldAutoSend && composerValue && !streaming && !loading) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        handleSend();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoSend, composerValue, streaming, loading]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);
    
    async function loadMessages() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
          return;
        }

      const res = await fetch(`/api/messages/${chatId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
          const json = await res.json();
      
      if (json.ok) {
        setMsgs(json.messages || []);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
      } finally {
          setLoading(false);
    }
  }

  async function handleSend() {
    if (!composerValue.trim() || streaming) {
      console.log('Cannot send:', { hasContent: !!composerValue.trim(), streaming });
        return;
      }

    console.log('Sending message:', composerValue.trim());
    const userContent = composerValue.trim();
    const contentToSend = userContent;
    setComposerValue("");
    setShouldAutoSend(false); // Clear auto-send flag

    // Parse files if attached
    let fileContext = "";
      if (attachedFiles.length > 0) {
      try {
        for (const file of attachedFiles) {
          const formData = new FormData();
          formData.append("file", file);
          const parseRes = await fetch("/api/parse-file", {
            method: "POST",
            body: formData,
          });
          const parseResult = await parseRes.json();
          if (parseResult.ok) {
            fileContext += `\n\n[File: ${file.name}]\n${parseResult.content}`;
          }
        }
      } catch (error) {
        console.warn("File parsing failed:", error);
      }
          setAttachedFiles([]);
    }

    // Add user message
        const userMsg: Msg = {
          id: `user-${Date.now()}`,
          chat_id: chatId,
          role: "user",
      content: userContent,
          created_at: new Date().toISOString(),
        };
    setMsgs((prev) => [...prev, userMsg]);

      // Start streaming
      const assistantId = `assistant-${Date.now()}`;
      let assistantContent = "";

    const assistantMsg: Msg = {
      id: assistantId,
      chat_id: chatId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };
    setMsgs((prev) => [...prev, assistantMsg]);

    try {
      setStreaming(true);
      const controller = new AbortController();
      controllerRef.current = controller;

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/messages/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ 
          chatId, 
          content: contentToSend + fileContext,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) throw new Error("Stream failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || "";
              if (content) {
                assistantContent += content;
                setMsgs((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: assistantContent } : m
                  )
                );
              }
            } catch {}
          }
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Stream error:", error);
      }
    } finally {
      setStreaming(false);
      controllerRef.current = null;
    }
  }

  function handleStop() {
    controllerRef.current?.abort();
    setStreaming(false);
    controllerRef.current = null;
  }

  const handleSuggestionClick = (text: string) => {
    setComposerValue(text);
    setTimeout(() => handleSend(), 100);
  };

  if (loading) {
    return (
        <div className="flex flex-1 justify-center items-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

    return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* Messages area */}
      <div ref={containerRef} className="overflow-y-auto flex-1">
        {msgs.length === 0 ? (
          <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
        ) : (
          <div>
            {msgs.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={streaming && msg.id === msgs[msgs.length - 1]?.id}
              />
            ))}
            <div ref={messagesEndRef} />
        </div>
      )}
              </div>

      {/* Composer */}
      <ComposerArea
          value={composerValue}
        onChange={setComposerValue}
        onSend={handleSend}
        onStop={handleStop}
        disabled={loading}
        streaming={streaming}
        attachedFiles={attachedFiles}
        onFilesSelect={(files) => setAttachedFiles((prev) => [...prev, ...Array.from(files)])}
        onFileRemove={(i) => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))}
      />
    </div>
  );
}

