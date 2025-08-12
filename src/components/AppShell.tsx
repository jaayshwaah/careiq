"use client";

import { useCallback, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import type { Chat } from "@/types";

/**
 * AppShell is a small client wrapper that holds Sidebar state
 * and passes the correct props to your Sidebar.
 */
export default function AppShell({
  initialChats = [],
  children,
}: {
  initialChats?: Chat[];
  children: React.ReactNode;
}) {
  // Sidebar collapsed: false = expanded (default), true = rail
  const [collapsed, setCollapsed] = useState(false);

  // Basic in-memory chat state; replace with your data layer
  const [chats, setChats] = useState<Chat[]>(() => initialChats);
  const [activeId, setActiveId] = useState<string | null>(
    initialChats[0]?.id ?? null
  );

  const onToggleSidebar = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  const onNewChat = useCallback(() => {
    const id = crypto.randomUUID();
    const newChat: Chat = {
      id,
      title: "New chat",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // include any fields your Chat type expects
    } as Chat;

    setChats((prev) => [newChat, ...prev]);
    setActiveId(id);
  }, []);

  const onSelectChat = useCallback((id: string) => {
    setActiveId(id);
    setCollapsed(false);
  }, []);

  const onRenameChat = useCallback((id: string, title: string) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, title, updated_at: new Date().toISOString() } : c
      )
    );
  }, []);

  const onDeleteChat = useCallback((id: string) => {
    setChats((prev) => prev.filter((c) => c.id !== id));
    setActiveId((current) => {
      if (current !== id) return current;
      // choose next most recent
      const remaining = chats.filter((c) => c.id !== id);
      return remaining[0]?.id ?? null;
    });
  }, [chats]);

  // Layout
  return (
    <div className="min-h-screen grid" style={{ gridTemplateColumns: "auto 1fr" }}>
      <Sidebar
        chats={chats}
        activeId={activeId}
        collapsed={collapsed}
        onToggleSidebar={onToggleSidebar}
        onNewChat={onNewChat}
        onSelectChat={onSelectChat}
        onRenameChat={onRenameChat}
        onDeleteChat={onDeleteChat}
      />
      <main className="min-h-screen">
        {children}
      </main>
    </div>
  );
}
