// src/app/page.tsx - ChatGPT-style homepage
"use client";

import { useState, useRef, useEffect } from 'react';
import { Send, Plus, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';

const suggestions = [
  "What are the key CMS survey preparation steps?",
  "Create a staff training checklist for CNAs", 
  "Summarize infection control requirements",
  "Draft a policy update memo",
  "Explain MDS assessment timelines",
  "Review medication administration protocols"
];

export default function HomePage() {
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const { isAuthenticated } = useAuth();
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

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Welcome to CareIQ
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Sign in to start using your AI nursing home compliance assistant
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh grid grid-cols-[280px_1fr] bg-neutral-50 dark:bg-neutral-950">
      {/* Sidebar */}
      <aside className={`border-r border-neutral-200 dark:border-neutral-800 overflow-hidden fixed md:relative h-full w-[280px] transform transition-transform z-50 bg-white text-gray-900 dark:bg-gray-900 dark:text-white ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4">
          <button
            onClick={() => createNewChat()}
            disabled={isCreating}
            className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Plus size={16} />
            <span>New chat</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Recent</div>
          <div className="space-y-1">
            <div className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No conversations yet</div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Signed in as User</div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-10 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSidebar(true)} className="md:hidden p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"><Menu size={18} /></button>
            <h1 className="font-medium">CareIQ</h1>
          </div>
        </header>

        {/* Body (scroll) */}
        <section className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-6 py-10">
            {/* Hero */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-semibold">Start a new conversation</h1>
              <p className="text-neutral-600 dark:text-neutral-300 mt-1">Ask anything, or pick a suggestion to get going.</p>
            </div>

            {/* Suggestions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(s)}
                  disabled={isCreating}
                  className="text-left rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur p-4 shadow-sm hover:shadow-md transition disabled:opacity-50"
                >
                  <div className="text-base font-medium">{s}</div>
                </button>
              ))}
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
        <div className="sticky bottom-0 z-10 border-t border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur px-4 py-3">
          <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message CareIQ..."
                disabled={isCreating}
                autoFocus
                className="w-full resize-none border-0 bg-transparent px-4 py-4 pr-12 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-base"
                style={{ minHeight: '56px', maxHeight: '200px' }}
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || isCreating}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center justify-center"
              >
                {isCreating ? (
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={14} className="text-gray-700 dark:text-gray-200" />
                )}
              </button>
            </div>
            <div className="text-center py-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">CareIQ can make mistakes. Verify important compliance information.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
