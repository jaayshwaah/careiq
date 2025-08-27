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
    createNewChat(suggestion);
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
            onClick={() => createNewChat()}
            disabled={isCreating}
            className="w-full flex items-center gap-2 px-3 py-2 border border-gray-600 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Plus size={16} />
            <span>New chat</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Recent</div>
          <div className="space-y-1">
            {/* Chat history would go here */}
            <div className="text-sm text-gray-500 py-8 text-center">
              No conversations yet
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            Signed in as User
          </div>
        </div>
      </div>

      {/* Main content */}
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

        {/* Chat area */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full px-4">
          {/* CareIQ Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <h1 className="text-4xl font-semibold text-gray-800 dark:text-white mb-2">
              How can I help you today?
            </h1>
          </div>

          {/* Suggestions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full mb-8">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isCreating}
                className="p-4 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {suggestion}
                </div>
              </button>
            ))}
          </div>

          {/* Message input */}
          <div className="w-full max-w-3xl">
            <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message CareIQ..."
                disabled={isCreating}
                className="w-full resize-none border-0 bg-transparent px-4 py-4 pr-12 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-base"
                style={{ 
                  minHeight: '56px',
                  maxHeight: '200px',
                }}
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || isCreating}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:hover:bg-gray-200 disabled:dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
              >
                {isCreating ? (
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={14} className={message.trim() ? 'text-white' : 'text-gray-600 dark:text-gray-400'} />
                )}
              </button>
            </div>
            
            <div className="text-center mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                CareIQ can make mistakes. Verify important compliance information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}