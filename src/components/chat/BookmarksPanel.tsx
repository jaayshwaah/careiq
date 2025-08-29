// src/components/chat/BookmarksPanel.tsx
"use client";

import { useState, useEffect } from 'react';
import { Bookmark, X, Trash2, Calendar, Hash, MessageSquare, ExternalLink } from 'lucide-react';
import { getBrowserSupabase } from '@/lib/supabaseClient';

interface BookmarkItem {
  id: string;
  chat_id: string;
  message_id?: string;
  title?: string;
  notes?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  chats: {
    id: string;
    title: string;
  };
}

interface BookmarksPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (chatId: string, messageId?: string) => void;
  currentChatId?: string;
}

export default function BookmarksPanel({ isOpen, onClose, onSelectChat, currentChatId }: BookmarksPanelProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterTag, setFilterTag] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const supabase = getBrowserSupabase();

  useEffect(() => {
    if (isOpen) {
      loadBookmarks();
    }
  }, [isOpen, currentChatId]);

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = currentChatId ? `/api/bookmarks?chat_id=${currentChatId}` : '/api/bookmarks';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBookmarks(data.bookmarks || []);
        
        // Extract all unique tags
        const tags = new Set<string>();
        data.bookmarks?.forEach((bookmark: BookmarkItem) => {
          bookmark.tags.forEach(tag => tags.add(tag));
        });
        setAllTags(Array.from(tags));
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteBookmark = async (bookmarkId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/bookmarks?id=${bookmarkId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
      });

      if (response.ok) {
        setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
      }
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    }
  };

  const filteredBookmarks = filterTag 
    ? bookmarks.filter(b => b.tags.includes(filterTag))
    : bookmarks;

  const handleSelectBookmark = (bookmark: BookmarkItem) => {
    onSelectChat(bookmark.chat_id, bookmark.message_id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentChatId ? 'Chat Bookmarks' : 'All Bookmarks'}
              </h2>
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm px-2 py-1 rounded-full">
                {filteredBookmarks.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterTag('')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    !filterTag 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  All
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setFilterTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                      filterTag === tag
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Hash className="h-3 w-3" />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredBookmarks.length === 0 ? (
            <div className="text-center py-12">
              <Bookmark className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {filterTag ? `No bookmarks found with tag "${filterTag}"` : 'No bookmarks yet'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Bookmark important messages by clicking the bookmark icon
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  {/* Bookmark Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      {bookmark.title && (
                        <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                          {bookmark.title}
                        </h3>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <MessageSquare className="h-4 w-4" />
                        <span>{bookmark.chats.title || 'Untitled Chat'}</span>
                        <span>•</span>
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(bookmark.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSelectBookmark(bookmark)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-blue-600 dark:text-blue-400"
                        title="Go to bookmark"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteBookmark(bookmark.id)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-red-600 dark:text-red-400"
                        title="Delete bookmark"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  {bookmark.notes && (
                    <p className="text-gray-700 dark:text-gray-300 mb-2">
                      {bookmark.notes}
                    </p>
                  )}

                  {/* Tags */}
                  {bookmark.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {bookmark.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs"
                        >
                          <Hash className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}