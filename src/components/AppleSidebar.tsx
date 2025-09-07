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
  CheckSquare,
  Upload,
  FileSpreadsheet,
  ListTodo,
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

const mainNavigationItems = [
  { href: "/", label: "Chat", icon: MessageCircle },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const toolsNavigationItems = [
  { href: "/ppd-calculator", label: "PPD Calculator", icon: Calculator },
  { href: "/daily-rounds", label: "Daily Rounds", icon: CheckSquare },
  { href: "/task-management", label: "Task Management", icon: ListTodo },
  { href: "/survey-prep", label: "Survey Prep", icon: Shield },
  { href: "/pbj-corrector-ai", label: "PBJ Corrector AI", icon: FileSpreadsheet },
  { href: "/calendar-integrations", label: "Calendar", icon: Calendar },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen, adminOnly: true },
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
  const [facilityLogo, setFacilityLogo] = useState<string | null>(null);
  const [facilityName, setFacilityName] = useState<string>("");
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

  // Load user profile and facility logo - using fallback data to avoid RLS recursion
  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Use fallback profile data to avoid profiles table RLS recursion
      const profile = {
        user_id: user.id,
        role: 'user',
        is_admin: false,
        email: user.email,
        full_name: user.email?.split('@')[0] || 'User',
        facility_name: 'Healthcare Facility',
        facility_logo_url: null
      };
      
      setUserProfile(profile);
      
      // Set facility information
      if (profile?.facility_name) {
        setFacilityName(profile.facility_name);
      }
      if (profile?.facility_logo_url) {
        setFacilityLogo(profile.facility_logo_url);
      }
      
      // Load branding settings if admin (fallback for custom branding)
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
      
      const chats = chatsData || [];
      setChats(chats);
      
      // Auto-title chats that need titles (like ChatGPT)
      const chatsNeedingTitles = chats.filter(chat => 
        !chat.title || 
        chat.title === 'New Chat' || 
        chat.title === 'Untitled chat' ||
        chat.title.trim() === ''
      );
      
      // Auto-title up to 3 recent chats at a time to avoid API overload
      const chatsToTitle = chatsNeedingTitles.slice(0, 3);
      
      if (chatsToTitle.length > 0) {
        autoTitleChats(chatsToTitle);
      }
    } catch (error) {
      console.warn("Failed to load chats:", error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, supabase]);

  // Auto-title chats function - using server-side API
  const autoTitleChats = async (chatsToTitle: Chat[]) => {
    for (const chat of chatsToTitle) {
      try {
        // Call the existing title API which handles message decryption server-side
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) continue;

        const response = await fetch(`/api/chats/${chat.id}/title`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.ok && result.title) {
            // Update the chat in our local state
            setChats(prevChats => 
              prevChats.map(c => 
                c.id === chat.id 
                  ? { ...c, title: result.title }
                  : c
              )
            );
          }
        }
      } catch (error) {
        console.warn('Failed to auto-title chat:', chat.id, error);
      }
      
      // Add a small delay between requests to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  useEffect(() => {
    loadProfile();
    loadChats();
  }, [loadProfile, loadChats]);

  // Create new chat - go to home page
  const createNewChat = () => {
    router.push('/');
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
    <div className={`h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-80'} ${className}`}>
      {/* Fixed Header */}
      <div className={`flex-none border-b border-gray-200/30 dark:border-gray-700/30 ${isCollapsed ? 'px-3 py-4' : 'px-6 py-5'}`}>
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
              {facilityLogo || brandingSettings?.logo_url ? (
                <img 
                  src={facilityLogo || brandingSettings.logo_url} 
                  alt={facilityName ? `${facilityName} logo` : "Company logo"} 
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <span className="text-white font-semibold text-sm">
                  {facilityName 
                    ? facilityName.charAt(0).toUpperCase() 
                    : brandingSettings?.company_name 
                      ? brandingSettings.company_name.charAt(0).toUpperCase() 
                      : 'CIQ'}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <span className="font-semibold text-gray-900 dark:text-white text-lg">
                {facilityName || brandingSettings?.company_name || 'CareIQ'}
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

      {/* Fixed Main Navigation */}
      <div className="flex-none px-3 py-4 border-b border-gray-200/30 dark:border-gray-700/30">
        <div className="space-y-1">
          {mainNavigationItems.map((item) => {
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
        </div>
      </div>

      {/* Scrollable Content Area - Tools and Chats */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          {/* Tools Section */}
          <div className="mb-6">
            {!isCollapsed && (
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                Tools
              </div>
            )}
            <div className="space-y-1">
              {toolsNavigationItems.map((item) => {
                // Hide admin-only items for non-admin users
                if (item.adminOnly && !userProfile?.role?.includes('administrator')) {
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
                        ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon size={18} className={isActive ? "text-green-600 dark:text-green-400" : ""} />
                    {!isCollapsed && item.label}
                  </Link>
                );
              })}
              
              {/* CareIQ Admin Button - Only for CareIQ team and specific authorized users */}
              {(userProfile?.email?.endsWith('@careiq.com') || 
                userProfile?.email === 'jking@pioneervalleyhealth.com' ||
                user?.email === 'jking@pioneervalleyhealth.com' ||
                user?.email?.endsWith('@careiq.com') ||
                userProfile?.role === 'careiq_admin') && (
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

          {/* Search */}
          {!isCollapsed && (
            <div className="mb-6">
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

          {/* Chat History */}
          <div>
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
          </div>
        </div>
      </div> {/* End of scrollable content area */}

      {/* Fixed Footer - User Section */}
      <div className="flex-none border-t border-gray-200/30 dark:border-gray-700/30 p-3">
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
  );
}