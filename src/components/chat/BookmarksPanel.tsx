// src/components/chat/BookmarksPanel.tsx - Enhanced bookmarks panel with knowledge management
"use client";

import { useState, useEffect } from 'react';
import { 
  Bookmark, 
  X, 
  Trash2, 
  Calendar, 
  Hash, 
  MessageSquare, 
  ExternalLink,
  Brain,
  Search,
  Filter,
  Star,
  Eye,
  BookOpen,
  Lightbulb,
  Tag
} from 'lucide-react';
import { getBrowserSupabase } from '@/lib/supabaseClient';

interface BookmarkItem {
  id: string;
  chat_id: string;
  message_id?: string;
  title?: string;
  content?: string;
  notes?: string;
  tags: string[];
  category?: string;
  is_knowledge_extracted?: boolean;
  created_at: string;
  updated_at: string;
  chats: {
    id: string;
    title: string;
  };
}

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  confidence_score: number;
  source_type: string;
  metadata: any;
  created_at: string;
}

interface BookmarksPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (chatId: string, messageId?: string) => void;
  currentChatId?: string;
}

const KNOWLEDGE_CATEGORIES = [
  'Survey Preparation',
  'F-Tags & Deficiencies', 
  'Staff Training',
  'Policy & Procedures',
  'Incident Management',
  'Quality Assurance',
  'Documentation',
  'Regulatory Updates',
  'Best Practices',
  'General Knowledge'
];

export default function BookmarksPanel({ isOpen, onClose, onSelectChat, currentChatId }: BookmarksPanelProps) {
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'knowledge'>('bookmarks');
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
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
      if (!session?.access_token) return;

      // Load bookmarks
      const url = currentChatId ? `/api/bookmarks?chat_id=${currentChatId}` : '/api/bookmarks';
      const bookmarksResponse = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (bookmarksResponse.ok) {
        const bookmarksData = await bookmarksResponse.json();
        setBookmarks(bookmarksData.bookmarks || []);
      }

      // Load knowledge items
      const knowledgeResponse = await fetch('/api/knowledge-base', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (knowledgeResponse.ok) {
        const knowledgeData = await knowledgeResponse.json();
        setKnowledgeItems(knowledgeData.knowledge_items || []);
      }

      // Extract all unique tags
      const tags = new Set<string>();
      [...(bookmarks || []), ...(knowledgeItems || [])].forEach((item: any) => {
        if (item.tags) {
          item.tags.forEach((tag: string) => tags.add(tag));
        }
      });
      setAllTags(Array.from(tags));
      
    } catch (error) {
      console.error('Failed to load data:', error);
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

  const deleteKnowledgeItem = async (itemId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/knowledge-base?id=${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
      });

      if (response.ok) {
        setKnowledgeItems(prev => prev.filter(k => k.id !== itemId));
      }
    } catch (error) {
      console.error('Failed to delete knowledge item:', error);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedTags([]);
  };

  // Filter bookmarks
  const filteredBookmarks = bookmarks.filter(bookmark => {
    const matchesSearch = !searchTerm || 
      (bookmark.title && bookmark.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bookmark.content && bookmark.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (bookmark.notes && bookmark.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = !selectedCategory || bookmark.category === selectedCategory;
    const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => bookmark.tags.includes(tag));
    const matchesFilterTag = !filterTag || bookmark.tags.includes(filterTag);

    return matchesSearch && matchesCategory && matchesTags && matchesFilterTag;
  });

  // Filter knowledge items
  const filteredKnowledgeItems = knowledgeItems.filter(item => {
    const matchesSearch = !searchTerm ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const matchesTags = selectedTags.length === 0 || selectedTags.some(tag => item.tags.includes(tag));

    return matchesSearch && matchesCategory && matchesTags;
  });

  const handleSelectBookmark = (bookmark: BookmarkItem) => {
    onSelectChat(bookmark.chat_id, bookmark.message_id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div 
        className="flex-1 bg-black/20 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Knowledge Center
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Bookmarks and extracted knowledge
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'bookmarks'
                  ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 border-b-2 border-blue-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Bookmark className="h-4 w-4" />
                <span>Bookmarks ({bookmarks.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('knowledge')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'knowledge'
                  ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 border-b-2 border-blue-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Brain className="h-4 w-4" />
                <span>Knowledge ({knowledgeItems.length})</span>
              </div>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search bookmarks and knowledge..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>

              {(selectedCategory || selectedTags.length > 0) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  Clear
                </button>
              )}
            </div>

            {showFilters && (
              <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">All Categories</option>
                    {KNOWLEDGE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Tags Filter */}
                {allTags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {allTags.slice(0, 12).map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-2 py-1 text-xs rounded border transition-colors ${
                            selectedTags.includes(tag)
                              ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>


          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : activeTab === 'bookmarks' ? (
              filteredBookmarks.length === 0 ? (
                <div className="text-center py-12">
                  <Bookmark className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No bookmarks found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchTerm || selectedCategory || selectedTags.length > 0
                      ? 'Try adjusting your search or filters'
                      : 'Start bookmarking important messages to see them here'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredBookmarks.map(bookmark => (
                    <div key={bookmark.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <Star className="h-4 w-4 text-yellow-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">
                            {bookmark.title || 'Untitled Bookmark'}
                          </h4>
                          {bookmark.content && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-3">
                              {bookmark.content}
                            </p>
                          )}
                          {bookmark.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                              {bookmark.notes}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(bookmark.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {bookmark.chats?.title || 'Chat'}
                            </div>
                            {bookmark.is_knowledge_extracted && (
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <Brain className="h-3 w-3" />
                                Extracted
                              </div>
                            )}
                          </div>
                          {bookmark.tags && bookmark.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {bookmark.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {bookmark.tags.length > 3 && (
                                <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                                  +{bookmark.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleSelectBookmark(bookmark)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                            title="Go to message"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteBookmark(bookmark.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                            title="Delete bookmark"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              filteredKnowledgeItems.length === 0 ? (
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No knowledge items found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchTerm || selectedCategory || selectedTags.length > 0
                      ? 'Try adjusting your search or filters'
                      : 'Extract knowledge from chat messages to build your knowledge base'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredKnowledgeItems.map(item => (
                    <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <Lightbulb className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            {item.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-3">
                            {item.content}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(item.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {item.category}
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              {Math.round(item.confidence_score * 100)}%
                            </div>
                          </div>
                          {item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {item.tags.length > 3 && (
                                <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                                  +{item.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => deleteKnowledgeItem(item.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                            title="Delete knowledge item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}