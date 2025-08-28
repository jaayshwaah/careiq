// src/app/page.tsx - ChatGPT-style homepage
"use client";

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';

const suggestions = [
  "What are the key CMS survey preparation steps?",
  "Create a staff training checklist for CNAs", 
  "Summarize infection control requirements",
  "Draft a policy update memo",
  "Explain MDS assessment timelines",
  "Review medication administration protocols",
  "Generate a mock survey question set",
  "Create incident investigation checklist",
  "What training is required for new employees?",
  "Help me prepare for a state inspection"
];

export default function HomePage() {
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const supabase = getBrowserSupabase();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [message]);

  const createNewChat = async (initialMessage?: string) => {
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({
          title: initialMessage ? initialMessage.slice(0, 50) + '...' : 'New chat'
        }),
      });

      if (response.ok) {
        const { chat } = await response.json();
        if (chat?.id) {
          const params = initialMessage ? `?message=${encodeURIComponent(initialMessage)}` : '';
          router.push(`/chat/${chat.id}${params}`);
        } else {
          throw new Error('No chat ID returned');
        }
      } else {
        throw new Error('Failed to create chat');
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
      const chatId = crypto.randomUUID();
      const params = initialMessage ? `?message=${encodeURIComponent(initialMessage)}` : '';
      router.push(`/chat/${chatId}${params}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !isCreating) {
      createNewChat(trimmedMessage);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    // focus composer
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">

        {/* Body (scroll) */}
        <section className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-4 md:px-6 py-6 md:py-10">
            {/* Hero */}
            <div className="mb-6 md:mb-8 text-center md:text-left">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold">Start a new conversation</h1>
              <p className="text-neutral-600 dark:text-neutral-300 mt-1 text-sm md:text-base">Ask anything, or pick a suggestion to get going.</p>
            </div>

            {/* Suggestions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
              {suggestions.slice(0, 6).map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(s)}
                  disabled={isCreating}
                  className="text-left rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur p-4 shadow-sm hover:shadow-md transition disabled:opacity-50 group"
                >
                  <div className="text-base font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{s}</div>
                </button>
              ))}
            </div>

            {/* Feature highlights */}
            <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                <div className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-2">Smart Notifications</div>
                <div className="text-gray-700 dark:text-gray-300 text-sm">Get alerts for survey deadlines, training expirations, and compliance tasks</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800">
                <div className="text-green-600 dark:text-green-400 text-sm font-medium mb-2">Facility Dashboard</div>
                <div className="text-gray-700 dark:text-gray-300 text-sm">Monitor compliance scores, staff engagement, and upcoming deadlines</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
                <div className="text-purple-600 dark:text-purple-400 text-sm font-medium mb-2">Survey Preparation</div>
                <div className="text-gray-700 dark:text-gray-300 text-sm">Mock surveys, staff quizzes, and automated compliance tracking</div>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-8 text-sm text-neutral-600 dark:text-neutral-400">
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <span>⌘/Ctrl+K to search</span>
                <span>⌘/Ctrl+Enter to send</span>
                <span>Shift+Enter for newline</span>
              </div>
            </div>
          </div>
        </section>

        {/* Composer (sticky bottom) */}
        <div className="sticky bottom-0 z-10 border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur px-4 py-4">
          <div className="mx-auto max-w-4xl">
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg focus-within:shadow-xl transition-all focus-within:border-blue-500/50">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message CareIQ..."
                disabled={isCreating}
                autoFocus
                className="w-full resize-none border-0 bg-transparent px-6 py-4 pr-16 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-base leading-6"
                style={{ minHeight: '64px', maxHeight: '200px' }}
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || isCreating}
                className={`absolute right-3 bottom-3 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  message.trim() && !isCreating
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg hover:scale-105'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isCreating ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
            <div className="text-center mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">CareIQ can make mistakes. Verify important compliance information.</p>
            </div>
          </div>
        </div>
    </div>
  );
}
