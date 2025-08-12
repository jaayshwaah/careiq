"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import type { Chat } from "@/types";

type ConversationRow = {
  id: string;
  title: string | null;
  created_at?: string | null;
  user_id?: string | null;
};

function rowToChat(row: ConversationRow): Chat {
  return {
    id: row.id,
    title: row.title ?? "New chat",
    createdAt: row.created_at ? Date.parse(row.created_at) : Date.now(),
    messages: [], // Sidebar doesn’t need messages; keep empty to satisfy your type
  };
}

export default function SidebarContainer({
  activeId,
  defaultCollapsed = false,
  limit = 100,
}: {
  activeId: string | null;
  defaultCollapsed?: boolean;
  limit?: number;
}) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const router = useRouter();

  // Load conversations from API and map to Chat shape
  useEffect(() => {
    let mounted = true;

    fetch(`/api/conversations?limit=${encodeURIComponent(String(limit))}`)
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        if (d?.ok && Array.isArray(d.conversations)) {
          const mapped: Chat[] = d.conversations.map((row: ConversationRow) =>
            rowToChat(row)
          );
          // ensure newest first by createdAt desc
          mapped.sort((a, b) => b.createdAt - a.createdAt);
          setChats(mapped);
        } else {
          console.error(d?.error || "Failed to load conversations");
        }
      })
      .catch((e) => console.error(e));

    return () => {
      mounted = false;
    };
  }, [limit]);

  const onToggleSidebar = () => setCollapsed((c) => !c);

  const onNewChat = async () => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "New chat" }),
      });
      const data = await res.json();
      if (!res.ok || !data?.conversation?.id) {
        throw new Error(data?.error || "Failed to create chat");
      }
      const convo = rowToChat(data.conversation as ConversationRow);
      setChats((prev) => [convo, ...prev]);
      router.push(`/chat/${convo.id}`);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not create conversation");
    }
  };

  const onSelectChat = (id: string) => {
    router.push(`/chat/${id}`);
  };

  const onRenameChat = async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to rename");

      setChats((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, title: data.conversation?.title ?? title } : c
        )
      );
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not rename conversation");
    }
  };

  const onDeleteChat = async (id: string) => {
    if (!confirm("Delete this conversation?")) return;
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete");

      setChats((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) router.push("/");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not delete conversation");
    }
  };

  return (
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
  );
}
