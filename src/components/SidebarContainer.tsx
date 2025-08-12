"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import type { Chat } from "@/types";

type ConversationRow = {
  id: string;
  title: string | null;
  created_at?: string | null;
};

function rowToChat(row: ConversationRow): Chat {
  return {
    id: row.id,
    title: row.title ?? "New chat",
    createdAt: row.created_at ? Date.parse(row.created_at) : Date.now(),
    messages: [],
  };
}

const LS_COLLAPSED = "sidebar:collapsed";
const LS_WIDTH = "sidebar:width";
const EXPANDED_MIN = 240;
const EXPANDED_MAX = 420;
const COLLAPSED_WIDTH = 64;

export default function SidebarContainer({
  activeId,
  defaultCollapsed = false,
  limit = 100,
}: {
  activeId: string | null;
  defaultCollapsed?: boolean;
  limit?: number;
}) {
  const router = useRouter();

  // Data
  const [chats, setChats] = useState<Chat[]>([]);

  // UI state
  const [collapsed, setCollapsed] = useState<boolean>(defaultCollapsed);
  const [width, setWidth] = useState<number>(280);
  const [dragging, setDragging] = useState(false);

  // For drag calculations
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  // Load persisted UI state
  useEffect(() => {
    try {
      const persistedCollapsed = localStorage.getItem(LS_COLLAPSED);
      if (persistedCollapsed !== null) {
        setCollapsed(persistedCollapsed === "1");
      } else {
        setCollapsed(defaultCollapsed);
      }
      const persistedWidth = localStorage.getItem(LS_WIDTH);
      if (persistedWidth) {
        const w = clamp(parseInt(persistedWidth, 10), EXPANDED_MIN, EXPANDED_MAX);
        setWidth(Number.isFinite(w) ? w : 280);
      }
    } catch {
      /* ignore */
    }
  }, [defaultCollapsed]);

  // Persist state
  useEffect(() => {
    try {
      localStorage.setItem(LS_COLLAPSED, collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_WIDTH, String(width));
    } catch {}
  }, [width]);

  // Keyboard shortcut: ⌘B / Ctrl+B to toggle
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Load conversations
  useEffect(() => {
    let mounted = true;
    fetch(`/api/conversations?limit=${encodeURIComponent(String(limit))}`)
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        if (d?.ok && Array.isArray(d.conversations)) {
          const mapped: Chat[] = d.conversations.map((row: ConversationRow) => rowToChat(row));
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

  // CRUD handlers
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
      setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title: data.conversation?.title ?? title } : c)));
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

  // Drag-to-resize: only when expanded
  function onDragStart(e: React.MouseEvent) {
    if (collapsed) return;
    setDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = width;
    document.body.style.userSelect = "none";
  }

  function onDragMove(e: MouseEvent) {
    if (!dragging) return;
    const delta = e.clientX - dragStartX.current;
    const next = clamp(dragStartWidth.current + delta, EXPANDED_MIN, EXPANDED_MAX);
    setWidth(next);
  }

  function onDragEnd() {
    if (!dragging) return;
    setDragging(false);
    document.body.style.userSelect = "";
  }

  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => onDragMove(e);
    const up = () => onDragEnd();
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  // Calculated width applied to the aside
  const asideStyle: React.CSSProperties = collapsed
    ? { width: COLLAPSED_WIDTH }
    : { width: width };

  return (
    <div className="relative h-full">
      <aside
        className="h-full bg-[rgb(17,17,17)] text-neutral-200 border-r border-neutral-800 transition-[width] duration-200 ease-in-out"
        style={asideStyle}
        aria-expanded={!collapsed}
      >
        <Sidebar
          chats={chats}
          activeId={activeId}
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((c) => !c)}
          onNewChat={onNewChat}
          onSelectChat={onSelectChat}
          onRenameChat={onRenameChat}
          onDeleteChat={onDeleteChat}
        />
      </aside>

      {/* Drag handle (only visible when expanded) */}
      {!collapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={onDragStart}
          className={`absolute inset-y-0 -right-[3px] w-[6px] cursor-col-resize ${dragging ? "bg-neutral-700/40" : "bg-transparent"}`}
          title="Drag to resize"
        />
      )}
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
