/* 
   FILE: src/app/page.tsx
   Enhanced main page with complete chat functionality
*/

"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import MessageList, { type ChatMessage, type ChatRole } from "@/components/MessageList";
import EnhancedComposer from "@/components/Composer";
import { useAuth } from "@/components/AuthProvider";

type Attachment = { 
  name: string; 
  type: string; 
  size: number; 
  text?: string;
  preview?: string;
};

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

// Convert messages to API format
function toAPIMessages(messages: ChatMessage[]) {
  return messages.map(({ role, content }) => ({ role, content }));
}

// Enhanced suggestion prompts for CareIQ
const SUGGESTION_PROMPTS = [
  {
    icon: "💊",
    title: "Medication Management",
    prompt: "What are the current CMS medication administration requirements and common compliance issues?",
    category: "compliance"
  },
  {
    icon: "📋",
    title: "Survey Preparation", 
    prompt: "Help me prepare for an upcoming state survey - what are the key areas inspectors focus on?",
    category: "survey"
  },
  {
    icon: "🦠",
    title: "Infection Control",
    prompt: "What infection control protocols should I review for our nursing home this month?",
    category: "clinical"
  },
  {
    icon: "👩‍⚕️",
    title: "Staff Training",
    prompt: "Create a comprehensive training checklist for new CNAs including all required competencies",
    category: "training"
  },
  {
    icon: "📊",
    title: "Quality Assurance",
    prompt: "What QAPI indicators should I be tracking monthly and how do I analyze trends?",
    category: "quality"
  },
  {
    icon: "🏥",
    title: "Admissions Process",
    prompt: "Walk me through the complete nursing home admission process and required assessments",
    category: "operations"
  },
];

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  
  const lastUserMessage = useMemo(() => 
    messages.filter((m) => m.role === "user").at(-1), 
    [messages]
  );

  // Handle sending messages
  const handleSend = useCallback(async (text: string, files: File[] = []) => {
    if (!text.trim() || isGenerating) return;

    // Process attachments
    const attachments: Attachment[] = await Promise.all(
      files.map(async (file) => {
        const attachment: Attachment = {
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
        };

        // Extract text for text files
        if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
          try {
            attachment.text = await file.text();
          } catch (error) {
            console.warn("Failed to extract text from file:", error);
          }
        }

        // Create preview for images
        if (file.type.startsWith('image/')) {
          try {
            attachment.preview = URL.createObjectURL(file);
          } catch (error) {
            console.warn("Failed to create image preview:", error);
          }
        }

        return attachment;
      })
    );

    // Create user message
    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      content: text,
      createdAt: Date.now(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);

    // Create assistant message placeholder
    const assistantId = uid();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant", 
      content: "",
      createdAt: Date.now(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsGenerating(true);

    try {
      // Create or update chat if this is the first message
      if (!currentChatId && isAuthenticated) {
        try {
          const chatResponse = await fetch("/api/chats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "New chat" }),
          });

          if (chatResponse.ok) {
            const { chat } = await chatResponse.json();
            if (chat?.id) {
              setCurrentChatId(chat.id);
              // Redirect to the chat page for persistent conversation
              router.push(`/chat/${chat.id}`);
              return;
            }
          }
        } catch (error) {
          console.warn("Failed to create chat:", error);
        }
      }

      // Call the chat API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: toAPIMessages([...messages, userMessage]),
        }),
      });

      if (!response.ok) {
        let errorMessage = "Unknown error occurred";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
        } catch {
          errorMessage = `HTTP ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const content = data.content || data.choices?.[0]?.message?.content || "No response received.";

      // Update assistant message with response
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content, isStreaming: false }
            : m
        )
      );

      // Auto-generate title for first exchange
      if (messages.length === 0 && content) {
        try {
          await fetch("/api/title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: `${text}\n\n${content}` }),
          });
        } catch (error) {
          console.warn("Failed to generate title:", error);
        }
      }

    } catch (error: any) {
      console.error("Chat error:", error);
      
      // Update assistant message with error
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content: "I apologize, but I encountered an error while processing your request. Please try again.",
                error: error.message,
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsGenerating(false);
      
      // Resume auto-follow
      window.dispatchEvent(new CustomEvent("careiq:resume-autofollow"));
    }
  }, [messages, isGenerating, currentChatId, isAuthenticated, router]);

  // Handle regenerating the last response
  const handleRegenerate = useCallback(() => {
    if (!lastUserMessage) return;
    
    // Remove the last assistant message
    setMessages(prev => {
      const lastAssistantIndex = prev.findLastIndex(m => m.role === "assistant");
      if (lastAssistantIndex !== -1) {
        return prev.slice(0, lastAssistantIndex);
      }
      return prev;
    });
    
    // Resend the last user message
    handleSend(lastUserMessage.content, []);
  }, [lastUserMessage, handleSend]);

  // Handle message feedback
  const handleFeedback = useCallback(async (messageId: string, type: 'up' | 'down') => {
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, type }),
      });
    } catch (error) {
      console.warn("Failed to submit feedback:", error);
    }
  }, []);

  // Handle bookmarking messages
  const handleBookmark = useCallback(async (message: ChatMessage) => {
    try {
      await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.content,
          chat_id: currentChatId,
        }),
      });
    } catch (error) {
      console.warn("Failed to bookmark message:", error);
    }
  }, [currentChatId]);

  const showEmptyState = messages.length === 0;

  return (
    <div className="flex h-full w-full flex-col">
      {/* Welcome state */}
      {showEmptyState && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full">
            {/* Hero section */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg">
                <span className="text-3xl font-bold text-white">CQ</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                How can I help with your nursing home today?
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                I'm your expert assistant for CMS regulations, survey preparation, and nursing home operations.
              </p>
            </div>

            {/* Suggestion grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {SUGGESTION_PROMPTS.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSend(suggestion.prompt)}
                  className="group p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 shadow-sm hover:shadow-md transition-all duration-200 text-left hover:scale-[1.02]"
                  disabled={isGenerating}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-2xl" role="img" aria-label={suggestion.category}>
                      {suggestion.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {suggestion.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {suggestion.prompt}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Features showcase */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold">📋</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Expert Guidance</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get accurate, practical advice on CMS regulations and compliance requirements
                </p>
              </div>
              
              <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold">🎯</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Survey Ready</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Prepare for state surveys with targeted checklists and best practices
                </p>
              </div>
              
              <div className="text-center p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold">📚</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Always Updated</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Stay current with the latest regulations and industry standards
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {!showEmptyState && (
        <MessageList 
          messages={messages} 
          onRegenerate={handleRegenerate}
          onFeedback={handleFeedback}
          onBookmark={handleBookmark}
          isAssistantStreaming={isGenerating}
          className="flex-1"
        />
      )}

      {/* Composer */}
      <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-4xl mx-auto">
          <EnhancedComposer
            onSend={handleSend}
            placeholder={
              showEmptyState 
                ? "Ask about regulations, survey prep, compliance..." 
                : "Continue the conversation..."
            }
            isGenerating={isGenerating}
            showAttach={true}
            showVoice={false}
            maxLength={4000}
            className="w-full"
          />
          
          {isGenerating && (
            <div className="flex justify-center mt-3">
              <button
                onClick={() => setIsGenerating(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Stop generating
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}