// src/components/Chat.tsx - Updated with streaming support
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Composer from "@/components/Composer";
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
    <span className="inline-flex items-center gap-1 align-middle">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70 animate-bounce [animation-delay:-0.2s]" />
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70 animate-bounce [animation-delay:-0.1s]" />
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70 animate-bounce" />
    </span>
  );
}

export default function Chat({ chatId }: { chatId: string }) {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  // Messages
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);

  // Streaming
  const [streaming, setStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
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
        // Get auth token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          router.push('/login');
          return;
        }

        const res = await fetch(`/api/messages/${encodeURIComponent(chatId)}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          cache: "no-store",
        });
        
        if (res.ok) {
          const json = await res.json();
          const messages: Msg[] = json?.messages || [];
          if (mounted) {
            setMsgs(messages);
            setLoading(false);
            scrollToBottom("auto");
          }
        } else if (res.status === 401) {
          router.push('/login');
        } else {
          if (mounted) {
            setMsgs([]);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
        if (mounted) {
          setMsgs([]);
          setLoading(false);
        }
      }
    }
    loadMessages();
    return () => {
      mounted = false;
    };
  }, [chatId, router, supabase]);

  // Keep viewport at bottom
  useEffect(() => {
    scrollToBottom("smooth");
  }, [msgs.length]);

  function scrollToBottom(behavior: ScrollBehavior) {
    const el = listRef.current;
    if (!el) return;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior });
    } catch {}
  }

  // Stop streaming
  const handleStop = () => {
    try {
      controllerRef.current?.abort();
    } catch {}
    setStreaming(false);
    setStreamingId(null);
    controllerRef.current = null;
  };

  // Send message with streaming
  const handleSend = async (content: string, files?: File[]) => {
    if (streaming || !content.trim()) return;

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/login');
        return;
      }

      // Add optimistic user message
      const userMsg: Msg = {
        id: crypto.randomUUID(),
        chat_id: chatId,
        role: "user",
        content: content.trim(),
        created_at: new Date().toISOString(),
      };
      setMsgs((prev) => [...prev, userMsg]);

      // Auto-generate title if this is likely the first message
      if (msgs.length === 0) {
        try {
          await fetch(`/api/chats/${encodeURIComponent(chatId)}/title`, {
            method: "POST",
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
          });
        } catch (titleError) {
          console.warn('Failed to generate title:', titleError);
        }
      }

      // Begin streaming assistant response
      const controller = new AbortController();
      controllerRef.current = controller;
      setStreaming(true);

      const assistantId = crypto.randomUUID();
      setStreamingId(assistantId);

      const response = await fetch("/api/messages/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          chatId, 
          content: content.trim(),
          // TODO: Handle files when file processing is implemented
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";
      let hasStartedAssistantMessage = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process SSE events
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
              
              setMsgs((prev) => {
                const clone = [...prev];
                const lastMsg = clone[clone.length - 1];
                
                if (lastMsg && lastMsg.id === assistantId) {
                  // Update existing assistant message
                  lastMsg.content += token;
                } else {
                  // Create new assistant message
                  clone.push({
                    id: assistantId,
                    chat_id: chatId,
                    role: "assistant",
                    content: token,
                    created_at: new Date().toISOString(),
                  });
                }
                return clone;
              });
              
              hasStartedAssistantMessage = true;
            }
          } catch (error) {
            // ignore partial/malformed JSON frames
            console.debug('Skipping malformed SSE frame:', error);
          }
        }
      }

      // Ensure we have at least an empty assistant message if streaming failed
      if (!hasStartedAssistantMessage) {
        setMsgs((prev) => [
          ...prev,
          {
            id: assistantId,
            chat_id: chatId,
            role: "assistant",
            content: "I apologize, but I couldn't generate a response. Please try again.",
            created_at: new Date().toISOString(),
          },
        ]);
      }

    } catch (error: any) {
      console.error("Streaming error:", error);
      
      // Add error message to chat
      setMsgs((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          chat_id: chatId,
          role: "assistant",
          content: error.name === 'AbortError' 
            ? "Message cancelled." 
            : "Sorry, I encountered an error. Please check your connection and try again.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setStreaming(false);
      setStreamingId(null);
      controllerRef.current = null;
    }
  };

  // Suggested prompts for empty state
  const EmptyState = () => {
    return (
      <div className="relative mb-4 rounded-[28px] bg-white/50 p-3 shadow-soft ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10">
        <div
          className="pointer-events-none absolute inset-x-8 -top-3 bottom-0 -z-10 rounded-[28px] blur-2xl opacity-60"
          style={{
            background:
              "linear-gradient(120deg, rgba(139,176,255,.8), rgba(255,214,165,.7), rgba(193,255,215,.8))",
          }}
          aria-hidden
        />
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {suggestions.map((text) => (
            <button
              key={text}
              onClick={() => handleSend(text)}
              className="rounded-2xl bg-white/60 px-3 py-2 text-sm font-medium shadow-soft hover:bg-white/80 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 transition-colors"
              disabled={streaming}
            >
              {text}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div
        ref={listRef}
        className="flex-1 overflow-auto rounded-2xl bg-white/60 p-3 shadow-soft ring-1 ring-black/10 dark:bg-white/5 dark:ring-white/10"
      >
        {loading ? (
          <div className="p-6 text-center text-sm text-black/50 dark:text-white/60">
            Loading messages…
          </div>
        ) : msgs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {msgs.map((m) => (
              <div
                key={m.id}
                className={[
                  "rounded-2xl px-3 py-2 ring-1 relative group",
                  m.role === "user"
                    ? "bg-white text-black ring-black/10 dark:bg-white/90 dark:text-black ml-auto max-w-[80%]"
                    : "bg-black text-white ring-black/0 dark:bg-black mr-auto max-w-[85%]",
                ].join(" ")}
              >
                <div className="text-xs opacity-60 mb-1">
                  {new Date(m.created_at).toLocaleTimeString()}
                </div>
                <div className="whitespace-pre-wrap leading-relaxed">
                  {m.content}
                </div>
              </div>
            ))}
            
            {/* Streaming indicator */}
            {streaming && (
              <div className="rounded-2xl bg-black px-3 py-2 text-white mr-auto max-w-[85%]">
                <div className="flex items-center gap-2">
                  <TypingDots />
                  <span className="text-xs opacity-60">CareIQ is thinking...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="mt-3">
        <Composer
          placeholder="Ask CareIQ about compliance, regulations, or operations..."
          disabled={streaming}
          onSend={handleSend}
          showAttach={true}
          showVoice={false} // Will enable when speech recognition is added
          autoFocus={true}
        />
        
        {/* Stop button when streaming */}
        {streaming && (
          <div className="flex justify-center mt-2">
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