// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Plus,
  PanelsTopLeft,
  Search as SearchIcon,
  MoreHorizontal,
  Pin,
  PinOff,
  Trash2,
  Settings,
  User,
  LogOut,
  PencilLine,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import AccountMenu from "./AccountMenu";

/* ---------------------------------- Types --------------------------------- */

type ChatRow = {
  id: string;
  title: string | null;
  created_at: string | null;
};

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

/* ----------------------------- Local constants ---------------------------- */

const PIN_STORAGE_KEY = "careiq.pinnedChatIds.v1";
const AUTOTITLE_MARK = "careiq.autotitle.done.v1";

/* ------------------------------- Utilities -------------------------------- */

function loadPinnedIds(): string[] {
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePinnedIds(ids: string[]) {
  try {
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

function isActiveChat(pathname: string | null, id: string) {
  if (!pathname) return false;
  return pathname === `/chat/${id}`;
}

function getAutotitleMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(AUTOTITLE_MARK);
    if (!raw) return {};
    const map = JSON.parse(raw);
    return map && typeof map === "object" ? map : {};
  } catch {
    return {};
  }
}

function setAutotitleDone(id: string) {
  try {
    const map = getAutotitleMap();
    map[id] = Date.now();
    localStorage.setItem(AUTOTITLE_MARK, JSON.stringify(map));
  } catch {}
}

function isLikelyUntitled(title: string | null | undefined) {
  if (!title) return true;
  const t = title.trim().toLowerCase();
  return !t || t === "new chat";
}

/* --------------------------- Tiny popover menu ---------------------------- */

function useOutsideClick<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onOutside]);
  return ref;
}

function TinyMenu({
  open,
  onClose,
  align = "start",
  children,
}: {
  open: boolean;
  onClose: () => void;
  align?: "start" | "end";
  children: React.ReactNode;
}) {
  const ref = useOutsideClick<HTMLDivElement>(() => onClose());
  if (!open) return null;
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-1 min-w-[200px] rounded-xl border border-black/10 bg-white p-1 text-sm shadow-lg dark:border-white/10 dark:bg-neutral-900",
        align === "end" ? "right-0" : "left-0"
      )}
      role="menu"
    >
      {children}
    </div>
  );
}

function TinyMenuItem({
  icon,
  children,
  danger,
  onClick,
  disabled,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  danger?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-800 dark:active:bg-neutral-700",
        danger && "text-red-600 dark:text-red-400"
      )}
      role="menuitem"
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}

/* -------------------------------- Chat row -------------------------------- */

