// src/app/chat/new/page.tsx - ChatGPT-style new chat page
"use client";

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getBrowserSupabase } from '@/lib/supabaseClient';

export default function NewChatPage() {
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const supabase = getBrowserSupabase();

  // Load dynamic suggestions - re-run every time component mounts
  useEffect(() => {
    loadSuggestions();
    
    // Also reload when the window regains focus (user returns to tab)
    const handleFocus = () => loadSuggestions();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [message]);

  const loadSuggestions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Add cache-busting to get fresh suggestions every time
      const timestamp = Date.now();
      const response = await fetch(`/api/chat-suggestions?t=${timestamp}`, {
        headers: {
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        cache: 'no-store',
      });

      if (response.ok) {
        const { suggestions: loadedSuggestions } = await response.json();
        setSuggestions(loadedSuggestions || []);
      } else {
        // Fallback suggestions - NOW RANDOMIZED
        const allSuggestions = [
          { text: "What are the key CMS survey preparation steps?", icon: "📋", title: "Survey Prep" },
          { text: "Create a staff training checklist for CNAs", icon: "👥", title: "Staff Training" },
          { text: "Summarize infection control requirements", icon: "🛡️", title: "Infection Control" },
          { text: "Draft a policy update memo", icon: "📝", title: "Policy Update" },
          { text: "Explain MDS assessment timelines", icon: "📊", title: "MDS Help" },
          { text: "Review medication administration protocols", icon: "💊", title: "Medications" },
          { text: "Help me create a comprehensive care plan for a new admission", icon: "🏥", title: "Care Plans" },
          { text: "What's the proper protocol for a resident fall with head injury?", icon: "🚑", title: "Emergency" },
          { text: "Explain F-Tag 689 requirements and how to stay compliant", icon: "⚖️", title: "F-Tags" },
          { text: "What documentation is required for restraint use?", icon: "📝", title: "Documentation" },
          { text: "Calculate PPD hours for our facility", icon: "👥", title: "Staffing" },
          { text: "How can we improve our quality indicator scores?", icon: "📈", title: "Quality Measures" },
          { text: "What steps can increase our facility's star rating?", icon: "⭐", title: "Star Rating" },
          { text: "Develop a fall prevention program to reduce incidents", icon: "📉", title: "Falls" },
          { text: "Walk me through completing an MDS assessment for a new resident", icon: "🩺", title: "Assessment" },
          { text: "Help me correct errors in our PBJ submission", icon: "📊", title: "PBJ" },
          { text: "How do I respond to a scope and severity deficiency?", icon: "🎯", title: "Deficiencies" },
          { text: "Create a fair staff schedule that meets state requirements", icon: "📅", title: "Scheduling" },
        ];
        // Shuffle and pick 6 random suggestions
        const shuffled = allSuggestions.sort(() => Math.random() - 0.5);
        setSuggestions(shuffled.slice(0, 6));
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      // Use fallback with randomization
      const allSuggestions = [
        { text: "What are the key CMS survey preparation steps?", icon: "📋", title: "Survey Prep" },
        { text: "Create a staff training checklist for CNAs", icon: "👥", title: "Staff Training" },
        { text: "Summarize infection control requirements", icon: "🛡️", title: "Infection Control" },
        { text: "Draft a policy update memo", icon: "📝", title: "Policy Update" },
        { text: "Explain MDS assessment timelines", icon: "📊", title: "MDS Help" },
        { text: "Review medication administration protocols", icon: "💊", title: "Medications" },
        { text: "Help me create a comprehensive care plan for a new admission", icon: "🏥", title: "Care Plans" },
        { text: "What's the proper protocol for a resident fall with head injury?", icon: "🚑", title: "Emergency" },
        { text: "Explain F-Tag 689 requirements and how to stay compliant", icon: "⚖️", title: "F-Tags" },
        { text: "Calculate PPD hours for our facility", icon: "👥", title: "Staffing" },
        { text: "How can we improve our quality indicator scores?", icon: "📈", title: "Quality Measures" },
        { text: "What steps can increase our facility's star rating?", icon: "⭐", title: "Star Rating" },
      ];
      const shuffled = allSuggestions.sort(() => Math.random() - 0.5);
      setSuggestions(shuffled.slice(0, 6));
    } finally {
      setLoadingSuggestions(false);
    }
  };

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

  const handleSuggestionClick = (suggestion: any) => {
    const text = typeof suggestion === 'string' ? suggestion : suggestion.text;
    setMessage(text);
    // focus composer
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

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
            {loadingSuggestions ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading suggestions...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                {suggestions.slice(0, 6).map((s, i) => (
                  <button
                    key={s.id || i}
                    onClick={() => handleSuggestionClick(s)}
                    disabled={isCreating}
                    className="text-left rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur p-4 shadow-sm hover:shadow-md transition disabled:opacity-50 group"
                  >
                    <div className="flex items-start gap-2">
                      {s.icon && <span className="text-xl">{s.icon}</span>}
                      <div className="flex-1">
                        {s.title && <div className="font-semibold text-sm mb-1">{s.title}</div>}
                        <div className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {s.text}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

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
            <div className="text-center mt-3 space-y-1">
              <div className="text-xs text-gray-400 dark:text-gray-500">
                <span className="inline-block mr-3">⌘/Ctrl+K to search</span>
                <span className="inline-block mr-3">⌘/Ctrl+Enter to send</span>
                <span className="inline-block">Shift+Enter for newline</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">CareIQ can make mistakes. Verify important compliance information.</p>
            </div>
          </div>
        </div>
    </div>
  );
}
