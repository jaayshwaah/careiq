"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Plus,
  MessageCircle,
  Settings,
  User,
  LogOut,
  Home,
  Bell,
  BarChart3,
  Calendar,
  BookOpen,
  Shield,
  Search,
  Star,
  Pencil,
  Trash2,
  Wrench,
  Calculator,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserSupabase } from "@/lib/supabaseClient";

interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at?: string;
}

interface AppleSidebarProps {
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const navigationItems = [
  { href: "/", label: "Chat", icon: MessageCircle },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/survey-prep", label: "Survey Prep", icon: Shield },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/ppd-calculator", label: "PPD Calculator", icon: Calculator },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
];

export default function AppleSidebar({ className = "", collapsed: externalCollapsed, onToggleCollapse }: AppleSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, signOut } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [brandingSettings, setBrandingSettings] = useState<any>(null);
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const supabase = getBrowserSupabase();

  // Use external collapsed state if provided, otherwise use internal state
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  
  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  // Load user profile
  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, role, is_admin, email, full_name")
        .eq("user_id", user.id)
        .single();
      setUserProfile(profile);
      
      // Load branding settings if admin
      if (profile?.role?.includes('administrator')) {
        try {
          const { data: branding } = await supabase
            .from("branding_settings")
            .select("*")
            .eq("user_id", user.id)
            .single();
          setBrandingSettings(branding);
        } catch (error) {
          console.warn("Failed to load branding settings:", error);
        }
      }
    } catch (error) {
      console.warn("Failed to load profile:", error);
    }
  }, [user, supabase]);

  // Load chats
  const loadChats = useCallback(async () => {
    if (!isAuthenticated) {
      setChats([]);
      setLoading(false);
      return;
    }

    try {
      const { data: chatsData, error } = await supabase
        .from("chats")
        .select("id, title, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setChats(chatsData || []);
    } catch (error) {
      console.warn("Failed to load chats:", error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, supabase]);

  useEffect(() => {
    loadProfile();
    loadChats();
  }, [loadProfile, loadChats]);

  // Create new chat
  const createNewChat = async () => {
    if (!isAuthenticated) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ title: "New chat" }),
      });

      if (response.ok) {
        const { chat } = await response.json();
        if (chat?.id) {
          router.push(`/chat/${chat.id}`);
        }
      }
    } catch (error) {
      console.warn("Failed to create new chat:", error);
      const chatId = crypto.randomUUID();
      router.push(`/chat/${chatId}`);
    }
  };

  // Edit chat title
  const handleEditChat = (chat: Chat) => {
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleSaveTitle = async () => {
    if (!editingChatId || !editingTitle.trim()) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/chats/${editingChatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ title: editingTitle.trim() }),
      });

      if (response.ok) {
        setChats(prev => prev.map(chat => 
          chat.id === editingChatId 
            ? { ...chat, title: editingTitle.trim() }
            : chat
        ));
        setEditingChatId(null);
        setEditingTitle("");
      }
    } catch (error) {
      console.error('Failed to update chat title:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingChatId(null);
    setEditingTitle("");
  };

  // Delete chat
  const handleDeleteChat = async (chatId: string) => {
    if (!confirm('Are you sure you want to delete this chat?')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        setChats(prev => prev.filter(chat => chat.id !== chatId));
        
        // If we're currently viewing the deleted chat, redirect to home
        if (pathname === `/chat/${chatId}`) {
          router.push('/');
        }
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const isCurrentPath = (href: string) => {
    if (href === "/") {
      return pathname === "/" || pathname.startsWith("/chat");
    }
    return pathname.startsWith(href);
  };

  const filteredChats = chats.filter(chat => 
    chat.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`fixed left-0 top-0 h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-80'} ${className}`}>
      {/* Header */}
      <div className={`border-b border-gray-200/30 dark:border-gray-700/30 ${isCollapsed ? 'px-3 py-4' : 'px-6 py-5'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
              style={{
                background: brandingSettings?.primary_color 
                  ? `linear-gradient(to bottom right, ${brandingSettings.primary_color}, ${brandingSettings.primary_color}CC)`
                  : 'linear-gradient(to bottom right, #3b82f6, #2563eb)'
              }}
            >
              {brandingSettings?.logo_url ? (
                <img 
                  src={brandingSettings.logo_url} 
                  alt="Company logo" 
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <span className="text-white font-semibold text-sm">
                  {brandingSettings?.company_name 
                    ? brandingSettings.company_name.charAt(0).toUpperCase() 
                    : 'CIQ'}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <span className="font-semibold text-gray-900 dark:text-white text-lg">
                {brandingSettings?.company_name || 'CareIQ'}
              </span>
            )}
          </div>
          <button
            onClick={toggleCollapse}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        
        {/* New Chat Button */}
        <button
          onClick={createNewChat}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center gap-2'} px-4 py-2.5 text-white rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm`}
          style={{
            backgroundColor: brandingSettings?.primary_color || '#3b82f6',
            ':hover': {
              backgroundColor: brandingSettings?.primary_color 
                ? `${brandingSettings.primary_color}DD` 
                : '#2563eb'
            }
          }}
          onMouseOver={(e) => {
            if (brandingSettings?.primary_color) {
              e.currentTarget.style.backgroundColor = `${brandingSettings.primary_color}DD`;
            }
          }}
          onMouseOut={(e) => {
            if (brandingSettings?.primary_color) {
              e.currentTarget.style.backgroundColor = brandingSettings.primary_color;
            }
          }}
          title={isCollapsed ? "New Chat" : undefined}
        >
          <Plus size={18} />
          {!isCollapsed && "New Chat"}
        </button>
      </div>

      {/* Navigation */}
      <div className="px-3 py-4 border-b border-gray-200/30 dark:border-gray-700/30">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            // Hide knowledge tab for non-admin users
            if (item.href === '/knowledge' && !userProfile?.role?.includes('administrator')) {
              return null;
            }
            
            const Icon = item.icon;
            const isActive = isCurrentPath(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={18} className={isActive ? "text-blue-600 dark:text-blue-400" : ""} />
                {!isCollapsed && item.label}
              </Link>
            );
          })}
          
          {/* Admin Button */}
          {(userProfile?.email?.endsWith('@careiq.com') || 
            userProfile?.email === 'jking@pioneervalleyhealth.com' ||
            userProfile?.role?.includes('administrator') ||
            userProfile?.is_admin === true) && (
            <Link
              href="/admin"
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg font-medium transition-all duration-200 border-t border-gray-200/30 dark:border-gray-700/30 mt-2 pt-4 ${
                isCurrentPath('/admin')
                  ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
              }`}
              title={isCollapsed ? "CareIQ Admin" : undefined}
            >
              <Wrench size={18} className={isCurrentPath('/admin') ? "text-purple-600 dark:text-purple-400" : ""} />
              {!isCollapsed && "CareIQ Admin"}
            </Link>
          )}
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!isCollapsed && (
          <div className="px-3 py-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-800/50 border-0 rounded-lg text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3">
          {!isCollapsed && (
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2">
              Recent Chats
            </div>
          )}
          
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredChats.length > 0 ? (
            <div className="space-y-1">
              {filteredChats.map((chat) => {
                const isActive = pathname === `/chat/${chat.id}`;
                const isEditing = editingChatId === chat.id;
                
                return (
                  <div
                    key={chat.id}
                    className={`group flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} p-2 rounded-lg transition-all duration-200 ${
                      isActive 
                        ? "bg-blue-50 dark:bg-blue-900/20" 
                        : "hover:bg-gray-100 dark:hover:bg-gray-800/30"
                    }`}
                    title={isCollapsed ? (chat.title || "Untitled chat") : undefined}
                  >
                    <MessageCircle 
                      size={16} 
                      className={`${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400"} ${isCollapsed ? 'cursor-pointer' : ''}`}
                      onClick={isCollapsed ? () => router.push(`/chat/${chat.id}`) : undefined}
                    />
                    {!isCollapsed && <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={handleSaveTitle}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTitle();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-full"
                          autoFocus
                        />
                      ) : (
                        <div 
                          className={`text-sm font-medium truncate cursor-pointer ${
                            isActive 
                              ? "text-blue-700 dark:text-blue-400" 
                              : "text-gray-900 dark:text-white"
                          }`}
                          onClick={() => router.push(`/chat/${chat.id}`)}
                        >
                          {chat.title || "Untitled chat"}
                        </div>
                      )}
                    </div>}
                    {!isEditing && !isCollapsed && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditChat(chat);
                          }}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-gray-500 hover:text-gray-700"
                          title="Rename chat"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChat(chat.id);
                          }}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-red-500 hover:text-red-700"
                          title="Delete chat"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              No chats yet
            </div>
          )}
        </div>
      </div>

      {/* User Profile */}
      <div className={`border-t border-gray-200/30 dark:border-gray-700/30 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {userProfile?.full_name || user?.email?.split('@')[0] || 'User'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {userProfile?.role || 'Member'}
                </div>
              </div>
            </div>
          )}
          <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2' : 'gap-1'}`}>
            <Link
              href="/settings"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings size={16} className="text-gray-500 dark:text-gray-400" />
            </Link>
            <button
              onClick={handleSignOut}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut size={16} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}