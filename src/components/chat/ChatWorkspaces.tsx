// src/components/chat/ChatWorkspaces.tsx - Collaborative chat workspaces for team collaboration
"use client";

import { useState, useEffect } from "react";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  UserPlus, 
  Settings,
  Eye,
  Edit3,
  MessageSquareShare,
  Calendar,
  Hash,
  X,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Share2
} from "lucide-react";

interface SharedChat {
  id: string;
  chat_id: string;
  shared_by: string;
  shared_with: string;
  permission_level: 'read' | 'comment' | 'edit';
  shared_at: string;
  expires_at: string | null;
  is_active: boolean;
  chat: {
    id: string;
    title: string;
    created_at: string;
  };
  shared_by_user: {
    id: string;
    email: string;
    user_metadata?: {
      name?: string;
      avatar_url?: string;
    };
  };
  shared_with_user: {
    id: string;
    email: string;
    user_metadata?: {
      name?: string;
      avatar_url?: string;
    };
  };
}

interface TeamMember {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  last_seen?: string;
  role?: string;
}

interface ChatWorkspacesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
  currentUserId?: string;
}

const PERMISSION_LEVELS = [
  { value: 'read', label: 'View Only', description: 'Can view messages only' },
  { value: 'comment', label: 'Comment', description: 'Can view and add comments' },
  { value: 'edit', label: 'Edit', description: 'Can view, comment, and send messages' }
] as const;

