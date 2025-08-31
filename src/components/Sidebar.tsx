// src/components/Sidebar.tsx - Enum-aware version
"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  Plus,
  MessageCircle,
  Settings,
  User,
  LogOut,
  PanelsTopLeft,
  CalendarDays,
  Shield,
  Search,
  X,
  Clock,
  Calculator,
  FileText,
  Upload,
  BookOpen,
  BarChart3,
  HeadphonesIcon,
  Wrench,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserSupabase } from "@/lib/supabaseClient";

interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at?: string;
}

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { isAuthenticated, user, signOut } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const supabase = getBrowserSupabase();

  // Filter chats based on search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    return chats.filter(chat => 
      chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [chats, searchQuery]);

  // Group chats by date for better organization
  const groupedChats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setDate(lastMonth.getDate() - 30);

    const groups: { label: string; chats: Chat[] }[] = [];
    const todayChats: Chat[] = [];
    const yesterdayChats: Chat[] = [];
    const thisWeekChats: Chat[] = [];
    const thisMonthChats: Chat[] = [];
    const olderChats: Chat[] = [];

    filteredChats.forEach(chat => {
      const chatDate = new Date(chat.updated_at || chat.created_at);
      
      if (chatDate >= today) {
        todayChats.push(chat);
      } else if (chatDate >= yesterday) {
        yesterdayChats.push(chat);
      } else if (chatDate >= lastWeek) {
        thisWeekChats.push(chat);
      } else if (chatDate >= lastMonth) {
        thisMonthChats.push(chat);
      } else {
        olderChats.push(chat);
      }
    });

    if (searchQuery.trim()) {
      // When searching, show all results without grouping
      return [{ label: '', chats: filteredChats }];
    }

    if (todayChats.length > 0) groups.push({ label: 'Today', chats: todayChats });
    if (yesterdayChats.length > 0) groups.push({ label: 'Yesterday', chats: yesterdayChats });
    if (thisWeekChats.length > 0) groups.push({ label: 'This Week', chats: thisWeekChats });
    if (thisMonthChats.length > 0) groups.push({ label: 'This Month', chats: thisMonthChats });
    if (olderChats.length > 0) groups.push({ label: 'Older', chats: olderChats });

    return groups;
  }, [filteredChats, searchQuery]);

  // Safe admin check that handles enum types
  const checkAdminStatus = useCallback(async () => {
    if (!user?.email) {
      setIsAdmin(false);
      return;
    }

    // FIRST: Hardcoded admin emails (always works)
    const adminEmails = [
      'josh@careiq.app',
      'joshking@careiq.app', 
      'admin@careiq.app',
      'jking@pioneervalleyhealth.com',
      // Add your email here for immediate admin access
    ];
    
    const isHardcodedAdmin = adminEmails.includes(user.email);
    
    // SECOND: Try database check
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("user_id, role, is_admin, email, full_name")
        .eq("user_id", user.id)
        .single();

      if (!error && profile) {
        setUserProfile(profile);
        
        // Check CareIQ admin indicators (not facility administrator)
        const isDatabaseAdmin = 
          profile.role === 'careiq_admin' ||  // CareIQ admin role
          profile.email?.endsWith('@careiq.com');
        
        if (isDatabaseAdmin) {
          setIsAdmin(true);
          console.log('🛡️ Admin access granted (database):', profile.email || user.email);
          return;
        }
      }
    } catch (error) {
      console.log('Database admin check failed:', error);
    }

    // Use hardcoded result as fallback
    setIsAdmin(isHardcodedAdmin);
    if (isHardcodedAdmin) {
      console.log('🛡️ Admin access granted (hardcoded):', user.email);
    }
  }, [user, supabase]);

  // Load chats with fallbacks
  const loadChats = useCallback(async () => {
    if (!isAuthenticated) {
      setChats([]);
      setLoading(false);
      return;
    }

    try {
      // Try chats table first
      let { data: chatsData, error: chatsError } = await supabase
        .from("chats")
        .select("id, title, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (chatsError) {
        // Try conversations table as fallback
        const { data: conversationsData, error: conversationsError } = await supabase
          .from("conversations")
          .select("id, title, created_at, updated_at")
          .order("updated_at", { ascending: false })
          .limit(50);

        chatsData = conversationsData;
        
        if (conversationsError) {
          console.warn("Both chats and conversations failed:", { chatsError, conversationsError });
          chatsData = [];
        }
      }

      setChats(chatsData || []);
    } catch (error) {
      console.warn("Failed to load chats:", error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, supabase]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

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
          window.location.href = `/chat/${chat.id}`;
        }
      } else {
        // Generate a random chat ID for client-side navigation
        const chatId = crypto.randomUUID();
        window.location.href = `/chat/${chatId}`;
      }
    } catch (error) {
      console.warn("Failed to create new chat:", error);
      // Fallback to client-side chat ID
      const chatId = crypto.randomUUID();
      window.location.href = `/chat/${chatId}`;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <aside
      className={`
        relative h-screen shrink-0 transition-all duration-300 ease-in-out
        ${collapsed ? "w-16" : "w-80"}
        bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
      `}
    >
      <div className="sticky top-0 h-screen p-3 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 p-2">
          <button
            onClick={onToggle}
            className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelsTopLeft size={18} />
          </button>

          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {/* CareIQ Logo */}
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-sm">CIQ</span>
                </div>
                <h1 className="text-lg font-semibold">CareIQ</h1>
              </div>
            </div>
          )}
        </div>

        {/* New Chat Button */}
        <div className="mb-4">
          <button
            onClick={createNewChat}
            disabled={!isAuthenticated}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-lg
              bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300
              text-white disabled:text-gray-500 transition-colors
              ${collapsed ? "justify-center" : "justify-start"}
            `}
            title="New chat"
          >
            <Plus size={16} />
            {!collapsed && <span className="text-sm font-medium">New Chat</span>}
          </button>
        </div>

        {/* Search Bar */}
        {!collapsed && (
          <div className="mb-4">
            {showSearch ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <X size={14} className="text-gray-400" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Search size={16} />
                <span>Search chats...</span>
              </button>
            )}
          </div>
        )}

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {!collapsed && (
            <div className="mb-3 flex items-center justify-between px-2">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {searchQuery ? 'Search Results' : 'Recent Chats'}
              </h2>
              {chats.length > 0 && (
                <span className="text-xs text-gray-400">
                  {filteredChats.length} of {chats.length}
                </span>
              )}
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`
                    animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg
                    ${collapsed ? "h-10 w-10 mx-auto" : "h-10 w-full"}
                  `}
                />
              ))}
            </div>
          ) : filteredChats.length > 0 ? (
            <div className="space-y-1">
              {groupedChats.map((group) => (
                <div key={group.label}>
                  {!collapsed && group.label && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 px-3 py-2 flex items-center gap-2">
                      <Clock size={12} />
                      {group.label}
                    </div>
                  )}
                  {group.chats.map((chat) => (
                    <Link
                      key={chat.id}
                      href={`/chat/${chat.id}`}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                        hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                        ${pathname === `/chat/${chat.id}` 
                          ? "bg-gray-100 dark:bg-gray-700" 
                          : ""
                        }
                        ${collapsed ? "justify-center" : "justify-start"}
                      `}
                      title={collapsed ? chat.title : undefined}
                    >
                      <MessageCircle size={16} className="shrink-0" />
                      {!collapsed && (
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{chat.title || "Untitled"}</div>
                          {searchQuery && (
                            <div className="text-xs text-gray-400 truncate">
                              {new Date(chat.updated_at || chat.created_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            !collapsed && (
              <div className="px-3 py-8 text-center">
                <Search size={32} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No chats found for "{searchQuery}"
                </p>
              </div>
            )
          ) : (
            !collapsed && (
              <div className="px-3 py-8 text-center">
                <MessageCircle size={32} className="mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No chats yet
                </p>
                {isAuthenticated && (
                  <p className="text-xs text-gray-400 mt-1">
                    Create your first chat above
                  </p>
                )}
              </div>
            )
          )}
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
          {!collapsed ? (
            <div className="space-y-2">
              {/* Admin Access */}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-xs transition-colors text-blue-600 dark:text-blue-400 font-medium"
                  title="Admin Dashboard"
                >
                  <Shield size={14} />
                  <span>Admin Dashboard</span>
                </Link>
              )}
              
              {/* Tools Section */}
              <div>
                <button
                  onClick={() => setShowTools(!showTools)}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-xs transition-colors font-medium text-gray-700 dark:text-gray-300"
                >
                  <div className="flex items-center gap-2">
                    <Wrench size={14} />
                    <span>Tools</span>
                  </div>
                  {showTools ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                
                {showTools && (
                  <div className="ml-4 mt-1 space-y-1">
                    <Link
                      href="/cms-guidance"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-xs transition-colors ${
                        pathname === '/cms-guidance' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <BookOpen size={12} />
                      <span>CMS Guidance</span>
                    </Link>
                    <Link
                      href="/ppd-calculator"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-xs transition-colors ${
                        pathname === '/ppd-calculator' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <Calculator size={12} />
                      <span>PPD Calculator</span>
                    </Link>
                    <Link
                      href="/daily-rounds"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-xs transition-colors ${
                        pathname === '/daily-rounds' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <FileText size={12} />
                      <span>Daily Rounds</span>
                    </Link>
                    <Link
                      href="/schedule-import"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-xs transition-colors ${
                        pathname === '/schedule-import' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <Upload size={12} />
                      <span>Schedule Import</span>
                    </Link>
                    <Link
                      href="/survey-prep"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-xs transition-colors ${
                        pathname === '/survey-prep' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <BarChart3 size={12} />
                      <span>Survey Prep</span>
                    </Link>
                    <Link
                      href="/mock-survey-training"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-xs transition-colors ${
                        pathname === '/mock-survey-training' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <Users size={12} />
                      <span>Survey Training</span>
                    </Link>
                    <Link
                      href="/census-dashboard"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-xs transition-colors ${
                        pathname === '/census-dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <BarChart3 size={12} />
                      <span>Census Analytics</span>
                    </Link>
                    <Link
                      href="/incident-reports"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-xs transition-colors ${
                        pathname === '/incident-reports' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <AlertTriangle size={12} />
                      <span>Incident Reports</span>
                    </Link>
                  </div>
                )}
              </div>
              
              {/* Quick Links */}
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/calendar"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-xs transition-colors"
                >
                  <CalendarDays size={14} />
                  <span>Calendar</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-xs transition-colors"
                >
                  <Settings size={14} />
                  <span>Settings</span>
                </Link>
              </div>

              {/* User Info */}
              {isAuthenticated && (
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                      <User size={12} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-gray-600 dark:text-gray-300 truncate block">
                        {userProfile?.full_name || user?.email || 'User'}
                      </span>
                      {isAdmin && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Sign out"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {/* Admin button for collapsed sidebar */}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors text-blue-600 dark:text-blue-400"
                  title="Admin Dashboard"
                >
                  <Shield size={16} />
                </Link>
              )}
              
              {/* Tools for collapsed sidebar */}
              <Link
                href="/cms-guidance"
                className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                title="CMS Guidance"
              >
                <BookOpen size={16} />
              </Link>
              <Link
                href="/ppd-calculator"
                className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                title="PPD Calculator"
              >
                <Calculator size={16} />
              </Link>
              <Link
                href="/daily-rounds"
                className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                title="Daily Rounds"
              >
                <FileText size={16} />
              </Link>
              <Link
                href="/incident-reports"
                className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                title="Incident Reports"
              >
                <AlertTriangle size={16} />
              </Link>
              
              <Link
                href="/calendar"
                className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                title="Calendar"
              >
                <CalendarDays size={16} />
              </Link>
              <Link
                href="/settings"
                className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                title="Settings"
              >
                <Settings size={16} />
              </Link>
              {isAuthenticated && (
                <button
                  onClick={handleSignOut}
                  className="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}