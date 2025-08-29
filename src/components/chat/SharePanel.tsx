// src/components/chat/SharePanel.tsx
"use client";

import { useState, useEffect } from 'react';
import { Share2, X, UserPlus, Copy, Check, Trash2, Shield, Eye, Edit, MessageCircle } from 'lucide-react';
import { getBrowserSupabase } from '@/lib/supabaseClient';

interface ShareItem {
  id: string;
  shared_with: string;
  permission_level: 'read' | 'comment' | 'edit';
  shared_at: string;
  expires_at?: string;
  is_active: boolean;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface ChatInfo {
  id: string;
  title: string;
  user_id: string;
}

interface SharePanelProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
}

export default function SharePanel({ isOpen, onClose, chatId }: SharePanelProps) {
  const [chat, setChat] = useState<ChatInfo | null>(null);
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [myPermission, setMyPermission] = useState<string>('');
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'read' | 'comment' | 'edit'>('read');
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const supabase = getBrowserSupabase();

  useEffect(() => {
    if (isOpen && chatId) {
      loadShareInfo();
      setShareUrl(`${window.location.origin}/chat/${chatId}`);
    }
  }, [isOpen, chatId]);

  const loadShareInfo = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/chats/share?chat_id=${chatId}`, {
        headers: {
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChat(data.chat);
        setShares(data.shares || []);
        setIsOwner(data.isOwner);
        setMyPermission(data.myPermission || '');
      }
    } catch (error) {
      console.error('Failed to load share info:', error);
    } finally {
      setLoading(false);
    }
  };

  const shareChat = async () => {
    if (!shareEmail.trim()) return;
    
    setSharing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/chats/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({
          chat_id: chatId,
          shared_with_email: shareEmail,
          permission_level: sharePermission
        }),
      });

      if (response.ok) {
        const data = await response.json();
        await loadShareInfo(); // Reload to get updated list
        setShareEmail('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to share chat');
      }
    } catch (error) {
      console.error('Failed to share chat:', error);
      alert('Failed to share chat');
    } finally {
      setSharing(false);
    }
  };

  const removeShare = async (shareId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/chats/share?share_id=${shareId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
      });

      if (response.ok) {
        setShares(prev => prev.filter(s => s.id !== shareId));
      }
    } catch (error) {
      console.error('Failed to remove share:', error);
    }
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'edit': return <Edit className="h-4 w-4" />;
      case 'comment': return <MessageCircle className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'edit': return 'text-green-600 dark:text-green-400';
      case 'comment': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Share Chat</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {chat && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {chat.title || 'Untitled Chat'}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Share URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Share Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <button
                onClick={copyShareUrl}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                         flex items-center gap-2 text-sm font-medium transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Anyone with this link can access the chat based on their permissions
            </p>
          </div>

          {/* Add Team Member (Owner Only) */}
          {isOwner && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-5 w-5 text-green-600" />
                <h3 className="font-medium text-gray-900 dark:text-white">Invite Team Member</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Permission Level
                  </label>
                  <select
                    value={sharePermission}
                    onChange={(e) => setSharePermission(e.target.value as 'read' | 'comment' | 'edit')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="read">Read Only - Can view messages</option>
                    <option value="comment">Comment - Can view and add comments</option>
                    <option value="edit">Edit - Can view, comment, and modify</option>
                  </select>
                </div>
                
                <button
                  onClick={shareChat}
                  disabled={!shareEmail.trim() || sharing}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 
                           text-white rounded-lg font-medium transition-colors"
                >
                  {sharing ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          )}

          {/* Current Shares */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-gray-900 dark:text-white">
                People with Access ({shares.length})
              </h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : shares.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                {isOwner ? 'No one else has access to this chat yet' : 'Only you have access to this chat'}
              </p>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {share.profiles.full_name?.charAt(0) || share.profiles.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {share.profiles.full_name || share.profiles.email}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {share.profiles.email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPermissionColor(share.permission_level)}`}>
                        {getPermissionIcon(share.permission_level)}
                        <span className="capitalize">{share.permission_level}</span>
                      </div>
                      
                      {isOwner && (
                        <button
                          onClick={() => removeShare(share.id)}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-red-600 dark:text-red-400"
                          title="Remove access"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Your Permission (if not owner) */}
          {!isOwner && myPermission && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Your permission: {myPermission}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}