export default function ChatWorkspaces({
  isOpen,
  onClose,
  onSelectChat,
  currentUserId
}: ChatWorkspacesProps) {
  const [activeTab, setActiveTab] = useState<'shared-with-me' | 'shared-by-me' | 'team'>('shared-with-me');
  const [sharedChats, setSharedChats] = useState<SharedChat[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPermission, setFilterPermission] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedChatForShare, setSelectedChatForShare] = useState<string>('');
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'read' | 'comment' | 'edit'>('read');
  const [shareExpiresIn, setShareExpiresIn] = useState<string>('never');
  const [sharing, setSharing] = useState(false);
  
  const supabase = getBrowserSupabase();

  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      if (activeTab === 'shared-with-me' || activeTab === 'shared-by-me') {
        await loadSharedChats(session.access_token);
      } else if (activeTab === 'team') {
        await loadTeamMembers(session.access_token);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSharedChats = async (token: string) => {
    const endpoint = activeTab === 'shared-with-me' 
      ? '/api/chat-shares?type=received'
      : '/api/chat-shares?type=shared';

    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      setSharedChats(data.shares || []);
    }
  };

  const loadTeamMembers = async (token: string) => {
    // Load team members from organization or recent collaborators
    const response = await fetch('/api/team-members', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      setTeamMembers(data.members || []);
    }
  };

  const shareChat = async () => {
    if (!shareEmail || !selectedChatForShare) return;

    try {
      setSharing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const expiresAt = shareExpiresIn === 'never' ? null : 
        shareExpiresIn === '24h' ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() :
        shareExpiresIn === '7d' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() :
        shareExpiresIn === '30d' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() :
        null;

      const response = await fetch('/api/chat-shares', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          chat_id: selectedChatForShare,
          shared_with_email: shareEmail,
          permission_level: sharePermission,
          expires_at: expiresAt
        })
      });

      if (response.ok) {
        setShowShareModal(false);
        setShareEmail('');
        setSelectedChatForShare('');
        setSharePermission('read');
        setShareExpiresIn('never');
        loadData(); // Reload data
      } else {
        const error = await response.json();
        console.error('Share failed:', error);
        // TODO: Show error toast
      }
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      setSharing(false);
    }
  };

  const removeShare = async (shareId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/chat-shares?id=${shareId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        setSharedChats(prev => prev.filter(s => s.id !== shareId));
      }
    } catch (error) {
      console.error('Failed to remove share:', error);
    }
  };

  const updateSharePermission = async (shareId: string, permission: 'read' | 'comment' | 'edit') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/chat-shares', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: shareId,
          permission_level: permission
        })
      });

      if (response.ok) {
        setSharedChats(prev => 
          prev.map(s => s.id === shareId ? { ...s, permission_level: permission } : s)
        );
      }
    } catch (error) {
      console.error('Failed to update permission:', error);
    }
  };

  // Filter shared chats
  const filteredSharedChats = sharedChats.filter(share => {
    const matchesSearch = !searchTerm || 
      share.chat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      share.shared_by_user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      share.shared_with_user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPermission = !filterPermission || share.permission_level === filterPermission;

    return matchesSearch && matchesPermission;
  });

  // Filter team members
  const filteredTeamMembers = teamMembers.filter(member => {
    const matchesSearch = !searchTerm ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.name && member.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  const getPermissionIcon = (level: string) => {
    switch (level) {
      case 'edit': return <Edit3 className="h-3 w-3 text-green-600" />;
      case 'comment': return <MessageSquareShare className="h-3 w-3 text-blue-600" />;
      case 'read': return <Eye className="h-3 w-3 text-gray-600" />;
      default: return null;
    }
  };

  const getStatusIcon = (share: SharedChat) => {
    if (!share.is_active) return <XCircle className="h-4 w-4 text-red-500" />;
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return <Clock className="h-4 w-4 text-orange-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-4xl bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Chat Workspaces
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Collaborate with your team on chat conversations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Share2 className="h-4 w-4" />
                Share Chat
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <button
              onClick={() => setActiveTab('shared-with-me')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'shared-with-me'
                  ? 'text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-900 border-b-2 border-purple-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Eye className="h-4 w-4" />
                <span>Shared with Me ({sharedChats.filter(s => activeTab === 'shared-with-me').length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('shared-by-me')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'shared-by-me'
                  ? 'text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-900 border-b-2 border-purple-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Share2 className="h-4 w-4" />
                <span>Shared by Me ({sharedChats.filter(s => activeTab === 'shared-by-me').length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'team'
                  ? 'text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-900 border-b-2 border-purple-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />
                <span>Team ({teamMembers.length})</span>
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
                placeholder="Search chats and team members..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {(activeTab === 'shared-with-me' || activeTab === 'shared-by-me') && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>

                {filterPermission && (
                  <button
                    onClick={() => setFilterPermission('')}
                    className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {showFilters && (activeTab === 'shared-with-me' || activeTab === 'shared-by-me') && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Permission Level
                  </label>
                  <select
                    value={filterPermission}
                    onChange={(e) => setFilterPermission(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">All Permissions</option>
                    {PERMISSION_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : activeTab === 'team' ? (
              filteredTeamMembers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No team members found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'Try adjusting your search' : 'Invite team members to start collaborating'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTeamMembers.map(member => (
                    <div key={member.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {(member.name || member.email).slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {member.name || member.email}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                        {member.role && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">{member.role}</p>
                        )}
                      </div>
                      {member.last_seen && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          Last seen {new Date(member.last_seen).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              filteredSharedChats.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquareShare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No shared chats found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchTerm || filterPermission
                      ? 'Try adjusting your search or filters'
                      : activeTab === 'shared-with-me' 
                        ? 'No chats have been shared with you yet'
                        : 'You haven\'t shared any chats yet'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSharedChats.map(share => (
                    <div key={share.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getStatusIcon(share)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                {share.chat.title || 'Untitled Chat'}
                              </h4>
                              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(share.shared_at).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-1">
                                  {getPermissionIcon(share.permission_level)}
                                  <span className="capitalize">{share.permission_level}</span>
                                </div>
                                {share.expires_at && (
                                  <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                    <Clock className="h-3 w-3" />
                                    Expires {new Date(share.expires_at).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {activeTab === 'shared-with-me' ? (
                                  <>Shared by {share.shared_by_user.user_metadata?.name || share.shared_by_user.email}</>
                                ) : (
                                  <>Shared with {share.shared_with_user.user_metadata?.name || share.shared_with_user.email}</>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => onSelectChat(share.chat_id)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                                title="Open chat"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {activeTab === 'shared-by-me' && (
                                <>
                                  <select
                                    value={share.permission_level}
                                    onChange={(e) => updateSharePermission(share.id, e.target.value as any)}
                                    className="text-xs p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                                  >
                                    {PERMISSION_LEVELS.map(level => (
                                      <option key={level.value} value={level.value}>{level.label}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => removeShare(share.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                                    title="Remove share"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
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

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Share Chat</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Permission Level
                </label>
                <select
                  value={sharePermission}
                  onChange={(e) => setSharePermission(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {PERMISSION_LEVELS.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label} - {level.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expires
                </label>
                <select
                  value={shareExpiresIn}
                  onChange={(e) => setShareExpiresIn(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="never">Never</option>
                  <option value="24h">24 hours</option>
                  <option value="7d">7 days</option>
                  <option value="30d">30 days</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={shareChat}
                disabled={!shareEmail || sharing}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {sharing ? 'Sharing...' : 'Share Chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}