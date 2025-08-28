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
}

const navigationItems = [
  { href: "/", label: "Chat", icon: MessageCircle },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/survey-prep", label: "Survey Prep", icon: Shield },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/ppd-calculator", label: "PPD Calculator", icon: Calculator },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AppleSidebar({ className = "" }: AppleSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user, signOut } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const supabase = getBrowserSupabase();

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
    <div className={`fixed left-0 top-0 h-full w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200/30 dark:border-gray-700/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-semibold text-sm">CIQ</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white text-lg">CareIQ</span>
          </div>
        </div>
        
        {/* New Chat Button */}
        <button
          onClick={createNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
        >
          <Plus size={18} />
          New Chat
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                }`}
              >
                <Icon size={18} className={isActive ? "text-blue-600 dark:text-blue-400" : ""} />
                {item.label}
              </Link>
            );
          })}
          
          {/* CareIQ Developer Admin Button */}
          {userProfile?.email?.endsWith('@careiq.com') && (
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 border-t border-gray-200/30 dark:border-gray-700/30 mt-2 pt-4 ${
                isCurrentPath('/admin')
                  ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
              }`}
            >
              <Wrench size={18} className={isCurrentPath('/admin') ? "text-purple-600 dark:text-purple-400" : ""} />
              CareIQ Admin
            </Link>
          )}
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-hidden flex flex-col">
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

        <div className="flex-1 overflow-y-auto px-3">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2">
            Recent Chats
          </div>
          
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
                
                return (
                  <div
                    key={chat.id}
                    className={`group flex items-center gap-3 p-2 rounded-lg transition-all duration-200 cursor-pointer ${
                      isActive 
                        ? "bg-blue-50 dark:bg-blue-900/20" 
                        : "hover:bg-gray-100 dark:hover:bg-gray-800/30"
                    }`}
                    onClick={() => router.push(`/chat/${chat.id}`)}
                  >
                    <MessageCircle 
                      size={16} 
                      className={isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400"} 
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${
                        isActive 
                          ? "text-blue-700 dark:text-blue-400" 
                          : "text-gray-900 dark:text-white"
                      }`}>
                        {chat.title || "Untitled chat"}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle edit
                        }}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle delete
                        }}
                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
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
      <div className="p-4 border-t border-gray-200/30 dark:border-gray-700/30">
        <div className="flex items-center justify-between">
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
          <div className="flex items-center gap-1">
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