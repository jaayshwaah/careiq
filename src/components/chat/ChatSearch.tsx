// src/components/chat/ChatSearch.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { Search, X, Clock, MessageCircle, Bookmark as BookmarkIcon } from 'lucide-react';
import { getBrowserSupabase } from '@/lib/supabaseClient';

interface SearchResult {
  chatId: string;
  title: string;
  created_at: string;
  updated_at: string;
  titleMatch: boolean;
  messageMatches: Array<{
    id: string;
    role: string;
    content: string;
    created_at: string;
    snippet: string;
  }>;
  totalMatches: number;
}

interface ChatSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
}

export default function ChatSearch({ isOpen, onClose, onSelectChat }: ChatSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = getBrowserSupabase();

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search with debounce
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      await performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/chats/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChat = (chatId: string) => {
    onSelectChat(chatId);
    onClose();
    setQuery('');
    setResults([]);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-16">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your chat history..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Searching...</p>
            </div>
          )}

          {error && (
            <div className="p-4 text-center text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && query.length >= 2 && results.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No results found for "{query}"</p>
            </div>
          )}

          {results.map((result) => (
            <div
              key={result.chatId}
              onClick={() => handleSelectChat(result.chatId)}
              className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            >
              {/* Chat Title */}
              <div className="flex items-start justify-between mb-2">
                <h3 
                  className="font-medium text-gray-900 dark:text-white"
                  dangerouslySetInnerHTML={{ 
                    __html: result.titleMatch 
                      ? highlightMatch(result.title || 'Untitled Chat', query)
                      : (result.title || 'Untitled Chat')
                  }}
                />
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ml-2">
                  <Clock className="h-3 w-3" />
                  {new Date(result.updated_at).toLocaleDateString()}
                </div>
              </div>

              {/* Message Matches */}
              {result.messageMatches.map((match) => (
                <div key={match.id} className="mb-2 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageCircle className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {match.role === 'user' ? 'You' : 'CareIQ'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(match.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p 
                    className="text-sm text-gray-700 dark:text-gray-300"
                    dangerouslySetInnerHTML={{ __html: highlightMatch(match.snippet, query) }}
                  />
                </div>
              ))}

              {/* Total Matches Indicator */}
              {result.totalMatches > result.messageMatches.length && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  +{result.totalMatches - result.messageMatches.length} more matches in this chat
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 text-center">
          Press Esc to close, Enter to select first result
        </div>
      </div>
    </div>
  );
}

// Add global styles for mark element
const style = `
  mark {
    background-color: #fef08a !important;
    padding: 0 2px;
    border-radius: 2px;
  }
  .dark mark {
    background-color: #a16207 !important;
    color: white;
  }
`;