function ChatItem({
  row,
  active,
  pinned,
  onPinToggle,
  onDelete,
  onRename,
}: {
  row: ChatRow;
  active: boolean;
  pinned: boolean;
  onPinToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [titleInput, setTitleInput] = useState(row.title || "New chat");
  const [savingRename, setSavingRename] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (renaming) setTimeout(() => inputRef.current?.focus(), 10);
  }, [renaming]);

  useEffect(() => {
    if (!renaming) setTitleInput(row.title || "New chat");
  }, [row.title, renaming]);

  const submitRename = async () => {
    const trimmed = titleInput.trim();
    if (!trimmed || trimmed === (row.title || "New chat")) {
      setRenaming(false);
      return;
    }
    try {
      setSavingRename(true);
      await onRename(row.id, trimmed);
      setRenaming(false);
    } finally {
      setSavingRename(false);
    }
  };

  return (
    <li
      className={cn(
        "group relative rounded-xl",
        active
          ? "bg-neutral-100 ring-1 ring-black/10 dark:bg-neutral-900 dark:ring-white/10"
          : "hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
      )}
    >
      {!renaming ? (
        <Link
          href={`/chat/${row.id}`}
          className={cn("block truncate px-3 py-2 pr-10 text-sm", active && "font-medium")}
          title={row.title || "New chat"}
        >
          {row.title || "New chat"}
          <span className="ml-2 text-xs text-neutral-500">
            {row.created_at ? timeAgo(row.created_at) : ""}
          </span>
        </Link>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 pr-10">
          <input
            ref={inputRef}
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
              if (e.key === "Escape") setRenaming(false);
            }}
            className="w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950"
          />
          <button
            className="rounded-md px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={() => setRenaming(false)}
            disabled={savingRename}
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-neutral-900 px-2 py-1 text-xs text-white hover:bg-neutral-800 dark:bg-white dark:text-black"
            onClick={submitRename}
            disabled={savingRename}
          >
            {savingRename ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {!renaming && (
        <div className="absolute inset-y-0 right-1 flex items-center gap-1">
          <button
            className={cn(
              "invisible rounded-md p-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 group-hover:visible dark:hover:bg-neutral-800",
              pinned && "visible"
            )}
            aria-label={pinned ? "Unpin chat" : "Pin chat"}
            onClick={(e) => {
              e.preventDefault();
              onPinToggle(row.id);
            }}
            title={pinned ? "Unpin" : "Pin"}
          >
            {pinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>

          <div className="relative">
            <button
              className="invisible rounded-md p-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 group-hover:visible dark:hover:bg-neutral-800"
              aria-label="More"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen((v) => !v);
                setConfirmDelete(false);
              }}
              title="More"
            >
              <MoreHorizontal size={16} />
            </button>

            <TinyMenu open={menuOpen} onClose={() => setMenuOpen(false)} align="end">
              {!confirmDelete ? (
                <>
                  <TinyMenuItem
                    icon={<PencilLine size={16} />}
                    onClick={() => {
                      setRenaming(true);
                      setMenuOpen(false);
                    }}
                  >
                    Rename
                  </TinyMenuItem>
                  <TinyMenuItem
                    icon={<Pin size={16} />}
                    onClick={() => {
                      onPinToggle(row.id);
                      setMenuOpen(false);
                    }}
                  >
                    {pinned ? "Unpin" : "Pin"}
                  </TinyMenuItem>
                  <div className="my-1 h-px w-full bg-neutral-100 dark:bg-neutral-800" />
                  <TinyMenuItem
                    icon={<Trash2 size={16} />}
                    danger
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete…
                  </TinyMenuItem>
                </>
              ) : (
                <>
                  <div className="px-2 py-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                    Delete this chat? This can’t be undone.
                  </div>
                  <div className="flex gap-2 p-1">
                    <button
                      className="flex-1 rounded-lg px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="flex-1 rounded-lg bg-red-600 px-2 py-1.5 text-sm text-white hover:bg-red-700"
                      onClick={() => {
                        onDelete(row.id);
                        setMenuOpen(false);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </TinyMenu>
          </div>
        </div>
      )}
    </li>
  );
}

/* -------------------------- Auto Title background ------------------------- */

function AutoTitleAgent() {
  const supabase = getBrowserSupabase();
  useEffect(() => {
    let cancelled = false;
    let ticking = false;
    async function attempt() {
      if (ticking) return;
      ticking = true;
      try {
        const { data: chats } = await supabase
          .from("chats")
          .select("id,title,created_at")
          .order("created_at", { ascending: false })
          .limit(25);
        const done = getAutotitleMap();
        for (const c of chats || []) {
          if (cancelled) break;
          const id = c.id as string;
          if (!isLikelyUntitled(c.title)) continue;
          if (done[id]) continue;
          try {
            await fetch(`/api/chats/${id}/title`, { method: "POST" });
            setAutotitleDone(id);
          } catch {
            setAutotitleDone(id);
          }
        }
      } finally {
        ticking = false;
      }
    }
    attempt();
    const t = setInterval(attempt, 20000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [supabase]);
  return null;
}

/* --------------------------------- Sidebar -------------------------------- */

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const supabase = getBrowserSupabase();

  const fetchChats = useCallback(async () => {
    const { data, error } = await supabase
      .from("chats")
      .select("id,title,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error) setChats((data || []) as ChatRow[]);
  }, [supabase]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => setPinnedIds(loadPinnedIds()), []);
  useEffect(() => savePinnedIds(pinnedIds), [pinnedIds]);

  const pinned = useMemo(() => chats.filter((c) => pinnedIds.includes(c.id)), [chats, pinnedIds]);
  const recent = useMemo(() => chats.filter((c) => !pinnedIds.includes(c.id)), [chats, pinnedIds]);

  async function handleDelete(id: string) {
    setChats((prev) => prev.filter((c) => c.id !== id));
    setPinnedIds((prev) => prev.filter((p) => p !== id));
    await fetch(`/api/chats/${id}`, { method: "DELETE" });
    if (isActiveChat(pathname, id)) router.push("/chat/new");
  }

  function togglePin(id: string) {
    setPinnedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  }

  async function handleNewChat() {
    const res = await fetch("/api/chats", { method: "POST" });
    const json = await res.json();
    const newId = json.id as string;
    setChats((prev) => [{ id: newId, title: "New chat", created_at: new Date().toISOString() }, ...prev]);
    router.push(`/chat/${newId}`);
  }

  const handleRename = useCallback(
    async (id: string, newTitle: string) => {
      setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)));
      await fetch(`/api/chats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
    },
    []
  );

  return (
    <aside
      className={cn(
        "relative h-svh shrink-0 transition-[width] duration-300 ease-ios",
        collapsed ? "w-[76px]" : "w-[300px]"
      )}
    >
      <AutoTitleAgent />
      <div className="sticky top-0 h-svh p-2 sm:p-3">
        <div className="glass relative flex h-full flex-col overflow-hidden rounded-2xl ring-1 ring-black/10 dark:ring-white/10">
          {/* Top bar */}
          <div className="flex items-center justify-between px-2 py-2">
            <button
              className="rounded-xl p-2 hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-800"
              onClick={onToggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand" : "Collapse"}
            >
              <PanelsTopLeft size={18} />
            </button>
            {!collapsed && (
              <Link href="/" className="flex items-center gap-2 px-2 py-1">
                <Image alt="CareIQ" src="/logo.svg" width={24} height={24} priority />
                <span className="text-sm font-semibold tracking-tight">CareIQ</span>
              </Link>
            )}
            <div className="ml-auto">
              <AccountMenu />
            </div>
          </div>

          {/* Search + New Chat */}
          <div className={cn("px-2 pb-2", collapsed && "px-1")}>
            {!collapsed ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="relative">
                    <SearchIcon className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-neutral-500" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search chats…"
                      className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-8 pr-3 text-sm outline-none dark:border-neutral-800 dark:bg-neutral-950"
                    />
                  </div>
                </div>
                <button
                  onClick={handleNewChat}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <div className="flex items-center gap-1">
                    <Plus size={16} />
                    New chat
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <button
                  onClick={handleNewChat}
                  className="rounded-xl border border-neutral-200 bg-white p-2 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950"
                  aria-label="New chat"
                  title="New chat"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Lists */}
          <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
            {!collapsed && pinned.length > 0 && (
              <div className="mb-2">
                <div className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Pinned
                </div>
                <ul className="space-y-1">
                  {pinned.map((row) => (
                    <ChatItem
                      key={row.id}
                      row={row}
                      active={isActiveChat(pathname, row.id)}
                      pinned
                      onPinToggle={togglePin}
                      onDelete={handleDelete}
                      onRename={handleRename}
                    />
                  ))}
                </ul>
              </div>
            )}
            <div className={!collapsed ? "mt-1" : ""}>
              {!collapsed && (
                <div className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Recent
                </div>
              )}
              <ul className={cn("space-y-1", collapsed && "px-1")}>
                {recent.length === 0 && !collapsed ? (
                  <li className="px-3 py-2 text-sm text-neutral-500">No chats yet.</li>
                ) : (
                  recent.map((row) => (
                    <ChatItem
                      key={row.id}
                      row={row}
                      active={isActiveChat(pathname, row.id)}
                      pinned={false}
                      onPinToggle={togglePin}
                      onDelete={handleDelete}
                      onRename={handleRename}
                    />
                  ))
                )}
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto border-t border-black/5 px-2 py-2 text-xs text-neutral-500 dark:border-white/5">
            {!collapsed ? (
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <User size={14} />
                  Signed in
                </div>
                <div className="flex items-center gap-4">
                  <Link href="/settings" className="flex items-center gap-1 hover:underline">
                    <Settings size={14} />
                    Settings
                  </Link>
                  <button className="flex items-center gap-1 hover:underline" title="Log out">
                    <LogOut size={14} />
                    Log out
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/settings"
                  title="Settings"
                  className="rounded-md p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <Settings size={16} />
                </Link>
                <button title="Log out" className="rounded-md p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
