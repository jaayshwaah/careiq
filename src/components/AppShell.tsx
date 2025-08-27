/* 
   FILE: src/components/Sidebar.tsx
   Safe implementation without complex dependencies
*/

"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Plus,
  MessageCircle,
  Settings,
  User,
  LogOut,
  PanelsTopLeft,
  CalendarDays,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeProvider";
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
  const { isAuthenticated, signOut } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getBrowserSupabase();

  // Load chats
  const loadChats = useCallback(async () => {
    if (!isAuthenticated) {
      setChats([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("chats")
        .select("id, title, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(20);

      if (error) {
        console.warn("Error loading chats:", error.message);
        setChats([]);
      } else {
        setChats(data || []);
      }
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

  // Create new chat
  const createNewChat = async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New chat" }),
      });

      if (response.ok) {
        const { chat } = await response.json();
        if (chat?.id) {
          window.location.href = `/chat/${chat.id}`;
        }
      }
    } catch (error) {
      console.warn("Failed to create new chat:", error);
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

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {!collapsed && (
            <div className="mb-3">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-2">
                Recent Chats
              </h2>
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
          ) : chats.length > 0 ? (
            <div className="space-y-1">
              {chats.map((chat) => (
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
                    <span className="truncate">{chat.title || "Untitled"}</span>
                  )}
                </Link>
              ))}
            </div>
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