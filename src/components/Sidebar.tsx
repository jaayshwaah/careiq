/* 
   FILE: src/components/Sidebar.tsx
   Enhanced version with pin/unpin, search, auto-title, and real-time updates
*/

"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Plus,
  MessageCircle,
  Settings,
  User,
  LogOut,
  PanelsTopLeft,
  CalendarDays,
  Search,
  Pin,
  PinOff,
  MoreHorizontal,
  Trash2,
  PencilLine,
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserSupabase } from "@/lib/supabaseClient";

interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  last_message_at?: string;
  has_attachments?: boolean;
}

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

// Rate limiting for actions
const RATE_LIMITS = {
  pin: { max: 10, window: 60000 }, // 10 pins per minute
  delete: { max: 5, window: 60000 }, // 5 deletes per minute
  newChat: { max: 20, window: 60000 }, // 20 new chats per minute
};

function useRateLimit() {
  const actionsRef = useRef<Map<string, number[]>>(new Map());

  const canPerformAction = useCallback((action: keyof typeof RATE_LIMITS) => {
    const now = Date.now();
    const limit = RATE_LIMITS[action];
    const actions = actionsRef.current.get(action) || [];
    
    // Remove old actions outside the window
    const recentActions = actions.filter(time => now - time < limit.window);
    
    if (recentActions.length >= limit.max) {
      return false;
    }

    // Record this action
    recentActions.push(now);
    actionsRef.current.set(action, recentActions);
    return true;
  }, []);

  return { canPerformAction };
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, signOut } = useAuth();
  const { canPerformAction } = useRateLimit();
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
  const supabase = getBrowserSupabase();
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter chats based on search
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const query = searchQuery.toLowerCase();
    return chats.filter(chat => 
      chat.title.toLowerCase().includes(query)
    );
  }, [chats, searchQuery]);

  // Separate pinned and recent chats
  const { pinnedChats, recentChats } = useMemo(() => {
    const pinned = filteredChats.filter(chat => pinnedIds.includes(chat.id));
    const recent = filteredChats.filter(chat => !pinnedIds.includes(chat.id));
    return { pinnedChats: pinned, recentChats: recent };
  }, [filteredChats, pinnedIds]);

  // Load chats and pins
  const loadChats = useCallback(async () => {
    if (!isAuthenticated) {
      setChats([]);
      setPinnedIds([]);
      setLoading(false);
      return;
    }

    try {
      // Load chats
      const { data: chatData, error: chatError } = await supabase
        .from("chats")
        .select("id, title, created_at, updated_at, last_message_at, has_attachments")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (chatError) {
        console.warn("Error loading chats:", chatError.message);
        setChats([]);
      } else {
        setChats(chatData || []);
      }

      // Load pins
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: pinData, error: pinError } = await supabase
          .from("pins")
          .select("chat_id")
          .eq("user_id", user.id);

        if (!pinError && pinData) {
          setPinnedIds(pinData.map(p => p.chat_id));
        }
      }
    } catch (error) {
      console.warn("Failed to load data:", error);
      setChats([]);
      setPinnedIds([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, supabase]);

  // Load data on mount and auth changes
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Real-time subscriptions
  useEffect(() => {
    if (!isAuthenticated) return;

    const chatChannel = supabase
      .channel("sidebar-chats")
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "chats" 
      }, () => {
        loadChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [isAuthenticated, supabase, loadChats]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Create new chat with auto-title
  const createNewChat = async () => {
    if (!isAuthenticated || !canPerformAction("newChat")) {
      console.warn("Rate limited or not authenticated");
      return;
    }

    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    }
  };

  // Toggle pin status
  const togglePin = async (chatId: string) => {
    if (!canPerformAction("pin")) {
      console.warn("Pin action rate limited");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isPinned = pinnedIds.includes(chatId);
    
    try {
      if (isPinned) {
        // Unpin
        await supabase
          .from("pins")
          .delete()
          .eq("user_id", user.id)
          .eq("chat_id", chatId);
        
        setPinnedIds(prev => prev.filter(id => id !== chatId));
      } else {
        // Pin
        await supabase
          .from("pins")
          .insert({ user_id: user.id, chat_id: chatId });
        
        setPinnedIds(prev => [...prev, chatId]);
      }
    } catch (error) {
      console.warn("Failed to toggle pin:", error);
    }
  };

  // Delete chat
  const deleteChat = async (chatId: string) => {
    if (!canPerformAction("delete")) {
      console.warn("Delete action rate limited");
      return;
    }

    if (!confirm("Are you sure you want to delete this chat?")) {
      return;
    }

    try {
      // Remove from UI immediately for better UX
      setChats(prev => prev.filter(c => c.id !== chatId));
      setPinnedIds(prev => prev.filter(id => id !== chatId));

      // Delete from database
      await fetch(`/api/chats/${chatId}`, { method: "DELETE" });

      // Navigate away if we're currently viewing this chat
      if (pathname === `/chat/${chatId}`) {
        router.push("/");
      }
    } catch (error) {
      console.warn("Failed to delete chat:", error);
      // Reload data to restore consistency
      loadChats();
    }
  };

  // Auto-generate title for untitled chats
  const generateTitle = async (chatId: string) => {
    try {
      await fetch(`/api/chats/${chatId}/title`, { method: "POST" });
      // Reload chats to get the new title
      loadChats();
    } catch (error) {
      console.warn("Failed to generate title:", error);
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

  // Time ago helper
  const timeAgo = (date: string) => {
    const now = Date.now();
    const time = new Date(date).getTime();
    const diff = now - time;
    
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return "now";
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    
    return new Date(date).toLocaleDateString();
  };

  // Chat item component
  const ChatItem = ({ chat, isPinned }: { chat: Chat; isPinned: boolean }) => {
    const isActive = pathname === `/chat/${chat.id}`;
    const isUntitled = !chat.title || chat.title === "New chat";

    return (
      <div className="group relative">
        <Link
          href={`/chat/${chat.id}`}
          className={`
            flex items-center gap-3 px-3 py-2 rounded-xl mx-2 mb-1 
            transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700
            ${isActive 
              ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800" 
              : ""
            }
            ${collapsed ? "justify-center" : "justify-start"}
          `}
          title={collapsed ? chat.title : undefined}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`
              w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
              ${chat.has_attachments 
                ? "bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50"
                : "bg-gray-100 dark:bg-gray-700"
              }
            `}>
              <MessageCircle size={14} className={
                chat.has_attachments 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-gray-500 dark:text-gray-400"
              } />
            </div>
            
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${
                  isUntitled ? "text-gray-500 dark:text-gray-400 italic" : ""
                }`}>
                  {chat.title || "Untitled chat"}
                  {isUntitled && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        generateTitle(chat.id);
                      }}
                      className="ml-1 text-xs underline hover:no-underline"
                      title="Generate title"
                    >
                      generate
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span>{timeAgo(chat.last_message_at || chat.created_at)}</span>
                  {isPinned && <Pin size={10} className="text-blue-500" />}
                </div>
              </div>
            )}
          </div>
        </Link>

        {/* Menu button */}
        {!collapsed && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setActiveMenu(activeMenu === chat.id ? null : chat.id)}
              className="w-6 h-6 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center"
            >
              <MoreHorizontal size={12} />
            </button>

            {/* Dropdown menu */}
            {activeMenu === chat.id && (
              <div 
                ref={menuRef}
                className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
              >
                <button
                  onClick={() => {
                    togglePin(chat.id);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                  {isPinned ? "Unpin" : "Pin"}
                </button>
                
                {isUntitled && (
                  <button
                    onClick={() => {
                      generateTitle(chat.id);
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <PencilLine size={12} />
                    Generate title
                  </button>
                )}
                
                <hr className="my-1 border-gray-200 dark:border-gray-600" />
                
                <button
                  onClick={() => {
                    deleteChat(chat.id);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
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
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">CareIQ</h1>
              <ThemeToggle />
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

        {/* Search */}
        {!collapsed && (
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm border-0 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Chat Lists */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`
                    animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg mx-2
                    ${collapsed ? "h-10 w-10" : "h-12 w-full"}
                  `}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pinned Chats */}
              {pinnedChats.length > 0 && (
                <div>
                  {!collapsed && (
                    <div className="px-4 pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      <Pin size={12} />
                      Pinned
                    </div>
                  )}
                  <div className="space-y-1">
                    {pinnedChats.map((chat) => (
                      <ChatItem key={chat.id} chat={chat} isPinned={true} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Chats */}
              <div>
                {!collapsed && (
                  <div className="px-4 pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                    <MessageCircle size={12} />
                    Recent
                  </div>
                )}
                
                {recentChats.length > 0 ? (
                  <div className="space-y-1">
                    {recentChats.map((chat) => (
                      <ChatItem key={chat.id} chat={chat} isPinned={false} />
                    ))}
                  </div>
                ) : !loading && recentChats.length === 0 && (
                  !collapsed && (
                    <div className="px-4 py-8 text-center">
                      <MessageCircle size={32} className="mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {searchQuery ? "No chats match your search" : "No chats yet"}
                      </p>
                      {isAuthenticated && !searchQuery && (
                        <p className="text-xs text-gray-400 mt-1">
                          Create your first chat above
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
          {!collapsed ? (
            <div className="space-y-2">
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

              {isAuthenticated && (
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                      <User size={12} />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
                      Signed in
                    </span>
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