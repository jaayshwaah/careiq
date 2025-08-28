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
  "Review medication administration protocols",
  "Generate a mock survey question set",
  "Create incident investigation checklist",
  "What training is required for new employees?",
  "Help me prepare for a state inspection"
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
    <div className="h-dvh flex md:grid md:grid-cols-[280px_1fr] bg-neutral-50 dark:bg-neutral-950">
      {/* Sidebar */}
      <aside className={`border-r border-neutral-200 dark:border-neutral-800 overflow-hidden fixed md:relative h-full w-[280px] transform transition-transform z-50 bg-white text-gray-900 dark:bg-gray-900 dark:text-white ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* CareIQ Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">CIQ</span>
            </div>
            <h1 className="text-lg font-semibold">CareIQ</h1>
          </div>
          <button
            onClick={() => createNewChat()}
            disabled={isCreating}
            className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white disabled:text-gray-500 rounded-lg transition-colors"
          >
            <Plus size={16} />
            <span>New chat</span>
          </button>
        </div>
        
        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-6">
            {/* Quick Actions */}
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Quick Actions</div>
              <div className="space-y-1">
                <button
                  onClick={() => createNewChat()}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
                >
                  💬 Start New Chat
                </button>
                <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm">
                  📋 Survey Prep Checklist
                </button>
                <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm">
                  🎓 Staff Training
                </button>
              </div>
            </div>

            {/* Main Features */}
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Features</div>
              <div className="space-y-1">
                <a href="/dashboard" className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm block">
                  📊 Facility Dashboard
                </a>
                <a href="/notifications" className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm block">
                  🔔 Smart Notifications
                </a>
                <a href="/survey-prep" className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm block">
                  🎯 Survey Preparation
                </a>
                <a href="/calendar" className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm block">
                  📅 Compliance Calendar
                </a>
                <a href="/knowledge" className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm block">
                  📚 Knowledge Base
                </a>
                <a href="/analytics" className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm block">
                  📈 Analytics
                </a>
              </div>
            </div>

            {/* Recent Chats */}
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Recent Chats</div>
              <div className="space-y-1">
                <div className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No conversations yet</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">Signed in as User</div>
            <a href="/settings" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              ⚙️
            </a>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-10 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSidebar(true)} className="md:hidden p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"><Menu size={18} /></button>
            <h1 className="font-medium">CareIQ</h1>
          </div>
        </header>

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
        <div className="sticky bottom-0 z-10 border-t border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur px-3 md:px-4 py-3">
          <div className="mx-auto max-w-3xl rounded-xl md:rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
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
                style={{ minHeight: '48px', maxHeight: '120px' }}
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
